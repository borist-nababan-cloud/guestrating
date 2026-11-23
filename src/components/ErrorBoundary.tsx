import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { TEXTS } from '../lib/i18n';
import type { Language } from '../types/rating';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private getLanguage(): Language {
    try {
      return window.localStorage.getItem('zen_guestrate_lang') === 'en' ? 'en' : 'id';
    } catch {
      return 'id';
    }
  }

  render() {
    if (this.state.hasError) {
      const t = TEXTS[this.getLanguage()];
      return (
        <div className="min-h-screen bg-zen-linen flex items-center justify-center px-4 py-10">
          <div className="max-w-md w-full bg-white rounded-3xl border border-zen-border shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="font-serif text-2xl text-zen-charcoal mb-2">
              {t.errorBoundaryTitle}
            </h1>
            <p className="text-sm text-zen-muted mb-6 leading-relaxed">
              {t.errorBoundaryDesc}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 bg-zen-matcha hover:bg-zen-moss text-white text-sm font-semibold px-6 py-3 rounded-full transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.errorBoundaryReload}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
