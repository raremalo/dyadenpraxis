import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiFetch';

interface UseAccountDeletionReturn {
  isDeleting: boolean;
  error: string | null;
  deleteAccount: (password: string) => Promise<boolean>;
}

export function useAccountDeletion(): UseAccountDeletionReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = useCallback(async (password: string): Promise<boolean> => {
    if (!password) {
      setError('Passwort erforderlich');
      return false;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await apiFetch('/api/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });

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
