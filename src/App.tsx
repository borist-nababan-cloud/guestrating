import { useCallback, useEffect, useRef, useState } from 'react';
import { EntryCard } from './components/EntryCard';
import { Header } from './components/Header';
import { QrScannerModal } from './components/QrScannerModal';
import { RatingForm } from './components/RatingForm';
import { StatusScreen } from './components/StatusScreen';
import { TEXTS } from './lib/i18n';
import { extractRatingCode } from './lib/validation';
import { fetchGuestRatingSession } from './services/ratingService';
import type {
  GuestRatingSession,
  Language,
  SubmitRatingSuccess,
} from './types/rating';

type ViewState =
  | 'entry'
  | 'loading'
  | 'form'
  | 'submitted'
  | 'already_submitted'
  | 'not_found';

const LANG_STORAGE_KEY = 'zen_guestrate_lang';

function resolveInitialLanguage(): Language {
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

function resolveWebsiteUrl(): string {
  const raw = import.meta.env.VITE_WEBSITE_URL?.trim();
  if (!raw) return 'https://zenfamilyspa.com';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString().replace(/\/$/, '')
      : 'https://zenfamilyspa.com';
  } catch {
    return 'https://zenfamilyspa.com';
  }
}

export function App() {
  const [lang, setLang] = useState<Language>(resolveInitialLanguage);
  const [viewState, setViewState] = useState<ViewState>('entry');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [session, setSession] = useState<GuestRatingSession | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitRatingSuccess | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const requestIdRef = useRef(0);
  const websiteUrl = resolveWebsiteUrl();
  const t = TEXTS[lang];

  const handleLanguageChange = (nextLang: Language) => {
    setLang(nextLang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // Ignore storage access restrictions
    }
  };

  const loadSession = useCallback(async (code: string, updateHistory: boolean) => {
    const requestId = ++requestIdRef.current;
    setActiveCode(code);
    setSession(null);
    setSubmitResult(null);
    setFetchError(null);
    setViewState('loading');

    if (updateHistory) {
      const targetUrl = `${window.location.pathname}?ratingcode=${encodeURIComponent(code)}`;
      window.history.pushState({}, '', targetUrl);
    }

    try {
      const res = await fetchGuestRatingSession(code);
      if (requestId !== requestIdRef.current) return;

      if (!res.found) {
        setViewState('not_found');
        return;
      }

      setSession(res);
      setViewState(res.already_submitted ? 'already_submitted' : 'form');
    } catch {
      if (requestId !== requestIdRef.current) return;
      setFetchError(TEXTS[resolveInitialLanguage()].errorGeneric);
      setViewState('not_found');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawCode = params.get('ratingcode');
    if (!rawCode) {
      setViewState('entry');
      return;
    }

    const extracted = extractRatingCode(rawCode);
    if (!extracted) {
      setViewState('not_found');
      return;
    }

    void loadSession(extracted, false);
  }, [loadSession]);

  const handleResetToEntry = () => {
    requestIdRef.current += 1;
    window.history.pushState({}, '', window.location.pathname);
    setActiveCode(null);
    setSession(null);
    setSubmitResult(null);
    setFetchError(null);
    setViewState('entry');
  };

  const handleScanSuccess = useCallback(
    (code: string) => {
      setScannerOpen(false);
      void loadSession(code, true);
    },
    [loadSession]
  );

  return (
    <div className="min-h-screen bg-zen-linen text-zen-charcoal flex flex-col">
      <Header lang={lang} onChangeLang={handleLanguageChange} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {viewState === 'loading' && (
          <div className="bg-white rounded-3xl border border-zen-border shadow-sm p-12 text-center animate-fade-slide-up">
            <div className="w-10 h-10 border-2 border-zen-border border-t-zen-matcha rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-zen-muted">{t.loadingSession}</p>
          </div>
        )}

        {viewState === 'entry' && (
          <EntryCard
            lang={lang}
            websiteUrl={websiteUrl}
            onOpenScanner={() => setScannerOpen(true)}
            onSelectCode={(code) => void loadSession(code, true)}
          />
        )}

        {viewState === 'form' && session && (
          <RatingForm
            key={session.ratingcode}
            session={session}
            lang={lang}
            onRescan={() => setScannerOpen(true)}
            onSubmitted={(result) => {
              setSubmitResult(result);
              setViewState('submitted');
            }}
            onAlreadySubmitted={() => setViewState('already_submitted')}
            onNotFound={() => setViewState('not_found')}
          />
        )}

        {(viewState === 'submitted' ||
          viewState === 'already_submitted' ||
          viewState === 'not_found') && (
          <div className="space-y-4">
            {fetchError && viewState === 'not_found' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center">
                {t.errorGeneric}
              </div>
            )}
            <StatusScreen
              mode={viewState}
              lang={lang}
              websiteUrl={websiteUrl}
              avgRate={submitResult?.avg_rate}
              outlet={session?.outlet}
              hasActiveCode={Boolean(activeCode)}
              onRetry={() => {
                if (activeCode) void loadSession(activeCode, false);
              }}
              onScanAnother={() => {
                handleResetToEntry();
                setScannerOpen(true);
              }}
            />
          </div>
        )}
      </main>

      <footer className="py-5 px-4 text-center text-[11px] text-zen-muted border-t border-zen-border/60 bg-white/50">
        {t.privacyNote}
      </footer>

      <QrScannerModal
        isOpen={scannerOpen}
        lang={lang}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}

export default App;
