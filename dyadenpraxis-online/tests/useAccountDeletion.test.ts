import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccountDeletion } from '../hooks/useAccountDeletion';

const { mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

describe('useAccountDeletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    });
    mockSignOut.mockResolvedValue({});
    // Default: erfolgreiche Server-Loeschung
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
  });

  it('fordert Passwort an', async () => {
    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      const ok = await result.current.deleteAccount('');
      expect(ok).toBe(false);
    });

    expect(result.current.error).toBe('Passwort erforderlich');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('scheitert ohne aktive Session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      const ok = await result.current.deleteAccount('passwort');
      expect(ok).toBe(false);
    });

    expect(result.current.error).toBe('Nicht angemeldet');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loescht Account erfolgreich und signOut', async () => {
    const { result } = renderHook(() => useAccountDeletion());

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteAccount('passwort');
    });

    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({ password: 'passwort' }),
    });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('surfacet Server-Fehler und bleibt eingeloggt', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Falsches Passwort' }),
    } as Response);
    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      const ok = await result.current.deleteAccount('falsch');
      expect(ok).toBe(false);
    });

    expect(result.current.error).toBe('Falsches Passwort');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('setzt isDeleting waehrend des Loeschvorgangs', async () => {
    // Deferred fetch: wir kontrollieren WANN der Server antwortet,
    // damit wir isDeleting=true beobachten koennen.
    let resolveFetch: (value: Response) => void = () => {};
    global.fetch = vi.fn().mockReturnValue(
      new Promise<Response>(r => { resolveFetch = r; })
    );

    const { result } = renderHook(() => useAccountDeletion());
    expect(result.current.isDeleting).toBe(false);

    // Sync act erzwingt Flush von setIsDeleting(true) bevor der erste await.
    let deletePromise!: Promise<boolean>;
    act(() => {
      deletePromise = result.current.deleteAccount('passwort');
    });
    expect(result.current.isDeleting).toBe(true);

    // Fetch aufloesen — deleteAccount laeuft bis zum Ende.
    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ success: true }) } as Response);
      await deletePromise;
    });
    expect(result.current.isDeleting).toBe(false);
  });
});
