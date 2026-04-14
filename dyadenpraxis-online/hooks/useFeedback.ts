import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SessionFeedback {
  id: string;
  created_at: string;
  session_id: string;
  rated_user_id: string;
  reviewer_id: string;
  structure_rating: number;
  presence_rating: number;
  overall_rating: number;
  would_practice_again: boolean;
}

export interface FeedbackInput {
  session_id: string;
  rated_user_id: string;
  structure_rating: number;
  presence_rating: number;
  overall_rating: number;
  would_practice_again: boolean;
}

export interface UserRatingSummary {
  total_reviews: number;
  avg_structure: number;
  avg_presence: number;
  avg_overall: number;
  would_practice_again_percent: number;
}

interface UseFeedbackReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  submitFeedback: (input: FeedbackInput) => Promise<SessionFeedback | null>;
  getFeedbackForSession: (sessionId: string) => Promise<SessionFeedback[]>;
  getMyFeedbackForSession: (sessionId: string) => Promise<SessionFeedback | null>;
  hasSubmittedFeedback: (sessionId: string) => Promise<boolean>;
  
  // User ratings
  getUserRatingSummary: (userId: string) => Promise<UserRatingSummary | null>;
  getReceivedFeedback: () => Promise<SessionFeedback[]>;
}

export function useFeedback(): UseFeedbackReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit feedback for a session
  const submitFeedback = useCallback(async (input: FeedbackInput): Promise<SessionFeedback | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);

    try {
      // Validate ratings
      if (input.structure_rating < 1 || input.structure_rating > 5 ||
          input.presence_rating < 1 || input.presence_rating > 5 ||
          input.overall_rating < 1 || input.overall_rating > 5) {
        throw new Error('Bewertungen muessen zwischen 1 und 5 liegen');
      }

      const { data, error: insertError } = await supabase
        .from('session_feedback')
        .insert({
          session_id: input.session_id,
          rated_user_id: input.rated_user_id,
          reviewer_id: user.id,
          structure_rating: input.structure_rating,
          presence_rating: input.presence_rating,
          overall_rating: input.overall_rating,
          would_practice_again: input.would_practice_again,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Du hast diese Session bereits bewertet');
        }
        throw new Error(insertError.message);
      }

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Feedback senden fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Get all feedback for a session
  const getFeedbackForSession = useCallback(async (sessionId: string): Promise<SessionFeedback[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', sessionId);

      if (fetchError) throw new Error(fetchError.message);
      return data || [];
    } catch (err) {
      console.error('[useFeedback] Feedback laden fehlgeschlagen:', err);
      return [];
    }
  }, []);

  // Get my feedback for a specific session
  const getMyFeedbackForSession = useCallback(async (sessionId: string): Promise<SessionFeedback | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .eq('reviewer_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') return null; // Not found
        throw new Error(fetchError.message);
      }
      return data;
    } catch (err) {
      console.error('[useFeedback] Mein Feedback laden fehlgeschlagen:', err);
      return null;
    }
  }, [user]);

  // Check if user has already submitted feedback for a session
  const hasSubmittedFeedback = useCallback(async (sessionId: string): Promise<boolean> => {
    const feedback = await getMyFeedbackForSession(sessionId);
    return feedback !== null;
  }, [getMyFeedbackForSession]);

  // Get rating summary for a user
  const getUserRatingSummary = useCallback(async (userId: string): Promise<UserRatingSummary | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('session_feedback')
        .select('structure_rating, presence_rating, overall_rating, would_practice_again')
        .eq('rated_user_id', userId);

      if (fetchError) throw new Error(fetchError.message);
      if (!data || data.length === 0) return null;

      const total = data.length;
      const sumStructure = data.reduce((sum, f) => sum + f.structure_rating, 0);
      const sumPresence = data.reduce((sum, f) => sum + f.presence_rating, 0);
      const sumOverall = data.reduce((sum, f) => sum + f.overall_rating, 0);
      const practiceAgainCount = data.filter(f => f.would_practice_again).length;

      return {
        total_reviews: total,
        avg_structure: Math.round((sumStructure / total) * 10) / 10,
        avg_presence: Math.round((sumPresence / total) * 10) / 10,
        avg_overall: Math.round((sumOverall / total) * 10) / 10,
        would_practice_again_percent: Math.round((practiceAgainCount / total) * 100),
      };
    } catch (err) {
      console.error('[useFeedback] Rating-Zusammenfassung laden fehlgeschlagen:', err);
      return null;
    }
  }, []);

  // Get all feedback received by current user
  const getReceivedFeedback = useCallback(async (): Promise<SessionFeedback[]> => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('rated_user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      return data || [];
    } catch (err) {
      console.error('[useFeedback] Erhaltenes Feedback laden fehlgeschlagen:', err);
      return [];
    }
  }, [user]);

  return {
    isLoading,
    error,
    submitFeedback,
    getFeedbackForSession,
    getMyFeedbackForSession,
    hasSubmittedFeedback,
    getUserRatingSummary,
    getReceivedFeedback,
  };
}
