import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeedback } from '../hooks/useFeedback';
import type { SessionFeedback } from '../hooks/useFeedback';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: mockRpc },
}));

// Mutable ref statt vi.doMock — zuverlaessig fuer "no user" Test
const { mockUserRef } = vi.hoisted(() => ({
  mockUserRef: { current: { id: 'user-123' } as { id: string } | null },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUserRef.current }),
}));

const validInput = {
  session_id: 'sess-1',
  rated_user_id: 'partner-456',
  structure_rating: 4,
  presence_rating: 5,
  overall_rating: 4,
  would_practice_again: true,
};

const feedbackRow: SessionFeedback = {
  id: 'fb-1',
  created_at: '2026-06-15T10:00:00Z',
  session_id: 'sess-1',
  rated_user_id: 'partner-456',
  reviewer_id: 'user-123',
  structure_rating: 4,
  presence_rating: 5,
  overall_rating: 4,
  would_practice_again: true,
};

describe('useFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRef.current = { id: 'user-123' };
  });

  it('reicht Feedback erfolgreich ueber RPC ein', async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, feedback: feedbackRow },
      error: null,
    });
    const { result } = renderHook(() => useFeedback());

    let submitted: SessionFeedback | null = null;
    await act(async () => {
      submitted = await result.current.submitFeedback(validInput);
    });

    expect(submitted).toEqual(feedbackRow);
    expect(result.current.error).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('submit_session_feedback', {
      p_session_id: 'sess-1',
      p_rated_user_id: 'partner-456',
      p_structure_rating: 4,
      p_presence_rating: 5,
      p_overall_rating: 4,
      p_would_practice_again: true,
    });
  });

  it('validiert Rating-Bereich vor RPC-Aufruf', async () => {
    const { result } = renderHook(() => useFeedback());

    await act(async () => {
      const out = await result.current.submitFeedback({ ...validInput, overall_rating: 7 });
      expect(out).toBeNull();
    });

    expect(result.current.error).toBe('Bewertungen muessen zwischen 1 und 5 liegen');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('mappt already_rated auf deutsche Meldung', async () => {
    mockRpc.mockResolvedValue({
      data: { success: false, error: 'already_rated' },
      error: null,
    });
    const { result } = renderHook(() => useFeedback());

    await act(async () => {
      const out = await result.current.submitFeedback(validInput);
      expect(out).toBeNull();
    });

    expect(result.current.error).toBe('Du hast diese Session bereits bewertet');
  });

  it('mappt not_participant auf deutsche Meldung', async () => {
    mockRpc.mockResolvedValue({
      data: { success: false, error: 'not_participant' },
      error: null,
    });
    const { result } = renderHook(() => useFeedback());

    await act(async () => {
      await result.current.submitFeedback(validInput);
    });

    expect(result.current.error).toBe('Du warst nicht Teilnehmer dieser Session');
  });

  it('gibt null zurueck ohne User', async () => {
    mockUserRef.current = null;
    const { result } = renderHook(() => useFeedback());

    const out = await result.current.submitFeedback(validInput);
    expect(out).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('surfacet RPC-Netzwerkfehler', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });
    const { result } = renderHook(() => useFeedback());

    await act(async () => {
      const out = await result.current.submitFeedback(validInput);
      expect(out).toBeNull();
    });

    expect(result.current.error).toBe('Network error');
  });
});
