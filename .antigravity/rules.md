# Zen Guest Rating (`guestrating`) Development Rules

## 1. Stack & Keamanan Kontainer
- **Aplikasi:** Pure Frontend SPA (React 18 + Vite 6 + TypeScript Strict + Tailwind CSS v3 + Zod + `qr-scanner`).
- **Larangan Runtime Node.js Produksi:** Wajib disajikan melalui `nginxinc/nginx-unprivileged:1.27-alpine` (**non-root UID 101**, port **`8080`**). Dilarang menginstal atau menjalankan Next.js / server Node.js di container produksi.
- **Zero-Leakage & Stripping:** `vite.config.ts` wajib mengaktifkan `esbuild.drop: ['console', 'debugger']` saat `production`, `sourcemap: false`, dan nol kredensial hardcoded di `src/`.
- **Header Keamanan Nginx:** Wajib menyertakan `server_tokens off`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (agar `?ratingcode=` tidak pernah bocor keluar via header `Referer`), `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, CSP ketat, dan healthcheck `/healthz` di port `8080`.

## 2. Arsitektur Data Supabase (Opsi 2A — Zero-Breaking untuk SyncAgent)
- **Kompatibilitas SyncAgent:** Jangan mengubah policy `anon` pada `public.ot_pos_guest_rating` agar `desktop\SyncAgent\RateSync.pas` tetap berjalan lancar.
- **Isolasi Data Ulasan:** Seluruh hasil pengisian tamu disimpan di `public.web_guest_rating_submissions` yang **menolak total akses langsung `anon`** (`REVOKE ALL`).
- **Akses Publik Hanya Melalui RPC:** Frontend publik hanya memanggil `get_guest_rating_session` dan `submit_guest_rating`; payload alert `get_guest_rating_notification_payload` dikunci ketat **hanya untuk `service_role`**.

## 3. Lingkungan & Switch Staging $\leftrightarrow$ Production
- **Tahap Awal (QA/Pengujian):** Terhubung ke **Staging Supabase** (`https://okchlapizmhoueeeldrh.supabase.co`, `VITE_APP_MODE=STAG`).
- **Switch ke Production:** Tidak boleh ada perubahan kode untuk berpindah environment — cukup ubah `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `VITE_APP_MODE=PROD` di Coolify lalu Redeploy.

## 4. Pengalaman Pengguna & Bahasa
- Mendukung **Bilingual `[ ID | EN ]`** (default Bahasa Indonesia) dengan palet **Zen Luxury** (`#F8F5F1` Linen, `#889D35` Matcha, `#D2C0A7` Sand, `#3C3C32` Charcoal, `Playfair Display` + `Plus Jakarta Sans`).
- QR Scanner (`qr-scanner`) wajib di-*lazy-load*, dikelola via `useRef`, dan membersihkan stream kamera (`stop()` + `destroy()`) setiap kali hasil terbaca, modal ditutup, unmount, atau tab tersembunyi (`visibilitychange`).
