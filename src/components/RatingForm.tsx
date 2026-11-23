import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Home,
  MapPin,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { getQuickTags, TEXTS } from '../lib/i18n';
import { mapRatingError } from '../lib/errorShield';
import { ratingFormSchema } from '../lib/validation';
import { submitGuestRating } from '../services/ratingService';
import type {
  GuestRatingSession,
  Language,
  RatingFormValues,
  SubmitRatingSuccess,
} from '../types/rating';
import { QuickTagPicker } from './QuickTagPicker';
import { SmileRatingSelector } from './SmileRatingSelector';

interface RatingFormProps {
  session: GuestRatingSession;
  lang: Language;
  onRescan: () => void;
  onSubmitted: (result: SubmitRatingSuccess) => void;
  onAlreadySubmitted: () => void;
  onNotFound: () => void;
}

const INITIAL_VALUES: RatingFormValues = {
  outlet_rate: 0,
  outlet_tags: [],
  outlet_notes: '',
  tr_rate: 0,
  tr_tags: [],
  tr_notes: '',
  room_rate: 0,
  room_tags: [],
  room_notes: '',
  as_anonim: true,
  guest_name: '',
  guest_email: '',
};

export const RatingForm: React.FC<RatingFormProps> = ({
  session,
  lang,
  onRescan,
  onSubmitted,
  onAlreadySubmitted,
  onNotFound,
}) => {
  const t = TEXTS[lang];
  const [values, setValues] = useState<RatingFormValues>(INITIAL_VALUES);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const submittingRef = useRef(false);

  const formatVisitDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      const parsed = new Date(`${dateStr}T00:00:00+07:00`);
      if (Number.isNaN(parsed.getTime())) return dateStr;
      return parsed.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getDeptLabel = (dept?: string | null): string | null => {
    if (!dept) return null;
    const upper = dept.trim().toUpperCase();
    if (upper === 'TR') return t.deptTR;
    if (upper === 'TB') return t.deptTB;
    return dept;
  };

  const updateScore = (
    field: 'outlet_rate' | 'tr_rate' | 'room_rate',
    tagsField: 'outlet_tags' | 'tr_tags' | 'room_tags',
    dimension: 'outlet' | 'therapist' | 'room',
    nextScore: number
  ) => {
    const validBucketTags = getQuickTags(lang, dimension, nextScore);
    setValues((prev) => ({
      ...prev,
      [field]: nextScore,
      [tagsField]: prev[tagsField].filter((tag) => validBucketTags.includes(tag)),
    }));
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggleTag = (tagsField: 'outlet_tags' | 'tr_tags' | 'room_tags', tag: string) => {
    setValues((prev) => {
      const current = prev[tagsField];
      if (current.includes(tag)) {
        return { ...prev, [tagsField]: current.filter((item) => item !== tag) };
      }
      if (current.length >= 5) return prev;
      return { ...prev, [tagsField]: [...current, tag] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const parsed = ratingFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key === 'outlet_rate') nextErrors.outlet_rate = t.errOutletRate;
        else if (key === 'tr_rate') nextErrors.tr_rate = t.errTrRate;
        else if (key === 'room_rate') nextErrors.room_rate = t.errRoomRate;
        else if (key === 'guest_name') nextErrors.guest_name = t.errGuestName;
        else if (key === 'guest_email') nextErrors.guest_email = t.errGuestEmail;
      }
      setValidationErrors(nextErrors);
      return;
    }

    setValidationErrors({});
    setSubmitError(null);
    setSubmitting(true);
    submittingRef.current = true;

    try {
      const result = await submitGuestRating({
        ratingcode: session.ratingcode,
        language: lang,
        ...parsed.data,
      });

      if (result.success) {
        onSubmitted(result);
        return;
      }

      if (result.code === 'ALREADY_SUBMITTED') {
        onAlreadySubmitted();
        return;
      }

      if (result.code === 'NOT_FOUND' || result.code === 'INVALID_CODE') {
        onNotFound();
        return;
      }

      setSubmitError(mapRatingError(result.code, lang));
    } catch {
      setSubmitError(t.errorGeneric);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const outletTags = getQuickTags(lang, 'outlet', values.outlet_rate);
  const therapistTags = getQuickTags(lang, 'therapist', values.tr_rate);
  const roomTags = getQuickTags(lang, 'room', values.room_rate);

  const therapistInitial = session.therapist?.name
    ? session.therapist.name.trim().charAt(0).toUpperCase()
    : 'T';
  const deptLabel = getDeptLabel(session.therapist?.departemen);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-slide-up" noValidate>
      {/* Session Summary Card */}
      <section className="bg-white rounded-3xl border border-zen-border shadow-sm p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zen-matcha">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{session.outlet.city || 'Zen Family Spa'}</span>
            </div>
            <h2 className="font-serif text-2xl text-zen-charcoal leading-snug">
              {session.outlet.name_outlet}
            </h2>
            {session.outlet.alamat && (
              <p className="text-xs text-zen-muted line-clamp-2">{session.outlet.alamat}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onRescan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-zen-border bg-zen-linen hover:bg-zen-cream text-xs font-semibold text-zen-charcoal transition shrink-0"
          >
            <QrCode className="w-3.5 h-3.5 text-zen-matcha" />
            <span>{t.rescanBtn}</span>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-zen-border/60 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zen-muted">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zen-matcha" />
            <span>
              {t.visitDateLabel}:{' '}
              <strong className="text-zen-charcoal font-semibold">
                {formatVisitDate(session.tanggal)}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zen-matcha" />
            <span>
              {t.receiptCodeLabel}:{' '}
              <code className="font-mono text-[11px] bg-zen-linen px-2 py-0.5 rounded border border-zen-border text-zen-charcoal">
                {session.ratingcode}
              </code>
            </span>
          </div>
        </div>
      </section>

      {submitError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 1. Outlet Rating */}
      <section className="bg-white rounded-3xl border border-zen-border shadow-sm p-5 sm:p-7">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-zen-linen border border-zen-border text-zen-matcha flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg sm:text-xl text-zen-charcoal">
              {t.sectionOutletTitle}
            </h3>
            <p className="text-xs sm:text-sm text-zen-muted mt-0.5">{t.sectionOutletSub}</p>
          </div>
        </div>

        <SmileRatingSelector
          value={values.outlet_rate}
          onChange={(score) => updateScore('outlet_rate', 'outlet_tags', 'outlet', score)}
          lang={lang}
          error={validationErrors.outlet_rate}
        />

        <QuickTagPicker
          label={values.outlet_rate >= 4 ? t.quickTagsPositive : t.quickTagsImprove}
          options={outletTags}
          selected={values.outlet_tags}
          onToggle={(tag) => toggleTag('outlet_tags', tag)}
        />

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zen-muted" htmlFor="outlet_notes">
              {t.optionalNotesLabel}
            </label>
            <span className="text-[11px] text-zen-muted">
              {values.outlet_notes.length}/1000 {t.charCountSuffix}
            </span>
          </div>
          <textarea
            id="outlet_notes"
            rows={2}
            maxLength={1000}
            value={values.outlet_notes}
            onChange={(e) => setValues((prev) => ({ ...prev, outlet_notes: e.target.value }))}
            placeholder={t.sectionOutletPlaceholder}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zen-border bg-zen-linen/40 text-zen-charcoal placeholder:text-zen-muted/60 focus:outline-none focus:ring-2 focus:ring-zen-matcha/35 focus:border-zen-matcha transition"
          />
        </div>
      </section>

      {/* 2. Therapist Rating */}
      <section className="bg-white rounded-3xl border border-zen-border shadow-sm p-5 sm:p-7">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-zen-linen border border-zen-border text-zen-matcha flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg sm:text-xl text-zen-charcoal">
              {t.sectionTherapistTitle}
            </h3>
            <p className="text-xs sm:text-sm text-zen-muted mt-0.5">{t.sectionTherapistSub}</p>
          </div>
        </div>

        {session.therapist ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-zen-linen/70 border border-zen-border flex items-center gap-3.5">
            {session.therapist.photo_url && !photoFailed ? (
              <img
                src={session.therapist.photo_url}
                alt={session.therapist.name}
                onError={() => setPhotoFailed(true)}
                className="w-14 h-14 rounded-full object-cover border-2 border-zen-matcha/40 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-zen-matcha text-white flex items-center justify-center font-serif text-xl font-bold shrink-0">
                {therapistInitial}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-serif text-base sm:text-lg font-semibold text-zen-charcoal truncate">
                {session.therapist.name}
              </p>
              {deptLabel && (
                <p className="text-xs font-medium text-zen-matcha truncate">{deptLabel}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-zen-linen border border-zen-border text-xs text-zen-muted">
            {t.sectionTherapistMissing}
          </div>
        )}

        <SmileRatingSelector
          value={values.tr_rate}
          onChange={(score) => updateScore('tr_rate', 'tr_tags', 'therapist', score)}
          lang={lang}
          error={validationErrors.tr_rate}
        />

        <QuickTagPicker
          label={values.tr_rate >= 4 ? t.quickTagsPositive : t.quickTagsImprove}
          options={therapistTags}
          selected={values.tr_tags}
          onToggle={(tag) => toggleTag('tr_tags', tag)}
        />

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zen-muted" htmlFor="tr_notes">
              {t.optionalNotesLabel}
            </label>
            <span className="text-[11px] text-zen-muted">
              {values.tr_notes.length}/1000 {t.charCountSuffix}
            </span>
          </div>
          <textarea
            id="tr_notes"
            rows={2}
            maxLength={1000}
            value={values.tr_notes}
            onChange={(e) => setValues((prev) => ({ ...prev, tr_notes: e.target.value }))}
            placeholder={t.sectionTherapistPlaceholder}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zen-border bg-zen-linen/40 text-zen-charcoal placeholder:text-zen-muted/60 focus:outline-none focus:ring-2 focus:ring-zen-matcha/35 focus:border-zen-matcha transition"
          />
        </div>
      </section>

      {/* 3. Room Rating */}
      <section className="bg-white rounded-3xl border border-zen-border shadow-sm p-5 sm:p-7">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-zen-linen border border-zen-border text-zen-matcha flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg sm:text-xl text-zen-charcoal">
              {t.sectionRoomTitle}
            </h3>
            <p className="text-xs sm:text-sm text-zen-muted mt-0.5">{t.sectionRoomSub}</p>
          </div>
        </div>

        {session.room ? (
          <div className="mb-5 px-4 py-3 rounded-2xl bg-zen-linen/70 border border-zen-border flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-zen-charcoal">
              {t.roomPrefix} {session.room.room_id}
            </span>
            {session.room.jenis_jasa && (
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-zen-border text-zen-muted">
                {session.room.jenis_jasa}
              </span>
            )}
            {session.room.room_gender && (
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-zen-border text-zen-muted">
                {session.room.room_gender}
              </span>
            )}
            {session.room.keterangan && (
              <span className="text-zen-muted">• {session.room.keterangan}</span>
            )}
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-zen-linen border border-zen-border text-xs text-zen-muted">
            {t.sectionRoomMissing}
          </div>
        )}

        <SmileRatingSelector
          value={values.room_rate}
          onChange={(score) => updateScore('room_rate', 'room_tags', 'room', score)}
          lang={lang}
          error={validationErrors.room_rate}
        />

        <QuickTagPicker
          label={values.room_rate >= 4 ? t.quickTagsPositive : t.quickTagsImprove}
          options={roomTags}
          selected={values.room_tags}
          onToggle={(tag) => toggleTag('room_tags', tag)}
        />

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zen-muted" htmlFor="room_notes">
              {t.optionalNotesLabel}
            </label>
            <span className="text-[11px] text-zen-muted">
              {values.room_notes.length}/1000 {t.charCountSuffix}
            </span>
          </div>
          <textarea
            id="room_notes"
            rows={2}
            maxLength={1000}
            value={values.room_notes}
            onChange={(e) => setValues((prev) => ({ ...prev, room_notes: e.target.value }))}
            placeholder={t.sectionRoomPlaceholder}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zen-border bg-zen-linen/40 text-zen-charcoal placeholder:text-zen-muted/60 focus:outline-none focus:ring-2 focus:ring-zen-matcha/35 focus:border-zen-matcha transition"
          />
        </div>
      </section>

      {/* 4. Privacy / Anonymous Option */}
      <section className="bg-white rounded-3xl border border-zen-border shadow-sm p-5 sm:p-7">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.as_anonim}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, as_anonim: e.target.checked }))
            }
            className="mt-1 h-4 w-4 rounded border-zen-sand text-zen-matcha focus:ring-zen-matcha"
          />
          <div>
            <span className="text-sm font-semibold text-zen-charcoal flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-zen-matcha" />
              <span>{t.anonTitle}</span>
            </span>
            <span className="block text-xs text-zen-muted mt-0.5 leading-relaxed">
              {t.anonDesc}
            </span>
          </div>
        </label>

        {!values.as_anonim && (
          <div className="mt-5 pt-5 border-t border-zen-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zen-charcoal mb-1.5" htmlFor="guest_name">
                {t.nameLabel} <span className="text-red-500">*</span>
              </label>
              <input
                id="guest_name"
                type="text"
                maxLength={120}
                value={values.guest_name}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, guest_name: e.target.value }));
                  setValidationErrors((prev) => {
                    if (!prev.guest_name) return prev;
                    const next = { ...prev };
                    delete next.guest_name;
                    return next;
                  });
                }}
                placeholder={t.namePlaceholder}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-zen-linen/40 text-zen-charcoal focus:outline-none focus:ring-2 focus:ring-zen-matcha/35 focus:border-zen-matcha ${
                  validationErrors.guest_name ? 'border-red-400' : 'border-zen-border'
                }`}
              />
              {validationErrors.guest_name && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.guest_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zen-charcoal mb-1.5" htmlFor="guest_email">
                {t.emailLabel} <span className="text-red-500">*</span>
              </label>
              <input
                id="guest_email"
                type="email"
                maxLength={150}
                value={values.guest_email}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, guest_email: e.target.value }));
                  setValidationErrors((prev) => {
                    if (!prev.guest_email) return prev;
                    const next = { ...prev };
                    delete next.guest_email;
                    return next;
                  });
                }}
                placeholder={t.emailPlaceholder}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-zen-linen/40 text-zen-charcoal focus:outline-none focus:ring-2 focus:ring-zen-matcha/35 focus:border-zen-matcha ${
                  validationErrors.guest_email ? 'border-red-400' : 'border-zen-border'
                }`}
              />
              {validationErrors.guest_email && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.guest_email}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Validation Summary & Submit */}
      <div className="space-y-4 pb-4">
        {Object.keys(validationErrors).length > 0 && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
            <p className="font-semibold mb-1.5">{t.fixErrorsHeading}</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {Object.entries(validationErrors).map(([field, msg]) => (
                <li key={field}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-zen-matcha hover:bg-zen-moss text-white font-semibold text-sm sm:text-base py-4 px-8 rounded-full shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t.submittingBtn}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{t.submitBtn}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
