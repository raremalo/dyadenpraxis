import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseAccountDeletionReturn {
  isDeleting: boolean;
  error: string | null;
  deleteAccount: () => Promise<boolean>;
}

export function useAccountDeletion(): UseAccountDeletionReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Nicht angemeldet');
        return false;
      }

      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Account-Loeschung fehlgeschlagen');
      }

      // Sign out lokal nach erfolgreicher Server-Loeschung
      await supabase.auth.signOut();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Account-Loeschung fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    isDeleting,
    error,
    deleteAccount,
  };
}
