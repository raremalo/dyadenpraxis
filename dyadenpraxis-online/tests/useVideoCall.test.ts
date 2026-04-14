import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoCall } from '../hooks/useVideoCall';

// Hoisted mocks (vi.mock wird nach oben gehoisted)
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
      refreshSession: vi.fn().mockResolvedValue({ error: { message: 'Token expired' } }),
    },
  },
}));

describe('useVideoCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialisiert mit korrektem Default-State', () => {
    const { result } = renderHook(() => useVideoCall());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.createRoom).toBe('function');
    expect(typeof result.current.checkMediaPermissions).toBe('function');
  });

  it('createRoom ruft Supabase Edge Function auf', async () => {
    const roomData = {
      roomUrl: 'https://daily.co/test-room',
      tokens: { requester: 'tok-r', partner: 'tok-p', third: null },
    };
    mockInvoke.mockResolvedValue({ data: roomData, error: null });

    const { result } = renderHook(() => useVideoCall());

    let response: unknown;
    await act(async () => {
      response = await result.current.createRoom('session-123');
    });

    expect(mockInvoke).toHaveBeenCalledWith('create-room', {
      body: { sessionId: 'session-123', includeThird: false },
    });
    expect(response).toEqual(roomData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('createRoom mit includeThird=true', async () => {
    const roomData = {
      roomUrl: 'https://daily.co/test-room',
      tokens: { requester: 'tok-r', partner: 'tok-p', third: 'tok-t' },
    };
    mockInvoke.mockResolvedValue({ data: roomData, error: null });

    const { result } = renderHook(() => useVideoCall());

    await act(async () => {
      await result.current.createRoom('session-triad', true);
    });

    expect(mockInvoke).toHaveBeenCalledWith('create-room', {
      body: { sessionId: 'session-triad', includeThird: true },
    });
  });

  it('createRoom behandelt Fehler', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Room-Erstellung fehlgeschlagen' } });

    const { result } = renderHook(() => useVideoCall());

    let response: unknown;
    await act(async () => {
      response = await result.current.createRoom('session-fail');
    });

    expect(response).toBeNull();
    expect(result.current.error).toBe('Room-Erstellung fehlgeschlagen');
  });

  it('createRoom behandelt 401 mit automatischem Sign-Out', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized', context: { status: 401 } },
    });

    const { result } = renderHook(() => useVideoCall());

    let response: unknown;
    await act(async () => {
      response = await result.current.createRoom('session-expired');
    });

    expect(response).toBeNull();
    expect(result.current.error).toBe('Sitzung abgelaufen. Bitte Seite neu laden.');
  });

  it('checkMediaPermissions gibt true bei Erfolg zurueck', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      configurable: true,
    });

    const { result } = renderHook(() => useVideoCall());

    let hasPermission = false;
    await act(async () => {
      hasPermission = await result.current.checkMediaPermissions();
    });

    expect(hasPermission).toBe(true);
  });

  it('checkMediaPermissions gibt false bei Fehler zurueck', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowed')) },
      configurable: true,
    });

    const { result } = renderHook(() => useVideoCall());

    let hasPermission = true;
    await act(async () => {
      hasPermission = await result.current.checkMediaPermissions();
    });

    expect(hasPermission).toBe(false);
  });

  it('gibt stabile Funktionsreferenzen zurueck', () => {
    const { result, rerender } = renderHook(() => useVideoCall());

    const firstCreateRoom = result.current.createRoom;
    const firstCheckPermissions = result.current.checkMediaPermissions;
    rerender();
    expect(result.current.createRoom).toBe(firstCreateRoom);
    expect(result.current.checkMediaPermissions).toBe(firstCheckPermissions);
  });
});
