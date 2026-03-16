import React from 'react';
import { DYAD_CATEGORIES } from '../data/dyadQuestions';
import { Shuffle } from 'lucide-react';

interface CategoryPickerProps {
  selectedCategory: string | null; // null = random/all
  onSelect: (categoryKey: string | null) => void;
  showAiToggle?: boolean;
  useAi?: boolean;
  onToggleAi?: (useAi: boolean) => void;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategory,
  onSelect,
  showAiToggle = false,
  useAi = true,
  onToggleAi,
}) => {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--c-text-muted)] mb-2">
        Kategorie
      </p>

      {/* Category Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {/* Random / All button */}
        <button
          onClick={() => onSelect(null)}
          className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl text-xs font-medium min-h-[56px] transition-all duration-200 border ${
            selectedCategory === null
              ? 'bg-[var(--c-accent)]/10 border-[var(--c-accent)] text-[var(--c-accent)]'
              : 'bg-[var(--c-bg-card)]/50 border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)]/40 hover:text-[var(--c-text-main)]'
          }`}
        >
          <Shuffle className="w-4 h-4 flex-shrink-0" />
          <span className="leading-tight text-center">Zufällig</span>
        </button>

        {/* Category buttons */}
        {DYAD_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl text-xs font-medium min-h-[56px] transition-all duration-200 border ${
              selectedCategory === cat.key
                ? 'bg-[var(--c-accent)]/10 border-[var(--c-accent)] text-[var(--c-accent)]'
                : 'bg-[var(--c-bg-card)]/50 border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)]/40 hover:text-[var(--c-text-main)]'
            }`}
          >
            <span className="text-base leading-none">{cat.icon}</span>
            <span className="leading-tight text-center line-clamp-2">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* AI Toggle */}
      {showAiToggle && onToggleAi && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-[var(--c-text-muted)]">
            {useAi ? 'KI-generierte Frage' : 'Bewährte Frage'}
          </span>
          <button
            onClick={() => onToggleAi(!useAi)}
            role="switch"
            aria-checked={useAi}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              useAi ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-border)]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                useAi ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryPicker;
