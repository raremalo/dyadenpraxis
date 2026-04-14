import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UsePresenceReturn {
  onlineUserIds: Set<string>;
  isTracking: boolean;
}

/**
 * Supabase Presence Hook fuer Live-Online-Status.
 * Tracked den aktuellen User im Presence Channel und
 * synchronisiert is_online in der profiles-Tabelle.
 * Bei Disconnect/Crash wird der User automatisch
 * aus dem Presence-State entfernt.
 */
export function usePresence(userId: string | undefined): UsePresenceReturn {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isTracking, setIsTracking] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const setOnlineInDb = useCallback(async (online: boolean) => {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_online: online, is_available: online })
      .eq('id', userId);
    if (error) console.error('[usePresence] Online-Status Update fehlgeschlagen:', error);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    // Rebuild onlineUserIds from full presence state on every sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const ids = new Set<string>(Object.keys(state));
      setOnlineUserIds(ids);
    });

    // Subscribe then track
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        await setOnlineInDb(true);
        setIsTracking(true);
      }
    });

    // Tab visibility: untrack when hidden, re-track when visible
    const handleVisibility = async () => {
      if (!channelRef.current) return;
      if (document.visibilityState === 'hidden') {
        await channelRef.current.untrack();
        await setOnlineInDb(false);
        setIsTracking(false);
      } else if (document.visibilityState === 'visible') {
        await channelRef.current.track({ user_id: userId, online_at: new Date().toISOString() });
        await setOnlineInDb(true);
        setIsTracking(true);
      }
    };

    // Best effort on page close - Presence auto-cleanup handles the rest
    const handleBeforeUnload = () => {
      channelRef.current?.untrack();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.untrack();
      setOnlineInDb(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsTracking(false);
    };
  }, [userId, setOnlineInDb]);

  return { onlineUserIds, isTracking };
}
