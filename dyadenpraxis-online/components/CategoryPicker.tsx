import React from 'react';
import { DYAD_CATEGORIES } from '../data/dyadQuestions';
import { useSettings } from '../contexts/SettingsContext';
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
  const { t } = useSettings();

  return (
    <div className="space-y-3">
      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        {/* Random / All chip */}
        <button
          onClick={() => onSelect(null)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
            selectedCategory === null
              ? 'bg-[var(--c-accent)]/10 border-[var(--c-accent)] text-[var(--c-accent)]'
              : 'bg-transparent border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{t.home.random}</span>
        </button>

        {/* Category chips */}
        {DYAD_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
              selectedCategory === cat.key
                ? 'bg-[var(--c-accent)]/10 border-[var(--c-accent)] text-[var(--c-accent)]'
                : 'bg-transparent border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* AI Toggle */}
      {showAiToggle && onToggleAi && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-[var(--c-text-muted)]">
            {useAi ? t.home.aiGenerated : t.home.curated}
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
