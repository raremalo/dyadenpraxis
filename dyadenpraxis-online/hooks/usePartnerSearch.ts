import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type TrustLevel = 'new' | 'known' | 'verified';

export interface Partner {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  trust_level: TrustLevel;
  confirmations: number;
  is_online: boolean;
  is_available?: boolean;
  preferred_levels: number[];
  preferred_duration: number;
  sessions_completed: number;
  compliance_rate: number;
  em_experience_months?: number;
  updated_at: string;
  similarity_score?: number;
  total_count?: number;
  match_score?: number;
  match_reasons?: string[];
  last_session_at?: string;
}

export interface SearchFilters {
  searchTerm: string;
  trustFilter: TrustLevel | null;
  levelFilter: number[] | null;
  durationFilter: number | null;
  onlineOnly: boolean;
  sortBy: 'recent' | 'name' | 'newest' | 'sessions';
}

interface UsePartnerSearchReturn {
  // Search
  partners: Partner[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  search: (filters?: Partial<SearchFilters>) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  
  // Recommendations
  recommended: Partner[];
  loadRecommended: () => Promise<void>;
  
  // Recent Partners
  recent: Partner[];
  loadRecent: () => Promise<void>;
  
  // Filters
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  searchTerm: '',
  trustFilter: null,
  levelFilter: null,
  durationFilter: null,
  onlineOnly: false,
  sortBy: 'recent',
};

const PAGE_SIZE = 20;

export function usePartnerSearch(): UsePartnerSearchReturn {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);
  
  const [recommended, setRecommended] = useState<Partner[]>([]);
  const [recent, setRecent] = useState<Partner[]>([]);

  const search = useCallback(async (newFilters?: Partial<SearchFilters>) => {
    if (!user) return;

    const activeFilters = newFilters ? { ...filters, ...newFilters } : filters;
    if (newFilters) {
      setFiltersState(activeFilters);
    }

    setIsLoading(true);
    setError(null);
    setOffset(0);

    try {
      const { data, error: rpcError } = await supabase.rpc('search_partners_fuzzy', {
        p_search_term: activeFilters.searchTerm || '',
        p_exclude_user_id: user.id,
        p_trust_filter: activeFilters.trustFilter,
        p_level_filter: activeFilters.levelFilter,
        p_duration_filter: activeFilters.durationFilter,
        p_online_only: activeFilters.onlineOnly,
        p_sort_by: activeFilters.sortBy,
        p_page_offset: 0,
        p_page_limit: PAGE_SIZE,
      });

      if (rpcError) throw new Error(rpcError.message);

      const results = (data || []) as Partner[];
      setPartners(results);
      setTotalCount(results[0]?.total_count ?? 0);
      setOffset(PAGE_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Suche fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  const loadMore = useCallback(async () => {
    if (!user || isLoading || partners.length >= totalCount) return;

    setIsLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('search_partners_fuzzy', {
        p_search_term: filters.searchTerm || '',
        p_exclude_user_id: user.id,
        p_trust_filter: filters.trustFilter,
        p_level_filter: filters.levelFilter,
        p_duration_filter: filters.durationFilter,
        p_online_only: filters.onlineOnly,
        p_sort_by: filters.sortBy,
        p_page_offset: offset,
        p_page_limit: PAGE_SIZE,
      });

      if (rpcError) throw new Error(rpcError.message);

      const results = (data || []) as Partner[];
      setPartners(prev => [...prev, ...results]);
      setOffset(prev => prev + PAGE_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Laden fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading, partners.length, totalCount, filters, offset]);

  const loadRecommended = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: rpcError } = await supabase.rpc('get_recommended_partners', {
        p_user_id: user.id,
        lim: 6,
      });

      if (rpcError) throw new Error(rpcError.message);
      setRecommended((data || []) as Partner[]);
    } catch (err) {
      console.error('Empfehlungen laden fehlgeschlagen:', err);
    }
  }, [user]);

  const loadRecent = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: rpcError } = await supabase.rpc('get_recent_partners', {
        p_user_id: user.id,
        lim: 6,
      });

      if (rpcError) throw new Error(rpcError.message);
      setRecent((data || []) as Partner[]);
    } catch (err) {
      console.error('Letzte Partner laden fehlgeschlagen:', err);
    }
  }, [user]);

  const setFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPartners([]);
    setTotalCount(0);
    setOffset(0);
  }, []);

  // Initial load: recommended + recent
  useEffect(() => {
    if (user) {
      loadRecommended();
      loadRecent();
    }
  }, [user, loadRecommended, loadRecent]);

  return {
    partners,
    totalCount,
    isLoading,
    error,
    search,
    loadMore,
    hasMore: partners.length < totalCount,
    recommended,
    loadRecommended,
    recent,
    loadRecent,
    filters,
    setFilters,
    resetFilters,
  };
}
