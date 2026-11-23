import React from 'react';
import { Check } from 'lucide-react';

interface QuickTagPickerProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export const QuickTagPicker: React.FC<QuickTagPickerProps> = ({
  label,
  options,
  selected,
  onToggle,
}) => {
  if (options.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-zen-border/60">
      <p className="text-xs font-semibold text-zen-muted mb-2.5 text-center sm:text-left">
        {label}
      </p>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {options.map((tag) => {
          const isSelected = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                isSelected
                  ? 'bg-zen-matcha text-white border-zen-matcha shadow-sm'
                  : 'bg-white text-zen-charcoal border-zen-border hover:border-zen-sand hover:bg-zen-linen'
              }`}
            >
              {isSelected && <Check className="w-3 h-3" />}
              <span>{tag}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
