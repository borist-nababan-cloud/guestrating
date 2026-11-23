import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { EntryCard } from './components/EntryCard';
import { Header } from './components/Header';
import { QrScannerModal } from './components/QrScannerModal';
import { RatingForm } from './components/RatingForm';
import { StatusScreen } from './components/StatusScreen';
import { clearOAuthDraft, loadOAuthDraft, saveOAuthDraft } from './lib/draftStorage';
import { TEXTS } from './lib/i18n';
import { supabase } from './lib/supabaseClient';
import { extractRatingCode } from './lib/validation';
import { fetchGuestRatingSession } from './services/ratingService';
import type {
  GuestRatingSession,
  Language,
  RatingFormValues,
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

  // Google OAuth & draft restoration state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [restoredDraft, setRestoredDraft] = useState<RatingFormValues | null>(null);

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

  // Subscribe to Supabase Auth session for Google OAuth autofill
  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setAuthUser(data.session?.user ?? null);
        }
      })
      .catch(() => {
        // Ignore silent session lookup error; guest can still fill manually
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setAuthUser(nextSession?.user ?? null);
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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

    if (rawCode) {
      const extracted = extractRatingCode(rawCode);
      if (!extracted) {
        setViewState('not_found');
        return;
      }
      void loadSession(extracted, false);
      return;
    }

    // Check if returning from Google OAuth redirect with a saved form draft
    const savedDraft = loadOAuthDraft();
    if (savedDraft) {
      clearOAuthDraft();
      setRestoredDraft(savedDraft.values);
      // Avoid overwriting ?code= while Supabase PKCE exchanges the OAuth code
      const isPkceCallback = params.has('code');
      void loadSession(savedDraft.ratingcode, !isPkceCallback);
      if (isPkceCallback) {
        void supabase.auth.getSession().finally(() => {
          const cleanUrl = `${window.location.pathname}?ratingcode=${encodeURIComponent(savedDraft.ratingcode)}`;
          window.history.replaceState({}, '', cleanUrl);
        });
      }
      return;
    }

    setViewState('entry');
  }, [loadSession]);

  const handleGoogleSignIn = useCallback(
    async (draftValues: RatingFormValues) => {
      if (!activeCode) return;
      setAuthLoading(true);
      setAuthError(null);
      saveOAuthDraft(activeCode, draftValues);

      try {
        const redirectUrl =
          window.location.origin.replace(/\/$/, '') +
          (window.location.pathname || '/');

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
          },
        });

        if (error) {
          clearOAuthDraft();
          setAuthError(TEXTS[lang].googleError);
          setAuthLoading(false);
        }
      } catch {
        clearOAuthDraft();
        setAuthError(TEXTS[lang].googleError);
        setAuthLoading(false);
      }
    },
    [activeCode, lang]
  );

  const handleGoogleSignOut = useCallback(async () => {
    setAuthError(null);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore sign-out errors
    }
    setAuthUser(null);
  }, []);

  const handleResetToEntry = () => {
    requestIdRef.current += 1;
    clearOAuthDraft();
    window.history.pushState({}, '', window.location.pathname);
    setActiveCode(null);
    setSession(null);
    setSubmitResult(null);
    setRestoredDraft(null);
    setFetchError(null);
    setAuthError(null);
    setViewState('entry');
  };

  const handleScanSuccess = useCallback(
    (code: string) => {
      clearOAuthDraft();
      setRestoredDraft(null);
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
            onSelectCode={(code) => {
              clearOAuthDraft();
              setRestoredDraft(null);
              void loadSession(code, true);
            }}
          />
        )}

        {viewState === 'form' && session && (
          <RatingForm
            key={session.ratingcode}
            session={session}
            lang={lang}
            authUser={authUser}
            authLoading={authLoading}
            authError={authError}
            initialDraft={restoredDraft}
            onGoogleSignIn={(draft) => void handleGoogleSignIn(draft)}
            onGoogleSignOut={() => void handleGoogleSignOut()}
            onRescan={() => setScannerOpen(true)}
            onSubmitted={(result) => {
              clearOAuthDraft();
              setRestoredDraft(null);
              setSubmitResult(result);
              setViewState('submitted');
              // Clear local OAuth token on this origin for shared-device safety
              if (authUser) {
                void supabase.auth.signOut({ scope: 'local' });
                setAuthUser(null);
              }
            }}
            onAlreadySubmitted={() => {
              clearOAuthDraft();
              setRestoredDraft(null);
              setViewState('already_submitted');
            }}
            onNotFound={() => {
              clearOAuthDraft();
              setRestoredDraft(null);
              setViewState('not_found');
            }}
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
