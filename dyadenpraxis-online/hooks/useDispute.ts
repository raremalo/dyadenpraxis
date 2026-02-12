import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type DisputeType = 'rating' | 'verification' | 'other';
export type DisputeStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface Dispute {
  id: string;
  created_at: string;
  dispute_type: DisputeType;
  reporter_id: string;
  disputed_user_id: string;
  session_id: string | null;
  verification_id: string | null;
  description: string;
  status: DisputeStatus;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CreateDisputeInput {
  dispute_type: DisputeType;
  disputed_user_id: string;
  session_id?: string;
  verification_id?: string;
  description: string;
}

interface UseDisputeReturn {
  isLoading: boolean;
  error: string | null;
  createDispute: (input: CreateDisputeInput) => Promise<Dispute | null>;
  loadMyDisputes: () => Promise<Dispute[]>;
  loadDisputesAgainstMe: () => Promise<Dispute[]>;
}

export function useDispute(): UseDisputeReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDispute = useCallback(async (input: CreateDisputeInput): Promise<Dispute | null> => {
    if (!user) return null;

    // Selbstmeldung verhindern
    if (input.disputed_user_id === user.id) {
      setError('Du kannst dich nicht selbst melden');
      return null;
    }

    // Beschreibung validieren
    if (!input.description.trim()) {
      setError('Bitte gib eine Beschreibung an');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('rating_disputes')
        .insert({
          dispute_type: input.dispute_type,
          reporter_id: user.id,
          disputed_user_id: input.disputed_user_id,
          session_id: input.session_id || null,
          verification_id: input.verification_id || null,
          description: input.description.trim(),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      return data as Dispute;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Meldung senden fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMyDisputes = useCallback(async (): Promise<Dispute[]> => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('rating_disputes')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      return (data || []) as Dispute[];
    } catch (err) {
      console.error('Meine Meldungen laden fehlgeschlagen:', err);
      return [];
    }
  }, [user]);

  const loadDisputesAgainstMe = useCallback(async (): Promise<Dispute[]> => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('rating_disputes')
        .select('*')
        .eq('disputed_user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      return (data || []) as Dispute[];
    } catch (err) {
      console.error('Meldungen gegen mich laden fehlgeschlagen:', err);
      return [];
    }
  }, [user]);

  return {
    isLoading,
    error,
    createDispute,
    loadMyDisputes,
    loadDisputesAgainstMe,
  };
}
