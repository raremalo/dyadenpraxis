import React, { useState } from 'react';
import { DYAD_CATEGORIES } from '../data/dyadQuestions';
import { useSettings } from '../contexts/SettingsContext';
import { Shuffle, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [expanded, setExpanded] = useState(false);

  const selectedCat = DYAD_CATEGORIES.find(c => c.key === selectedCategory);

  const handleCategorySelect = (key: string | null) => {
    onSelect(key);
    setExpanded(false);
  };

  const chipBase = 'inline-flex items-center px-3 py-1.5 rounded-full text-sm transition-all duration-200 border whitespace-nowrap';
  const chipActive = 'bg-[var(--c-accent)]/10 border-[var(--c-accent)] text-[var(--c-accent)]';
  const chipInactive = 'bg-transparent border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-text-muted)] hover:text-[var(--c-text-main)]';

  return (
    <div className="space-y-3">
      {/* Compact row: Zufaellig + active category + expand toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleCategorySelect(null)}
          className={`${chipBase} gap-1.5 font-medium ${
            selectedCategory === null ? chipActive : chipInactive
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{t.home.random}</span>
        </button>

        {selectedCat && (
          <button
            onClick={() => handleCategorySelect(selectedCat.key)}
            className={`${chipBase} font-medium ${chipActive}`}
          >
            {selectedCat.name}
          </button>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--c-text-muted)] hover:text-[var(--c-text-main)] transition-colors"
          aria-expanded={expanded}
        >
          <span>{expanded ? (t.home.lessCategories || 'Weniger') : (t.home.moreCategories || 'Kategorien')}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded category list */}
      {expanded && (
        <div className="flex flex-wrap gap-1.5 pt-1 animate-[fadeIn_200ms_ease-out]">
          {DYAD_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategorySelect(cat.key)}
              className={`${chipBase} text-xs ${
                selectedCategory === cat.key ? chipActive : chipInactive
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

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
