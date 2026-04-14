import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Invitation {
  id: string;
  created_at: string;
  inviter_id: string;
  token: string;
  used_at: string | null;
  invited_user_id: string | null;
  expires_at: string;
  is_active: boolean;
}

export interface InvitationWithInvitee extends Invitation {
  invited_user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export interface ValidatedInvitation {
  id: string;
  inviter_id: string;
  inviter_name: string;
  inviter_avatar: string | null;
  expires_at: string;
  is_valid: boolean;
}

export interface InvitationStats {
  total: number;
  active: number;
  used: number;
  expired: number;
}

interface UseInvitationsReturn {
  // State
  invitations: InvitationWithInvitee[];
  stats: InvitationStats;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadInvitations: () => Promise<void>;
  createInvitation: () => Promise<{ token: string; shareUrl: string } | null>;
  revokeInvitation: (invitationId: string) => Promise<boolean>;
  validateToken: (token: string) => Promise<ValidatedInvitation | null>;
  redeemInvitation: (token: string) => Promise<boolean>;
  
  // Helpers
  getShareUrl: (token: string) => string;
  copyToClipboard: (token: string) => Promise<boolean>;
  canCreateMore: boolean;
}

const MAX_ACTIVE_INVITATIONS = 10;
const INVITATION_EXPIRY_DAYS = 30;

/**
 * Hook für Einladungen verwalten
 * 
 * Features:
 * - Einladungen erstellen (max 10 aktive)
 * - Token-basiertes System mit 30-Tage-Ablauf
 * - Einladungen widerrufen
 * - Token validieren und einlösen
 */
export function useInvitations(): UseInvitationsReturn {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<InvitationWithInvitee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats
  const stats: InvitationStats = {
    total: invitations.length,
    active: invitations.filter(i => i.is_active && !i.used_at && new Date(i.expires_at) > new Date()).length,
    used: invitations.filter(i => i.used_at !== null).length,
    expired: invitations.filter(i => !i.used_at && new Date(i.expires_at) <= new Date()).length,
  };

  const canCreateMore = stats.active < MAX_ACTIVE_INVITATIONS;

  // Generate share URL
  const getShareUrl = useCallback((token: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${token}`;
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (token: string): Promise<boolean> => {
    try {
      const shareUrl = getShareUrl(token);
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch (err) {
      console.error('[useInvitations] Kopieren fehlgeschlagen:', err);
      return false;
    }
  }, [getShareUrl]);

  // Load all invitations for current user
  const loadInvitations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select(`
          *,
          invited_user:profiles!invited_user_id(id, name, avatar_url)
        `)
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      setInvitations(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Einladungen laden fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new invitation
  const createInvitation = useCallback(async (): Promise<{ token: string; shareUrl: string } | null> => {
    if (!user) {
      setError('Nicht angemeldet');
      return null;
    }

    if (!canCreateMore) {
      setError(`Maximum ${MAX_ACTIVE_INVITATIONS} aktive Einladungen erreicht`);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate token via RPC
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_invite_token');

      if (tokenError) throw new Error(tokenError.message);
      const token = tokenData as string;

      // Calculate expiry date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

      // Insert invitation
      const { data: invitation, error: insertError } = await supabase
        .from('invitations')
        .insert({
          inviter_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      // Add to local state
      setInvitations(prev => [invitation, ...prev]);

      return {
        token,
        shareUrl: getShareUrl(token),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Einladung erstellen fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, canCreateMore, getShareUrl]);

  // Revoke an invitation (deactivate)
  const revokeInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ is_active: false })
        .eq('id', invitationId)
        .eq('inviter_id', user.id);

      if (updateError) throw new Error(updateError.message);

      // Update local state
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId ? { ...inv, is_active: false } : inv
      ));

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Einladung widerrufen fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user]);

  // Validate a token (for accepting invitations)
  const validateToken = useCallback(async (token: string): Promise<ValidatedInvitation | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('validate_invitation_token', { p_token: token });

      if (rpcError) throw new Error(rpcError.message);
      
      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];
      return {
        id: result.id,
        inviter_id: result.inviter_id,
        inviter_name: result.inviter_name,
        inviter_avatar: result.inviter_avatar,
        expires_at: result.expires_at,
        is_valid: result.is_valid,
      };
    } catch (err) {
      console.error('[useInvitations] Token validieren fehlgeschlagen:', err);
      return null;
    }
  }, []);

  // Redeem an invitation (mark as used)
  const redeemInvitation = useCallback(async (token: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // First validate the token
      const validation = await validateToken(token);
      if (!validation || !validation.is_valid) {
        setError('Einladung ist ungültig oder abgelaufen');
        return false;
      }

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          used_at: new Date().toISOString(),
          invited_user_id: user.id,
        })
        .eq('id', validation.id)
        .is('used_at', null);

      if (updateError) throw new Error(updateError.message);

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Einladung einlösen fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user, validateToken]);

  // Load invitations on mount when user is available
  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user, loadInvitations]);

  return {
    invitations,
    stats,
    isLoading,
    error,
    loadInvitations,
    createInvitation,
    revokeInvitation,
    validateToken,
    redeemInvitation,
    getShareUrl,
    copyToClipboard,
    canCreateMore,
  };
}
