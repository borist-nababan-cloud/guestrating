import type { Language } from '../types/rating';
import { TEXTS } from './i18n';

export function mapRatingError(code: string | undefined, lang: Language): string {
  const t = TEXTS[lang];
  switch (code) {
    case 'INVALID_CODE':
      return t.invalidManualCode;
    case 'NOT_FOUND':
      return t.statusNotFoundDesc;
    case 'ALREADY_SUBMITTED':
      return t.statusAlreadyDesc;
    case 'INVALID_RATING':
      return t.fixErrorsHeading;
    case 'INVALID_NAME':
      return t.errGuestName;
    case 'INVALID_EMAIL':
      return t.errGuestEmail;
    default:
      return t.errorGeneric;
  }
}
