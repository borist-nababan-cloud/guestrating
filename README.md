# guestrating

Aplikasi **Zen Family Spa & Reflexology — Guest Experience Rating** (pengganti permanen aplikasi Next.js `15.3.3` `customerfeedback` yang dipensiunkan).

## Arsitektur & Keamanan
- **Pure Static SPA:** React 18 + Vite 6 + TypeScript Strict + Tailwind CSS v3 + Zod + lazy-loaded `qr-scanner`.
- **Zero Node.js Runtime di Produksi:** Multi-stage Docker (`node:22-alpine` $\rightarrow$ `nginxinc/nginx-unprivileged:1.27-alpine`) berjalan sebagai pengguna **non-root (UID 101)** pada port **`8080`**.
- **Supabase-First (`SECURITY DEFINER` RPC):**
  - `public.get_guest_rating_session(p_ratingcode)` — memuat cabang, nama/foto terapis resmi, dan ruang perawatan tanpa membocorkan ID pembayaran atau ulasan tamu lain.
  - `public.submit_guest_rating(...)` — validasi server-side, proteksi *single-submission* (`ALREADY_SUBMITTED`), serta penyimpanan ke tabel terisolasi `public.web_guest_rating_submissions` (akses `anon` langsung ditolak total).
  - `public.get_guest_rating_notification_payload(p_submission_uid)` — khusus `service_role` (dipakai n8n untuk alert email `< 3★` via `public.master_email`).
- **Switch Staging $\leftrightarrow$ Production:** Cukup ubah Build-Time Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_MODE`) di Coolify lalu Redeploy tanpa mengubah kode.

## Pengembangan Lokal
```bash
cp .env.example .env
npm install
npm run dev
```

## Verifikasi Produksi
```bash
npm run lint
npm run build
npm audit
```
