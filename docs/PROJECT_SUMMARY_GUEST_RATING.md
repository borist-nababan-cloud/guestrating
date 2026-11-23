# Zen Guest Rating (`guestrating`) Project Summary (23 November 2026)

## 1. Ringkasan Modernisasi & Pemensiunan Next.js `15.3.3`
Aplikasi **Zen Guest Rating** (`frontend\guest-rating`, repositori baru `https://github.com/borist-nababan-cloud/guestrating.git`) dibangun ulang total sebagai **Pure Static SPA (React 18 + Vite 6 + TypeScript Strict + Tailwind CSS v3 + Zod + lazy-loaded `qr-scanner`)** di atas container **Nginx non-root (`nginxinc/nginx-unprivileged:1.27-alpine`, UID `101`, port `8080`)** tanpa runtime Node.js/Next.js di produksi.

## 2. Arsitektur Backend Supabase (Opsi 2A — Zero-Breaking & Zero-Leak)
- **Kompatibilitas SyncAgent:** `public.ot_pos_guest_rating` dan policy `anon`-nya tidak diubah sehingga `desktop\SyncAgent\RateSync.pas` terus berjalan lancar.
- **Tabel Baru Terisolasi (`20261123140000_create_web_guest_rating_submissions_and_rpcs.sql`):**
  - `public.web_guest_rating_submissions`: menyimpan rating 3 dimensi (Outlet, Terapis, Ruangan), tag cepat, catatan opsional, opsi anonim/kontak, serta kolom otomatis `avg_rate` dan `is_bad_rating` (`< 3★`). Akses langsung `anon` ditolak total (`REVOKE ALL`).
  - `public.view_web_guest_rating_summary` (`security_invoker = true`): view pelaporan untuk manajemen/HRD terautentikasi sesuai Role ID (`[1, 5, 6, 8, 13, 14, 15, 16, 18]`).
- **3 `SECURITY DEFINER` RPC:**
  1. `get_guest_rating_session(p_ratingcode)` — mengembalikan detail publik cabang, nama/foto resmi terapis (`ot_hrd_karyawan_info.foto_url`), ruang (`ot_master_room`), dan status `already_submitted` tanpa membocorkan `id_payment`, `trans_id`, `user_uid`, maupun ulasan lain.
  2. `submit_guest_rating(...)` — validasi skor `1–5`, sanitasi teks/tag/email, serta proteksi *single-submission* (`ALREADY_SUBMITTED`).
  3. `get_guest_rating_notification_payload(p_submission_uid)` — **khusus `service_role` ONLY** untuk integrasi n8n + `public.master_email` alert `< 3★`.

## 3. Perbaikan Bug Legacy & Peningkatan UX
- Mengatasi seluruh 12 error TypeScript & 14 error ESLint legacy, termasuk bug fatal `ReactNode` pada `tr_details` dan `room_details`, pemanggilan method non-eksisten `scanner.getCamera()`, *stale closure* kamera yang menyebabkan stream kamera tetap menyala di latar belakang, serta URL Firebase lama (`zenmember-76409`).
- Menambahkan dukungan **Bilingual `[ ID | EN ]`**, desain **Zen Luxury** selaras `frontend\website`, chip pilihan cepat adaptif, fallback input manual kode struk, proteksi *double-submit*, serta `ErrorBoundary` dan timeout `AbortController` 15 detik.

## 4. Status Deployment
- **Supabase Staging (`okchlapizmhoueeeldrh`):** Migrasi terpasang dan terverifikasi live via PostgREST (`401`/`42501` untuk akses langsung `anon`, `200` untuk `get_guest_rating_session`).
- **Coolify (`https://guestrate.zenfamilyspa.id/`):** Siap dideploy pada mode **Staging** (port `8080` non-root). Switch ke **Production** (`ihdlwogvjfgawgsalgng`) cukup mengubah 3 variabel `VITE_*` di Coolify setelah migrasi dijalankan ke Production.
