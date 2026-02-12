import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
}

export interface MessageWithProfile extends Message {
  sender?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  recipient?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  isBlocked?: boolean;
  isBlockedByPartner?: boolean;
}

export type BlockStatus = 'none' | 'blocked_by_me' | 'blocked_by_partner' | 'mutual';

interface UseChatReturn {
  // Messages for current conversation
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadMessages: (partnerId: string) => Promise<void>;
  sendMessage: (partnerId: string, content: string) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<void>;
  markConversationAsRead: (partnerId: string) => Promise<void>;
  
  // Conversations
  conversations: Conversation[];
  loadConversations: () => Promise<void>;
  totalUnreadCount: number;
  
  // Realtime
  subscribeToMessages: (partnerId: string) => void;
  unsubscribe: () => void;
  
  // Current partner
  currentPartnerId: string | null;
  setCurrentPartner: (partnerId: string | null) => void;
  
  // Blocking
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  checkBlockStatus: (partnerId: string) => Promise<BlockStatus>;
  currentBlockStatus: BlockStatus;
}

export function useChat(): UseChatReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(null);
  const [currentBlockStatus, setCurrentBlockStatus] = useState<BlockStatus>('none');
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Calculate total unread count
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  // Check block status between current user and partner (bidirectional)
  const checkBlockStatus = useCallback(async (partnerId: string): Promise<BlockStatus> => {
    if (!user) return 'none';

    try {
      // Check if I blocked the partner
      const { data: blockedByMe } = await supabase
        .from('blocked_partners')
        .select('id')
        .eq('user_id', user.id)
        .eq('blocked_user_id', partnerId)
        .single();

      // Check if partner blocked me
      const { data: blockedByPartner } = await supabase
        .from('blocked_partners')
        .select('id')
        .eq('user_id', partnerId)
        .eq('blocked_user_id', user.id)
        .single();

      if (blockedByMe && blockedByPartner) return 'mutual';
      if (blockedByMe) return 'blocked_by_me';
      if (blockedByPartner) return 'blocked_by_partner';
      return 'none';
    } catch {
      return 'none';
    }
  }, [user]);

  // Block a user
  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('blocked_partners')
        .insert({
          user_id: user.id,
          blocked_user_id: userId,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Already blocked
          setCurrentBlockStatus('blocked_by_me');
          return true;
        }
        throw new Error(insertError.message);
      }

      setCurrentBlockStatus('blocked_by_me');
      // Update conversations list
      setConversations(prev => prev.map(conv => 
        conv.partnerId === userId ? { ...conv, isBlocked: true } : conv
      ));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Blockieren fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user]);

  // Unblock a user
  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('blocked_partners')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', userId);

      if (deleteError) throw new Error(deleteError.message);

      // Re-check status (partner might still block us)
      const newStatus = await checkBlockStatus(userId);
      setCurrentBlockStatus(newStatus);
      // Update conversations list
      setConversations(prev => prev.map(conv => 
        conv.partnerId === userId ? { ...conv, isBlocked: false } : conv
      ));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Entblocken fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user, checkBlockStatus]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (partnerId: string) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      setMessages(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nachrichten laden fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (partnerId: string, content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;
    setError(null);

    // Check block status before sending
    const blockStatus = await checkBlockStatus(partnerId);
    if (blockStatus !== 'none') {
      if (blockStatus === 'blocked_by_me') {
        setError('Du hast diesen Benutzer blockiert. Entblocke ihn um Nachrichten zu senden.');
      } else {
        setError('Du kannst diesem Benutzer keine Nachrichten senden.');
      }
      return false;
    }

    try {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: partnerId,
          content: content.trim(),
        });

      if (insertError) throw new Error(insertError.message);
      
      // Message will be added via realtime subscription
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nachricht senden fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user, checkBlockStatus]);

  // Mark a single message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', user.id)
        .is('read_at', null);
    } catch {
      // Silently fail - not critical
    }
  }, [user]);

  // Mark all messages in a conversation as read
  const markConversationAsRead = useCallback(async (partnerId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', partnerId)
        .eq('recipient_id', user.id)
        .is('read_at', null);
      
      // Update local conversations state
      setConversations(prev => prev.map(conv => 
        conv.partnerId === partnerId ? { ...conv, unreadCount: 0 } : conv
      ));
    } catch {
      // Silently fail - not critical
    }
  }, [user]);

  // Load all conversations with last message and unread count
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch blocked users (bidirectional)
      const { data: blockedByMe } = await supabase
        .from('blocked_partners')
        .select('blocked_user_id')
        .eq('user_id', user.id);

      const { data: blockedMe } = await supabase
        .from('blocked_partners')
        .select('user_id')
        .eq('blocked_user_id', user.id);

      const blockedByMeIds = new Set((blockedByMe || []).map(b => b.blocked_user_id));
      const blockedMeIds = new Set((blockedMe || []).map(b => b.user_id));

      // Fetch all messages involving the user with profile data
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, name, avatar_url),
          recipient:profiles!recipient_id(id, name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);

      // Group by conversation partner
      const conversationMap = new Map<string, Conversation>();
      
      for (const msg of data || []) {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        const partner = msg.sender_id === user.id ? msg.recipient : msg.sender;
        
        // Skip conversations with users who blocked us (bidirectional hiding)
        if (blockedMeIds.has(partnerId)) continue;
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            partnerName: partner?.name || 'Unbekannt',
            partnerAvatar: partner?.avatar_url || null,
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: 0,
            isBlocked: blockedByMeIds.has(partnerId),
            isBlockedByPartner: blockedMeIds.has(partnerId),
          });
        }
        
        // Count unread messages (where we are recipient and not read)
        if (msg.recipient_id === user.id && !msg.read_at) {
          const conv = conversationMap.get(partnerId)!;
          conv.unreadCount++;
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Konversationen laden fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to realtime messages
  const subscribeToMessages = useCallback((partnerId: string) => {
    if (!user) return;
    
    // Unsubscribe from previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${user.id}:${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Only add if it's part of this conversation
          const isRelevant = 
            (newMessage.sender_id === user.id && newMessage.recipient_id === partnerId) ||
            (newMessage.sender_id === partnerId && newMessage.recipient_id === user.id);
          
          if (isRelevant) {
            setMessages(prev => [...prev, newMessage]);
            
            // Auto-mark as read if we're the recipient and chat is open
            if (newMessage.recipient_id === user.id && currentPartnerId === partnerId) {
              markAsRead(newMessage.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          ));
        }
      )
      .subscribe();

    channelRef.current = channel;
    setCurrentPartnerId(partnerId);
  }, [user, currentPartnerId, markAsRead]);

  // Unsubscribe from realtime
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setCurrentPartnerId(null);
    setCurrentBlockStatus('none');
  }, []);

  // Set current partner (for tracking which chat is open)
  const setCurrentPartner = useCallback(async (partnerId: string | null) => {
    setCurrentPartnerId(partnerId);
    if (partnerId) {
      // Check block status
      const status = await checkBlockStatus(partnerId);
      setCurrentBlockStatus(status);
      loadMessages(partnerId);
      subscribeToMessages(partnerId);
    } else {
      unsubscribe();
      setMessages([]);
      setCurrentBlockStatus('none');
    }
  }, [loadMessages, subscribeToMessages, unsubscribe, checkBlockStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    error,
    loadMessages,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    conversations,
    loadConversations,
    totalUnreadCount,
    subscribeToMessages,
    unsubscribe,
    currentPartnerId,
    setCurrentPartner,
    // Blocking
    blockUser,
    unblockUser,
    checkBlockStatus,
    currentBlockStatus,
  };
}
