import React, { useState } from 'react';
import { Camera, ExternalLink, QrCode, Sparkles } from 'lucide-react';
import { TEXTS } from '../lib/i18n';
import { extractRatingCode } from '../lib/validation';
import type { Language } from '../types/rating';

interface EntryCardProps {
  lang: Language;
  websiteUrl: string;
  onOpenScanner: () => void;
  onSelectCode: (code: string) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  lang,
  websiteUrl,
  onOpenScanner,
  onSelectCode,
}) => {
  const t = TEXTS[lang];
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extracted = extractRatingCode(manualInput);
    if (!extracted) {
      setManualError(t.invalidManualCode);
      return;
    }
    setManualError(null);
    onSelectCode(extracted);
  };

  return (
    <div className="bg-white rounded-3xl border border-zen-border shadow-sm p-6 sm:p-10 text-center animate-fade-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-zen-linen border border-zen-border text-zen-matcha flex items-center justify-center mx-auto mb-5">
        <Sparkles className="w-8 h-8" />
      </div>

      <h2 className="font-serif text-2xl sm:text-3xl text-zen-charcoal mb-3">
        {t.entryTitle}
      </h2>
      <p className="text-sm sm:text-base text-zen-muted max-w-lg mx-auto leading-relaxed mb-8">
        {t.entryDesc}
      </p>

      <button
        type="button"
        onClick={onOpenScanner}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-zen-matcha hover:bg-zen-moss text-white font-semibold text-sm px-8 py-3.5 rounded-full shadow-md hover:shadow-lg transition active:scale-[0.98]"
      >
        <Camera className="w-5 h-5" />
        <span>{t.scanQrBtn}</span>
      </button>

      <div className="my-8 flex items-center gap-3">
        <div className="flex-1 h-px bg-zen-border" />
        <span className="text-xs text-zen-muted font-medium">{t.orManual}</span>
        <div className="flex-1 h-px bg-zen-border" />
      </div>

      <form onSubmit={handleManualSubmit} className="max-w-md mx-auto space-y-3 text-left">
        <div className="relative">
          <QrCode className="w-4 h-4 text-zen-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value);
              if (manualError) setManualError(null);
            }}
            placeholder={t.manualPlaceholder}
            aria-label={t.orManual}
            maxLength={256}
            className={`w-full pl-10 pr-4 py-3 text-sm rounded-xl border bg-zen-linen/50 text-zen-charcoal placeholder:text-zen-muted/60 focus:outline-none focus:ring-2 focus:ring-zen-matcha/40 focus:border-zen-matcha transition ${
              manualError ? 'border-red-400' : 'border-zen-border'
            }`}
          />
        </div>
        {manualError && (
          <p className="text-xs text-red-600 font-medium">{manualError}</p>
        )}
        <button
          type="submit"
          className="w-full py-3 rounded-xl border border-zen-sand bg-zen-linen hover:bg-zen-cream text-zen-charcoal text-sm font-semibold transition"
        >
          {t.manualSubmit}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-zen-border/70">
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zen-matcha hover:text-zen-moss transition"
        >
          <span>{t.visitWebsite}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
