import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { usePresence } from '../hooks/usePresence';

export interface DbUserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  trust_level: 'new' | 'known' | 'verified';
  confirmations: number;
  is_online: boolean;
  is_available: boolean;
  preferred_levels: number[];
  preferred_duration: number;
  sessions_completed: number;
  compliance_rate: number;
  em_experience_months: number;
  // Session rate limiting (Migration 012)
  role?: 'user' | 'admin';
  daily_session_limit?: number | null;
  monthly_session_limit?: number | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DbUserProfile | null;
  initialized: boolean;
  loading: boolean;
  onlineUserIds: Set<string>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<DbUserProfile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbUserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase Presence: Live-Online-Status tracking
  const { onlineUserIds } = usePresence(user?.id);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Profil laden fehlgeschlagen:', error.message);
      return null;
    }
    return data as DbUserProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  // Initialisierung: Session laden + Auth-Listener
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          // Prüfe ob Access Token abgelaufen ist
          const expiresAt = currentSession.expires_at;
          if (expiresAt && expiresAt * 1000 < Date.now()) {
            // Token abgelaufen - Refresh versuchen
            console.warn('[Auth] Access Token abgelaufen, versuche Refresh...');
            const { data: { session: refreshedSession }, error: refreshError } =
              await supabase.auth.refreshSession();
            if (refreshError || !refreshedSession) {
              console.error('[Auth] Token Refresh fehlgeschlagen:', refreshError?.message);
              await supabase.auth.signOut();
              return;
            }
            setUser(refreshedSession.user);
            setSession(refreshedSession);
            const p = await fetchProfile(refreshedSession.user.id);
            if (p) setProfile(p);
          } else {
            setUser(currentSession.user);
            setSession(currentSession);
            const p = await fetchProfile(currentSession.user.id);
            if (p) setProfile(p);
          }
        }
      } catch (error) {
        console.error('[Auth] Init Fehler:', error);
        // Prüfe auf Refresh Token Fehler und clean up
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Refresh Token')) {
          console.warn('[Auth] Refresh Token ungültig - signOut wird ausgeführt');
          await supabase.auth.signOut();
        }
      } finally {
        setInitialized(true);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Handle TOKEN_REFRESHED failure (Refresh Token missing/invalid)
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          console.warn('[Auth] Token Refresh fehlgeschlagen - Session ungültig');
          await supabase.auth.signOut();
          setProfile(null);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          const p = await fetchProfile(newSession.user.id);
          if (p) setProfile(p);
        } else if (event === 'SIGNED_OUT' || !newSession) {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.' };
      return { error: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { error: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.' };
      return { error: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    // is_online wird automatisch via usePresence Cleanup zurueckgesetzt
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<DbUserProfile>) => {
    if (!user) return { error: 'Nicht angemeldet' };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) return { error: error.message };
    await refreshProfile();
    return { error: null };
  }, [user, refreshProfile]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, initialized, loading, onlineUserIds,
      signIn, signUp, signOut, updateProfile, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
