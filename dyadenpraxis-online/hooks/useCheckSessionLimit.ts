import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SessionLimitCheck {
  allowed: boolean;
  daily_count: number;
  daily_limit: number;
  monthly_count: number;
  monthly_limit: number;
  limit_type: 'daily' | 'monthly' | null;
}

interface UseCheckSessionLimitReturn {
  allowed: boolean;
  limitInfo: SessionLimitCheck | null;
  isLoading: boolean;
  error: string | null;
  recheck: () => Promise<SessionLimitCheck | null>;
}

const CACHE_TTL_MS = 60_000; // 1 minute

export function useCheckSessionLimit(): UseCheckSessionLimitReturn {
  const { user } = useAuth();
  const [limitInfo, setLimitInfo] = useState<SessionLimitCheck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: SessionLimitCheck; timestamp: number } | null>(null);

  const check = useCallback(async (): Promise<SessionLimitCheck | null> => {
    if (!user) return null;

    // TTL cache check
    const cached = cacheRef.current;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('check_session_limit', {
        p_user_id: user.id,
      });

      if (rpcError) throw new Error(rpcError.message);

      const result = data as SessionLimitCheck;
      cacheRef.current = { data: result, timestamp: Date.now() };
      setLimitInfo(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session-Limit Prüfung fehlgeschlagen';
      setError(msg);
      // Fail open: allow sessions on RPC error (network issue should not block users)
      const fallback: SessionLimitCheck = {
        allowed: true,
        daily_count: 0,
        daily_limit: -1,
        monthly_count: 0,
        monthly_limit: -1,
        limit_type: null,
      };
      cacheRef.current = { data: fallback, timestamp: Date.now() };
      setLimitInfo(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load on mount when user is available
  useEffect(() => {
    if (user) {
      check();
    }
  }, [user, check]);

  const recheck = useCallback(async (): Promise<SessionLimitCheck | null> => {
    // Clear cache to force fresh RPC call
    cacheRef.current = null;
    return check();
  }, [check]);

  return {
    allowed: limitInfo?.allowed ?? true,
    limitInfo,
    isLoading,
    error,
    recheck,
  };
}
