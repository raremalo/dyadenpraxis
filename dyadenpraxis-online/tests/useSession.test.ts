import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from '../hooks/useSession';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123', email: 'test@example.com' } }),
}));

/**
 * Erstellt eine thenable Mock-Chain, damit await supabase.from(...).select(...)...
 * unabhaengig von der letzten Methode korrekt resolved.
 */
function buildChain(data: unknown = [], error: unknown = null) {
  const result = { data, error };
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      // Thenable: await chain resolved zu result
      if (prop === 'then') {
        return (resolve: (val: unknown) => void) => resolve(result);
      }
      // Alle Methoden geben den Proxy zurueck
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(buildChain([]));
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('initialisiert mit leerem State', async () => {
    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.activeSession).toBeNull();
  });

  it('laedt Sessions beim Mount', async () => {
    const sessions = [
      { id: 's1', status: 'completed', requester_id: 'user-123', partner_id: 'p1' },
      { id: 's2', status: 'active', requester_id: 'user-123', partner_id: 'p2' },
    ];
    mockFrom.mockReturnValue(buildChain(sessions));

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });

    expect(result.current.activeSession).toEqual(
      expect.objectContaining({ id: 's2', status: 'active' })
    );
  });

  it('erkennt accepted als aktive Session', async () => {
    const sessions = [
      { id: 's1', status: 'accepted', requester_id: 'user-123', partner_id: 'p1' },
    ];
    mockFrom.mockReturnValue(buildChain(sessions));

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.activeSession).toEqual(
        expect.objectContaining({ id: 's1', status: 'accepted' })
      );
    });
  });

  it('behandelt Fehler beim Laden', async () => {
    mockFrom.mockReturnValue(buildChain(null, { message: 'Network error' }));

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('cancelSession ist als Funktion verfuegbar', async () => {
    const { result } = renderHook(() => useSession());

    expect(result.current.cancelSession).toBeInstanceOf(Function);
    expect(typeof result.current.cancelSession).toBe('function');
  });

  it('completeSession ist als Funktion verfuegbar', async () => {
    const { result } = renderHook(() => useSession());

    expect(result.current.completeSession).toBeInstanceOf(Function);
    expect(typeof result.current.completeSession).toBe('function');
  });

  it('exponiert alle erwarteten Methoden und State', async () => {
    const { result } = renderHook(() => useSession());

    // State
    expect(result.current.sessions).toBeDefined();
    expect(result.current.openSessions).toBeDefined();
    expect(result.current.openTriads).toBeDefined();
    expect(result.current.activeSession).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');

    // Methoden
    const expectedMethods = [
      'loadSessions', 'loadOpenSessions', 'loadOpenTriads',
      'createSession', 'acceptSession', 'startSession',
      'completeSession', 'cancelSession', 'joinOpenSession',
      'joinAsThirdParticipant', 'getSession', 'subscribeToSession',
    ];
    for (const method of expectedMethods) {
      expect(result.current[method as keyof typeof result.current]).toBeInstanceOf(Function);
    }
  });
});
