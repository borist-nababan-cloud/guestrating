import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  QrCode,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { TEXTS } from '../lib/i18n';
import type { Language, OutletLocation, RatingOutletInfo } from '../types/rating';

interface StatusScreenProps {
  mode: 'submitted' | 'already_submitted' | 'not_found';
  lang: Language;
  websiteUrl: string;
  avgRate?: number;
  outlet?: RatingOutletInfo | null;
  hasActiveCode: boolean;
  onRetry: () => void;
  onScanAnother: () => void;
}

function resolveGoogleMapsSearchUrl(outlet?: RatingOutletInfo | null): string | null {
  if (!outlet?.location) return null;

  let locObj: OutletLocation | null = null;
  if (typeof outlet.location === 'string') {
    try {
      locObj = JSON.parse(outlet.location) as OutletLocation;
    } catch {
      return null;
    }
  } else if (typeof outlet.location === 'object') {
    locObj = outlet.location;
  }

  if (!locObj) return null;
  const lat = Number(locObj.lat ?? locObj.latitude);
  const lng = Number(locObj.lng ?? locObj.longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export const StatusScreen: React.FC<StatusScreenProps> = ({
  mode,
  lang,
  websiteUrl,
  avgRate,
  outlet,
  hasActiveCode,
  onRetry,
  onScanAnother,
}) => {
  const t = TEXTS[lang];
  const mapsUrl =
    mode === 'submitted' && typeof avgRate === 'number' && avgRate >= 4
      ? resolveGoogleMapsSearchUrl(outlet)
      : null;

  const iconConfig = {
    submitted: {
      Icon: CheckCircle2,
      wrapper: 'bg-zen-matcha/15 border-zen-matcha/30 text-zen-moss',
      title: t.statusSubmittedTitle,
      desc: t.statusSubmittedDesc,
    },
    already_submitted: {
      Icon: ShieldCheck,
      wrapper: 'bg-amber-50 border-amber-200 text-amber-600',
      title: t.statusAlreadyTitle,
      desc: t.statusAlreadyDesc,
    },
    not_found: {
      Icon: AlertCircle,
      wrapper: 'bg-red-50 border-red-200 text-red-600',
      title: t.statusNotFoundTitle,
      desc: t.statusNotFoundDesc,
    },
  }[mode];

  const StatusIcon = iconConfig.Icon;

  return (
    <div className="bg-white rounded-3xl border border-zen-border shadow-sm p-7 sm:p-10 text-center animate-fade-slide-up">
      <div
        className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-5 ${iconConfig.wrapper}`}
      >
        <StatusIcon className="w-8 h-8" />
      </div>

      <h2 className="font-serif text-2xl sm:text-3xl text-zen-charcoal mb-3">
        {iconConfig.title}
      </h2>
      <p className="text-sm sm:text-base text-zen-muted max-w-md mx-auto leading-relaxed mb-6">
        {iconConfig.desc}
      </p>

      {mode === 'submitted' && typeof avgRate === 'number' && (
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zen-linen border border-zen-border text-sm mb-6">
          <span className="text-zen-muted">{t.statusAvgLabel}:</span>
          <strong className="font-serif text-lg text-zen-moss">
            {avgRate.toFixed(1)} / 5.0
          </strong>
        </div>
      )}

      {mapsUrl && (
        <div className="mb-6 p-5 rounded-2xl bg-zen-linen/80 border border-zen-border max-w-md mx-auto">
          <p className="text-xs sm:text-sm text-zen-charcoal leading-relaxed mb-3">
            {t.statusHighScoreTip}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-zen-sand hover:border-zen-matcha text-xs font-semibold text-zen-charcoal transition shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-zen-matcha" />
            <span>{t.statusOpenMaps}</span>
            <ExternalLink className="w-3 h-3 text-zen-muted" />
          </a>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {mode === 'not_found' && hasActiveCode && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zen-matcha hover:bg-zen-moss text-white text-sm font-semibold px-6 py-3 rounded-full transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.statusRetryBtn}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onScanAnother}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-zen-sand bg-zen-linen hover:bg-zen-cream text-zen-charcoal text-sm font-semibold px-6 py-3 rounded-full transition"
        >
          <QrCode className="w-4 h-4 text-zen-matcha" />
          <span>{t.statusScanAnotherBtn}</span>
        </button>
      </div>

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
