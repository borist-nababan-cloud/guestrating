import { z } from 'zod';

export const RATING_CODE_REGEX = /^[A-Za-z0-9._-]{5,64}$/;

/**
 * Extract and validate a rating code from either a scanned URL (?ratingcode=...)
 * or a plain receipt code string. Never throws on malformed URLs.
 */
export function extractRatingCode(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (RATING_CODE_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const candidate =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(trimmed.startsWith('?') ? `https://placeholder.local/${trimmed}` : `https://placeholder.local/?${trimmed}`);

    const codeParam = candidate.searchParams.get('ratingcode')?.trim();
    if (codeParam && RATING_CODE_REGEX.test(codeParam)) {
      return codeParam;
    }
  } catch {
    // Fallback regex check for partial query strings
    const match = trimmed.match(/ratingcode=([A-Za-z0-9._-]{5,64})/i);
    if (match?.[1] && RATING_CODE_REGEX.test(match[1])) {
      return match[1];
    }
  }

  return null;
}

export const ratingFormSchema = z
  .object({
    outlet_rate: z.number().int().min(1, 'outlet_rate').max(5, 'outlet_rate'),
    outlet_tags: z.array(z.string().trim().min(1).max(60)).max(5),
    outlet_notes: z.string().trim().max(1000),
    tr_rate: z.number().int().min(1, 'tr_rate').max(5, 'tr_rate'),
    tr_tags: z.array(z.string().trim().min(1).max(60)).max(5),
    tr_notes: z.string().trim().max(1000),
    room_rate: z.number().int().min(1, 'room_rate').max(5, 'room_rate'),
    room_tags: z.array(z.string().trim().min(1).max(60)).max(5),
    room_notes: z.string().trim().max(1000),
    as_anonim: z.boolean(),
    guest_name: z.string().trim().max(120),
    guest_email: z.string().trim().max(150),
  })
  .superRefine((data, ctx) => {
    if (!data.as_anonim) {
      if (data.guest_name.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['guest_name'],
          message: 'guest_name',
        });
      }
      if (!data.guest_email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.guest_email)) {
        ctx.addIssue({
          code: 'custom',
          path: ['guest_email'],
          message: 'guest_email',
        });
      }
    }
  });
