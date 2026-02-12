import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, ArrowLeft, Loader2, Ban, ShieldOff, MoreVertical, AlertCircle } from 'lucide-react';
import { useChat, type Conversation, type Message } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';
import ChatMessage, { DateSeparator } from './ChatMessage';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartnerId?: string | null;
  initialPartnerName?: string | null;
}

export default function ChatWindow({ 
  isOpen, 
  onClose, 
  initialPartnerId = null,
  initialPartnerName = null 
}: ChatWindowProps) {
  const { user } = useAuth();
  const { language } = useSettings();
  const t = translations[language];
  
  const {
    messages,
    conversations,
    isLoading,
    error,
    loadConversations,
    sendMessage,
    markConversationAsRead,
    setCurrentPartner,
    currentPartnerId,
    blockUser,
    unblockUser,
    currentBlockStatus,
  } = useChat();

  const [view, setView] = useState<'list' | 'chat'>('list');
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversations when opened
  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
      
      // If initial partner provided, open that chat
      if (initialPartnerId && initialPartnerName) {
        setSelectedPartner({ id: initialPartnerId, name: initialPartnerName });
        setCurrentPartner(initialPartnerId);
        setView('chat');
      }
    }
  }, [isOpen, user, loadConversations, initialPartnerId, initialPartnerName, setCurrentPartner]);

  // Mark as read when opening a conversation
  useEffect(() => {
    if (view === 'chat' && selectedPartner) {
      markConversationAsRead(selectedPartner.id);
    }
  }, [view, selectedPartner, markConversationAsRead]);

  // Focus input when entering chat view
  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [view]);

  // Open a conversation
  const openConversation = (conv: Conversation) => {
    setSelectedPartner({ id: conv.partnerId, name: conv.partnerName });
    setCurrentPartner(conv.partnerId);
    setView('chat');
  };

  // Go back to conversation list
  const goBack = () => {
    setView('list');
    setSelectedPartner(null);
    setCurrentPartner(null);
    setInputValue('');
  };

  // Handle close
  const handleClose = () => {
    setView('list');
    setSelectedPartner(null);
    setCurrentPartner(null);
    setInputValue('');
    onClose();
  };

  // Send message
  const handleSend = async () => {
    if (!selectedPartner || !inputValue.trim() || isSending) return;
    
    setIsSending(true);
    const success = await sendMessage(selectedPartner.id, inputValue);
    if (success) {
      setInputValue('');
    }
    setIsSending(false);
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle block/unblock
  const handleBlock = async () => {
    if (!selectedPartner || isBlocking) return;
    setIsBlocking(true);
    await blockUser(selectedPartner.id);
    setIsBlocking(false);
    setShowMenu(false);
  };

  const handleUnblock = async () => {
    if (!selectedPartner || isBlocking) return;
    setIsBlocking(true);
    await unblockUser(selectedPartner.id);
    setIsBlocking(false);
    setShowMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    
    for (const msg of msgs) {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    
    return groups;
  };

  // Format time for conversation list
  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
          {view === 'chat' && selectedPartner ? (
            <>
              <button
                onClick={goBack}
                className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-stone-900 dark:text-stone-100">
                  {selectedPartner.name}
                </h2>
                {currentBlockStatus === 'blocked_by_me' && (
                  <Ban className="w-4 h-4 text-red-500" />
                )}
              </div>
              {/* Menu Button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 py-1 z-10">
                    {currentBlockStatus === 'blocked_by_me' ? (
                      <button
                        onClick={handleUnblock}
                        disabled={isBlocking}
                        className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isBlocking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldOff className="w-4 h-4" />
                        )}
                        {t.chat?.unblock || 'Entblocken'}
                      </button>
                    ) : (
                      <button
                        onClick={handleBlock}
                        disabled={isBlocking}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isBlocking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                        {t.chat?.block || 'Blockieren'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-medium text-stone-900 dark:text-stone-100">
                {t.chat?.title || 'Nachrichten'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === 'list' ? (
            // Conversation List
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-600">
                  {error}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 bg-stone-100 dark:bg-stone-700 rounded-full flex items-center justify-center mb-4">
                    <Send className="w-8 h-8 text-stone-400" />
                  </div>
                  <p className="text-stone-600 dark:text-stone-400">
                    {t.chat?.noConversations || 'Noch keine Nachrichten'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-200 dark:divide-stone-700">
                  {conversations.map((conv) => (
                    <button
                      key={conv.partnerId}
                      onClick={() => openConversation(conv)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className="relative">
                        {conv.partnerAvatar ? (
                          <img
                            src={conv.partnerAvatar}
                            alt={conv.partnerName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <span className="text-lg font-medium text-amber-700 dark:text-amber-300">
                              {conv.partnerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {conv.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-stone-800" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-stone-900 dark:text-stone-100">
                              {conv.partnerName}
                            </span>
                            {conv.isBlocked && (
                              <Ban className="w-3.5 h-3.5 text-red-500" />
                            )}
                          </div>
                          <span className="text-xs text-stone-500">
                            {formatLastMessageTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${conv.isBlocked ? 'text-stone-400 dark:text-stone-500' : 'text-stone-600 dark:text-stone-400'}`}>
                          {conv.isBlocked ? (t.chat?.blocked || 'Blockiert') : conv.lastMessage}
                        </p>
                      </div>
                      
                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <div className="w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-medium">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Chat View
            <div className="h-full flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-stone-500 dark:text-stone-400">
                      {t.chat?.startConversation || 'Starte die Konversation...'}
                    </p>
                  </div>
                ) : (
                  <>
                    {groupMessagesByDate(messages).map((group, groupIdx) => (
                      <div key={groupIdx}>
                        <DateSeparator date={group.date} />
                        {group.messages.map((msg) => (
                          <ChatMessage
                            key={msg.id}
                            message={msg}
                            isOwn={msg.sender_id === user?.id}
                          />
                        ))}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input or Block Notice */}
              {currentBlockStatus !== 'none' ? (
                <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {currentBlockStatus === 'blocked_by_me'
                          ? (t.chat?.blockedByYou || 'Du hast diesen Benutzer blockiert.')
                          : (t.chat?.blockedByPartner || 'Du kannst diesem Benutzer keine Nachrichten senden.')
                        }
                      </p>
                    </div>
                    {currentBlockStatus === 'blocked_by_me' && (
                      <button
                        onClick={handleUnblock}
                        disabled={isBlocking}
                        className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-stone-800 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                      >
                        {isBlocking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t.chat?.unblock || 'Entblocken'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t.chat?.placeholder || 'Nachricht schreiben...'}
                      className="flex-1 px-4 py-2 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={isSending}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isSending}
                      className="p-2 rounded-full bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
