import React from 'react';
import { TEXTS } from '../lib/i18n';
import type { Language } from '../types/rating';

interface HeaderProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({ lang, onChangeLang }) => {
  const t = TEXTS[lang];
  const isStaging = import.meta.env.VITE_APP_MODE?.trim().toUpperCase() === 'STAG';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zen-border">
      {isStaging && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-[11px] font-semibold tracking-wider text-amber-800">
          {t.stagingBadge}
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo.png"
            alt={t.brandName}
            className="w-10 h-10 rounded-full object-contain border border-zen-border bg-zen-linen p-0.5 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="font-serif text-lg sm:text-xl text-zen-charcoal leading-tight truncate">
              {t.brandName}
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-zen-matcha font-semibold truncate">
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        <div
          className="inline-flex items-center rounded-full border border-zen-border bg-zen-linen p-0.5 shrink-0"
          role="group"
          aria-label="Language switcher"
        >
          <button
            type="button"
            onClick={() => onChangeLang('id')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              lang === 'id'
                ? 'bg-zen-matcha text-white shadow-sm'
                : 'text-zen-muted hover:text-zen-charcoal'
            }`}
          >
            ID
          </button>
          <button
            type="button"
            onClick={() => onChangeLang('en')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              lang === 'en'
                ? 'bg-zen-matcha text-white shadow-sm'
                : 'text-zen-muted hover:text-zen-charcoal'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};
