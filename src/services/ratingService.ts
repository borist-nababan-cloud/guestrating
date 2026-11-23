import { supabase } from '../lib/supabaseClient';
import type {
  GuestRatingSessionResponse,
  SubmitRatingPayload,
  SubmitRatingResult,
} from '../types/rating';

export async function fetchGuestRatingSession(
  ratingCode: string
): Promise<GuestRatingSessionResponse> {
  const { data, error } = await supabase.rpc('get_guest_rating_session', {
    p_ratingcode: ratingCode,
  });

  if (error) {
    throw new Error(error.code || 'SESSION_FETCH_FAILED');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('EMPTY_SESSION_RESPONSE');
  }

  return data as GuestRatingSessionResponse;
}

export async function submitGuestRating(
  payload: SubmitRatingPayload
): Promise<SubmitRatingResult> {
  const { data, error } = await supabase.rpc('submit_guest_rating', {
    p_ratingcode: payload.ratingcode,
    p_outlet_rate: payload.outlet_rate,
    p_tr_rate: payload.tr_rate,
    p_room_rate: payload.room_rate,
    p_outlet_notes: payload.outlet_notes || null,
    p_outlet_tags: payload.outlet_tags,
    p_tr_notes: payload.tr_notes || null,
    p_tr_tags: payload.tr_tags,
    p_room_notes: payload.room_notes || null,
    p_room_tags: payload.room_tags,
    p_as_anonim: payload.as_anonim,
    p_guest_name: payload.as_anonim ? null : payload.guest_name || null,
    p_guest_email: payload.as_anonim ? null : payload.guest_email || null,
    p_language: payload.language,
  });

  if (error) {
    throw new Error(error.code || 'SUBMIT_FAILED');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('EMPTY_SUBMIT_RESPONSE');
  }

  return data as SubmitRatingResult;
}
