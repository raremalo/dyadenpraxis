import React, { useState, useEffect, useCallback } from 'react';
import { Search, Star, Filter, Loader2, Users, Clock } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { usePartnerSearch, Partner, TrustLevel } from '../hooks/usePartnerSearch';
import PartnerCard from './PartnerCard';

interface PartnerFinderProps {
  onQuickMatch: () => void;
  onSelectPartner?: (partner: Partner) => void;
  onMessage?: (partnerId: string) => void;
}

const PartnerFinder: React.FC<PartnerFinderProps> = ({
  onQuickMatch,
  onSelectPartner,
  onMessage,
}) => {
  const { t } = useSettings();
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const {
    partners,
    totalCount,
    isLoading,
    error,
    search,
    loadMore,
    hasMore,
    recommended,
    recent,
    filters,
    setFilters,
  } = usePartnerSearch();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput || filters.onlineOnly || filters.trustFilter) {
        search({ searchTerm: searchInput });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, search, filters.onlineOnly, filters.trustFilter]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    search({ searchTerm: searchInput });
  }, [search, searchInput]);

  const handleFilterChange = useCallback((key: keyof typeof filters, value: unknown) => {
    setFilters({ [key]: value });
  }, [setFilters]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  const showSearchResults = searchInput || partners.length > 0;

  return (
    <div
      className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto fade-in"
      onScroll={handleScroll}
    >
      <header className="mb-8">
        <h2 className="text-3xl font-serif text-[var(--c-text-main)] mb-2">{t.partner.title}</h2>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative mt-6">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t.partner.searchPlaceholder}
            className="w-full bg-[var(--c-bg-card)] border border-[var(--c-border)] rounded-2xl py-4 pl-12 pr-12 text-[var(--c-text-main)] placeholder-[var(--c-text-muted)] focus:outline-none focus:border-[var(--c-accent)] focus:ring-0 shadow-sm transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--c-text-muted)]" />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
              showFilters ? 'text-[var(--c-accent)]' : 'text-[var(--c-text-muted)]'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-[var(--c-bg-card)] rounded-2xl border border-[var(--c-border)] space-y-4">
            {/* Online Only */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.onlineOnly}
                onChange={(e) => handleFilterChange('onlineOnly', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
              />
              <span className="text-sm text-[var(--c-text-main)]">
                {t.partnerFilter?.onlineOnly || 'Nur Online'}
              </span>
            </label>

            {/* Trust Level */}
            <div>
              <span className="text-xs text-[var(--c-text-muted)] uppercase tracking-wide mb-2 block">
                {t.partnerFilter?.trustLevel || 'Vertrauensstufe'}
              </span>
              <div className="flex gap-2">
                {(['new', 'known', 'verified'] as TrustLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleFilterChange('trustFilter', filters.trustFilter === level ? null : level)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      filters.trustFilter === level
                        ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                        : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:bg-[var(--c-bg-card-hover)]'
                    }`}
                  >
                    {level === 'new' && (t.partnerFilter?.new || 'Neu')}
                    {level === 'known' && (t.partnerFilter?.known || 'Bekannt')}
                    {level === 'verified' && (t.partnerFilter?.verified || 'Verifiziert')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Quick Action */}
      <div className="mb-8">
        <button
          onClick={onQuickMatch}
          className="w-full bg-[var(--c-accent)] text-[var(--c-accent-fg)] p-5 rounded-2xl shadow-lg shadow-black/5 flex items-center justify-between group overflow-hidden relative"
        >
          <div className="relative z-10 text-left">
            <div className="font-serif text-xl mb-1">{t.partner.randomPartner}</div>
            <div className="text-[var(--c-accent-fg)] opacity-70 text-sm font-light">
              {t.partner.connectInstantly}
            </div>
          </div>
          <div className="relative z-10 p-2 bg-[var(--c-bg-app)]/20 rounded-full group-hover:scale-110 transition-transform">
            <Star className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Search Results */}
      {showSearchResults ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[var(--c-text-muted)] uppercase tracking-widest">
              {t.partnerSearch?.results || 'Suchergebnisse'}
            </h3>
            {totalCount > 0 && (
              <span className="text-xs text-[var(--c-text-muted)]">
                {totalCount} {t.partnerSearch?.found || 'gefunden'}
              </span>
            )}
          </div>

          {isLoading && partners.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[var(--c-accent)] animate-spin" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-12 text-[var(--c-text-muted)]">
              {t.partnerSearch?.noResults || 'Keine Partner gefunden'}
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  onSelect={onSelectPartner}
                  onMessage={onMessage}
                />
              ))}
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-[var(--c-accent)] animate-spin" />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Recommended Partners */}
          {recommended.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[var(--c-text-muted)]" />
                <h3 className="text-xs font-bold text-[var(--c-text-muted)] uppercase tracking-widest">
                  {t.partnerSearch?.recommended || 'Empfohlen'}
                </h3>
              </div>
              <div className="space-y-3">
                {recommended.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onSelect={onSelectPartner}
                    onMessage={onMessage}
                    showMatchReasons
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent Partners */}
          {recent.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[var(--c-text-muted)]" />
                <h3 className="text-xs font-bold text-[var(--c-text-muted)] uppercase tracking-widest">
                  {t.partnerSearch?.recent || 'Letzte Partner'}
                </h3>
              </div>
              <div className="space-y-3">
                {recent.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onSelect={onSelectPartner}
                    onMessage={onMessage}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active Community Fallback */}
          {recommended.length === 0 && recent.length === 0 && (
            <div className="text-center py-12 text-[var(--c-text-muted)]">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t.partnerSearch?.empty || 'Beginne eine Suche um Partner zu finden'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PartnerFinder;
