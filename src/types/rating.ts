export type Language = 'id' | 'en';

export interface OutletLocation {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

export interface RatingOutletInfo {
  kode_outlet: string;
  name_outlet: string;
  alamat?: string | null;
  city?: string | null;
  no_wa?: string | null;
  location?: OutletLocation | string | null;
}

export interface RatingTherapistInfo {
  kodekaryawan: string | null;
  idkaryawan?: string | null;
  departemen?: string | null;
  photo_url?: string | null;
}

export interface RatingRoomInfo {
  room_id: string;
  jenis_jasa?: string | null;
  room_gender?: string | null;
  keterangan?: string | null;
}

export interface GuestRatingSession {
  found: true;
  ratingcode: string;
  tanggal: string | null;
  already_submitted: boolean;
  submitted_at?: string | null;
  outlet: RatingOutletInfo;
  therapist: RatingTherapistInfo | null;
  room: RatingRoomInfo | null;
}

export interface GuestRatingSessionNotFound {
  found: false;
  code: 'INVALID_CODE' | 'NOT_FOUND';
}

export type GuestRatingSessionResponse =
  | GuestRatingSession
  | GuestRatingSessionNotFound;

export interface RatingFormValues {
  outlet_rate: number;
  outlet_tags: string[];
  outlet_notes: string;
  tr_rate: number;
  tr_tags: string[];
  tr_notes: string;
  room_rate: number;
  room_tags: string[];
  room_notes: string;
  as_anonim: boolean;
  guest_name: string;
  guest_email: string;
}

export interface SubmitRatingPayload extends RatingFormValues {
  ratingcode: string;
  language: Language;
}

export interface SubmitRatingSuccess {
  success: true;
  submission_uid: string;
  avg_rate: number;
  is_bad_rating: boolean;
  submitted_at: string;
}

export interface SubmitRatingFailure {
  success: false;
  code: string;
}

export type SubmitRatingResult = SubmitRatingSuccess | SubmitRatingFailure;
