import type { RatingFormValues } from '../types/rating';
import { RATING_CODE_REGEX } from './validation';

const DRAFT_STORAGE_KEY = 'zen_guestrate_oauth_draft';
const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface StoredRatingDraft {
  ratingcode: string;
  values: RatingFormValues;
  savedAt: number;
}

export function saveOAuthDraft(ratingcode: string, values: RatingFormValues): void {
  try {
    const payload: StoredRatingDraft = {
      ratingcode,
      values: { ...values, as_anonim: false },
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export function loadOAuthDraft(): StoredRatingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredRatingDraft>;
    if (
      !parsed ||
      typeof parsed.ratingcode !== 'string' ||
      !RATING_CODE_REGEX.test(parsed.ratingcode) ||
      !parsed.values ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS
    ) {
      clearOAuthDraft();
      return null;
    }

    return parsed as StoredRatingDraft;
  } catch {
    clearOAuthDraft();
    return null;
  }
}

export function clearOAuthDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage access restrictions
  }
}
