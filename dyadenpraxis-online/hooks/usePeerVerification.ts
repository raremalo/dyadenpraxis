import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type TrustLevel = 'new' | 'known' | 'verified';

export interface PeerVerification {
  id: string;
  created_at: string;
  verifier_id: string;
  verified_user_id: string;
  session_id: string | null;
  is_active: boolean;
  verifier?: {
    id: string;
    name: string;
    avatar_url: string | null;
    trust_level: TrustLevel;
  };
}

export interface VerificationStats {
  verification_count: number;
  verified_by_count: number; // How many verified users verified this person
  is_verified: boolean;
  trust_level: TrustLevel;
  progress_to_next: number; // 0-100 percentage
}

export interface BlockedPartner {
  id: string;
  created_at: string;
  user_id: string;
  blocked_user_id: string;
}

interface UsePeerVerificationReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Verifications
  verifyUser: (userId: string, sessionId?: string) => Promise<boolean>;
  unverifyUser: (userId: string) => Promise<boolean>;
  hasVerified: (userId: string) => Promise<boolean>;
  getVerificationsFor: (userId: string) => Promise<PeerVerification[]>;
  getMyVerifications: () => Promise<PeerVerification[]>;
  getVerificationStats: (userId: string) => Promise<VerificationStats | null>;
  
  // Blocking
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  isBlocked: (userId: string) => Promise<boolean>;
  getBlockedUsers: () => Promise<BlockedPartner[]>;
  
  // Realtime
  subscribeToVerifications: (userId: string, callback: (verifications: PeerVerification[]) => void) => void;
  unsubscribe: () => void;
}

export function usePeerVerification(): UsePeerVerificationReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Verify a user
  const verifyUser = useCallback(async (userId: string, sessionId?: string): Promise<boolean> => {
    if (!user) return false;
    if (userId === user.id) {
      setError('Du kannst dich nicht selbst verifizieren');
      return false;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('peer_verifications')
        .insert({
          verifier_id: user.id,
          verified_user_id: userId,
          session_id: sessionId || null,
          is_active: true,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Already verified - try to reactivate
          const { error: updateError } = await supabase
            .from('peer_verifications')
            .update({ is_active: true })
            .eq('verifier_id', user.id)
            .eq('verified_user_id', userId);
          
          if (updateError) throw new Error(updateError.message);
        } else {
          throw new Error(insertError.message);
        }
      }

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verifizierung fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Remove verification (deactivate)
  const unverifyUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('peer_verifications')
        .update({ is_active: false })
        .eq('verifier_id', user.id)
        .eq('verified_user_id', userId);

      if (updateError) throw new Error(updateError.message);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verifizierung entfernen fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Check if current user has verified a specific user
  const hasVerified = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error: fetchError } = await supabase
        .from('peer_verifications')
        .select('is_active')
        .eq('verifier_id', user.id)
        .eq('verified_user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') return false;
        throw new Error(fetchError.message);
      }
      
      return data?.is_active || false;
    } catch (err) {
      console.error('[PeerVerification] Verifizierungsstatus prüfen fehlgeschlagen:', err);
      return false;
    }
  }, [user]);

  // Get all verifications for a user (who verified them)
  const getVerificationsFor = useCallback(async (userId: string): Promise<PeerVerification[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('peer_verifications')
        .select(`
          *,
          verifier:profiles!verifier_id(id, name, avatar_url, trust_level)
        `)
        .eq('verified_user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      return data || [];
    } catch (err) {
      console.error('[PeerVerification] Verifizierungen laden fehlgeschlagen:', err);
      return [];
    }
  }, []);

  // Get verifications I have given
  const getMyVerifications = useCallback(async (): Promise<PeerVerification[]> => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('peer_verifications')
        .select('*')
        .eq('verifier_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      return data || [];
    } catch (err) {
      console.error('[PeerVerification] Eigene Verifizierungen laden fehlgeschlagen:', err);
      return [];
    }
  }, [user]);

  // Get verification stats for a user
  const getVerificationStats = useCallback(async (userId: string): Promise<VerificationStats | null> => {
    try {
      // Get all active verifications for this user
      const { data: verifications, error: fetchError } = await supabase
        .from('peer_verifications')
        .select(`
          id,
          verifier:profiles!verifier_id(trust_level)
        `)
        .eq('verified_user_id', userId)
        .eq('is_active', true);

      if (fetchError) throw new Error(fetchError.message);

      // Get user's current trust level
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_level')
        .eq('id', userId)
        .single();

      const totalCount = verifications?.length || 0;
      const verifiedByCount = verifications?.filter(
        v => {
          // verifier can be an array or object depending on Supabase response
          const verifierData = v.verifier;
          if (Array.isArray(verifierData)) {
            return verifierData[0]?.trust_level === 'verified';
          }
          return (verifierData as { trust_level?: string } | null)?.trust_level === 'verified';
        }
      ).length || 0;

      const trustLevel = (profile?.trust_level as TrustLevel) || 'new';
      const isVerified = trustLevel === 'verified';

      // Calculate progress to next level
      let progressToNext = 0;
      if (trustLevel === 'new') {
        progressToNext = Math.min(100, (verifiedByCount / 1) * 100);
      } else if (trustLevel === 'known') {
        progressToNext = Math.min(100, (verifiedByCount / 3) * 100);
      } else {
        progressToNext = 100;
      }

      return {
        verification_count: totalCount,
        verified_by_count: verifiedByCount,
        is_verified: isVerified,
        trust_level: trustLevel,
        progress_to_next: progressToNext,
      };
    } catch (err) {
      console.error('[PeerVerification] Verifizierungsstatistiken laden fehlgeschlagen:', err);
      return null;
    }
  }, []);

  // Block a user
  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
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
          return true;
        }
        throw new Error(insertError.message);
      }

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Blockieren fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Unblock a user
  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('blocked_partners')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', userId);

      if (deleteError) throw new Error(deleteError.message);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Entblocken fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Check if user is blocked
  const isBlocked = useCallback(async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error: fetchError } = await supabase
        .from('blocked_partners')
        .select('id')
        .eq('user_id', user.id)
        .eq('blocked_user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') return false;
        throw new Error(fetchError.message);
      }
      
      return !!data;
    } catch (err) {
      console.error('[PeerVerification] Blockierungsstatus prüfen fehlgeschlagen:', err);
      return false;
    }
  }, [user]);

  // Get all blocked users
  const getBlockedUsers = useCallback(async (): Promise<BlockedPartner[]> => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('blocked_partners')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      return data || [];
    } catch (err) {
      console.error('[PeerVerification] Blockierte Nutzer laden fehlgeschlagen:', err);
      return [];
    }
  }, [user]);

  // Subscribe to verification changes
  const subscribeToVerifications = useCallback((userId: string, callback: (verifications: PeerVerification[]) => void) => {
    // Unsubscribe from previous
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`peer_verifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'peer_verifications',
          filter: `verified_user_id=eq.${userId}`,
        },
        async () => {
          // Refetch verifications on any change
          const verifications = await getVerificationsFor(userId);
          callback(verifications);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [getVerificationsFor]);

  // Unsubscribe
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    error,
    verifyUser,
    unverifyUser,
    hasVerified,
    getVerificationsFor,
    getMyVerifications,
    getVerificationStats,
    blockUser,
    unblockUser,
    isBlocked,
    getBlockedUsers,
    subscribeToVerifications,
    unsubscribe,
  };
}
