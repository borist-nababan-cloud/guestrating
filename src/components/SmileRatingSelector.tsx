import React from 'react';
import { Angry, Frown, Laugh, Meh, Smile } from 'lucide-react';
import { TEXTS } from '../lib/i18n';
import type { Language } from '../types/rating';

interface SmileRatingSelectorProps {
  value: number;
  onChange: (score: number) => void;
  lang: Language;
  error?: string;
}

const SMILE_META = [
  {
    score: 1,
    Icon: Angry,
    activeClass: 'text-red-500 bg-red-50 border-red-300 ring-2 ring-red-200',
  },
  {
    score: 2,
    Icon: Frown,
    activeClass: 'text-amber-500 bg-amber-50 border-amber-300 ring-2 ring-amber-200',
  },
  {
    score: 3,
    Icon: Meh,
    activeClass: 'text-yellow-600 bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200',
  },
  {
    score: 4,
    Icon: Smile,
    activeClass: 'text-zen-matcha bg-zen-matcha/10 border-zen-matcha ring-2 ring-zen-matcha/25',
  },
  {
    score: 5,
    Icon: Laugh,
    activeClass: 'text-zen-moss bg-zen-matcha/20 border-zen-moss ring-2 ring-zen-matcha/35',
  },
] as const;

export const SmileRatingSelector: React.FC<SmileRatingSelectorProps> = ({
  value,
  onChange,
  lang,
  error,
}) => {
  const labels = TEXTS[lang].smiles;
  const activeLabel = labels.find((s) => s.score === value)?.label;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {SMILE_META.map(({ score, Icon, activeClass }) => {
          const isSelected = value === score;
          const label = labels[score - 1]?.label ?? String(score);
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              aria-label={`${label} (${score}/5)`}
              aria-pressed={isSelected}
              title={label}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center transition-all duration-150 ${
                isSelected
                  ? `${activeClass} scale-105 shadow-sm`
                  : 'border-zen-border bg-white text-neutral-400 hover:text-zen-charcoal hover:border-zen-sand hover:bg-zen-linen/60'
              }`}
            >
              <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          );
        })}
      </div>

      {activeLabel && (
        <p className="text-center text-xs font-semibold text-zen-charcoal">
          {activeLabel} ({value}/5)
        </p>
      )}

      {error && (
        <p className="text-center text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
};
