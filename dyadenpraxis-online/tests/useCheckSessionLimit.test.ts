import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCheckSessionLimit } from '../hooks/useCheckSessionLimit';
import type { SessionLimitCheck } from '../hooks/useCheckSessionLimit';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: mockRpc },
}));

const mockLimitUser = Object.freeze({ id: 'user-123' });

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockLimitUser }),
}));

const allowedResponse: SessionLimitCheck = {
  allowed: true,
  daily_count: 2,
  daily_limit: 5,
  monthly_count: 8,
  monthly_limit: 20,
  limit_type: null,
};

const deniedResponse: SessionLimitCheck = {
  allowed: false,
  daily_count: 5,
  daily_limit: 5,
  monthly_count: 8,
  monthly_limit: 20,
  limit_type: 'daily',
};

describe('useCheckSessionLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: allowedResponse, error: null });
  });

  it('initialisiert mit allowed=true während Laden', () => {
    const { result } = renderHook(() => useCheckSessionLimit());
    expect(result.current.allowed).toBe(true);
    expect(result.current.limitInfo).toBeNull();
  });

  it('prüft Limit erfolgreich via RPC', async () => {
    const { result } = renderHook(() => useCheckSessionLimit());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.allowed).toBe(true);
    expect(result.current.limitInfo?.daily_count).toBe(2);
    expect(result.current.limitInfo?.daily_limit).toBe(5);
    expect(mockRpc).toHaveBeenCalledWith('check_session_limit', {
      p_user_id: 'user-123',
    });
  });

  it('erkennt Limit erreicht', async () => {
    mockRpc.mockResolvedValue({ data: deniedResponse, error: null });

    const { result } = renderHook(() => useCheckSessionLimit());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.allowed).toBe(false);
    expect(result.current.limitInfo?.limit_type).toBe('daily');
  });

  it('recheck umgeht Cache und ruft RPC erneut auf', async () => {
    const { result } = renderHook(() => useCheckSessionLimit());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const callsAfterMount = mockRpc.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThanOrEqual(1);

    // recheck clears cache → fresh RPC call
    mockRpc.mockResolvedValue({ data: deniedResponse, error: null });

    await act(async () => {
      await result.current.recheck();
    });

    expect(mockRpc.mock.calls.length).toBeGreaterThan(callsAfterMount);
    expect(result.current.allowed).toBe(false);
  });

  it('fail-open bei RPC Fehler', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => useCheckSessionLimit());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fail open: allowed stays true on error
    expect(result.current.allowed).toBe(true);
    expect(result.current.error).toBeTruthy();
  });
});
