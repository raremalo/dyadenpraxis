import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoCall } from '../hooks/useVideoCall';

// Hoisted mocks (vi.mock wird nach oben gehoisted)
const { mockInvoke, mockJoin, mockLeave, mockDestroy, mockOn, mockParticipants, mockSetLocalAudio, mockSetLocalVideo } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockJoin: vi.fn().mockResolvedValue(undefined),
  mockLeave: vi.fn(),
  mockDestroy: vi.fn(),
  mockOn: vi.fn(),
  mockParticipants: vi.fn().mockReturnValue({}),
  mockSetLocalAudio: vi.fn(),
  mockSetLocalVideo: vi.fn(),
}));

vi.mock('@daily-co/daily-js', () => ({
  default: {
    createFrame: vi.fn(() => ({
      join: mockJoin,
      leave: mockLeave,
      destroy: mockDestroy,
      on: mockOn,
      participants: mockParticipants,
      setLocalAudio: mockSetLocalAudio,
      setLocalVideo: mockSetLocalVideo,
    })),
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe('useVideoCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialisiert mit korrektem Default-State', () => {
    const { result } = renderHook(() => useVideoCall());

    expect(result.current.isJoined).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.participants).toEqual([]);
    expect(result.current.isAudioEnabled).toBe(true);
    expect(result.current.isVideoEnabled).toBe(true);
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

  it('createRoom behandelt Fehler', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Room-Erstellung fehlgeschlagen' } });
    const onError = vi.fn();

    const { result } = renderHook(() => useVideoCall({ onError }));

    let response: unknown;
    await act(async () => {
      response = await result.current.createRoom('session-fail');
    });

    expect(response).toBeNull();
    expect(result.current.error).toBe('Room-Erstellung fehlgeschlagen');
    expect(onError).toHaveBeenCalledWith('Room-Erstellung fehlgeschlagen');
  });

  it('leaveCall raeumt auf', () => {
    const { result } = renderHook(() => useVideoCall());

    act(() => {
      result.current.leaveCall();
    });

    expect(result.current.isJoined).toBe(false);
    expect(result.current.participants).toEqual([]);
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
    const firstLeaveCall = result.current.leaveCall;
    rerender();
    expect(result.current.createRoom).toBe(firstCreateRoom);
    expect(result.current.leaveCall).toBe(firstLeaveCall);
  });
});
