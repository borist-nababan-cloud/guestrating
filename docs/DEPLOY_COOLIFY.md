# Panduan Deployment Coolify: Zen Guest Rating (`guestrate.zenfamilyspa.id`)

Aplikasi `frontend\guest-rating` telah dibangun ulang menjadi **Pure Static SPA (React 18 + Vite 6)** di atas **Nginx Non-Root (`nginxinc/nginx-unprivileged:1.27-alpine`)** pada port **`8080`**, menggantikan container Next.js `15.3.3` yang dipensiunkan.

---

## 1. Spesifikasi Service di Coolify
- **Git Repository:** `https://github.com/borist-nababan-cloud/guestrating.git`
- **Branch:** `main`
- **Build Pack:** `Dockerfile`
- **Domains:** `https://guestrate.zenfamilyspa.id` *(opsional: tambahkan juga alias `https://customerfeedback.zenfamilyspa.id` atau `https://zfeedback.zenfamilyspa.id` bila diinginkan)*
- **Network $\rightarrow$ Ports Exposes:** **`8080`** *(Wajib `8080`, karena container berjalan sebagai pengguna non-root UID `101` yang tidak memakai port `80`)*
- **Healthcheck Path:** `/healthz` (otomatis terkonfigurasi juga di `Dockerfile` pada `http://127.0.0.1:8080/healthz`)

---

## 2. Environment Variables (Cukup Ubah ENV untuk Switch Staging $\leftrightarrow$ Production)

Pastikan keempat variabel di bawah diaktifkan untuk **Build-Time & Runtime** (*"Available at Buildtime"* dicentang di Coolify agar `vite build` membundel variabel yang benar):

| Variabel | Mode Pengujian (**Staging** — Aktif Awal) | Mode Operasional (**Production**) |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://okchlapizmhoueeeldrh.supabase.co` | `https://ihdlwogvjfgawgsalgng.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *Anon key proyek Staging `okchlapizmhoueeeldrh`* | *Anon key proyek Production `ihdlwogvjfgawgsalgng`* |
| `VITE_WEBSITE_URL` | `https://zenfamilyspa.com` | `https://zenfamilyspa.com` |
| `VITE_APP_MODE` | `STAG` *(menampilkan lencana `MODE LATIHAN`)* | `PROD` *(lencana latihan otomatis tersembunyi)* |

> **Cara Berpindah dari Staging ke Production (Zero Code Change):**
> 1. Pastikan migrasi `backend\supabase\supabase\migrations\20261123140000_create_web_guest_rating_submissions_and_rpcs.sql` sudah diterapkan ke **Production Supabase** (`ihdlwogvjfgawgsalgng`).
> 2. Di Coolify, ubah 3 nilai ENV di atas ke nilai **Production**.
> 3. Klik **Redeploy** (pastikan opsi build cache dibersihkan atau biarkan Coolify membangun ulang image karena `ARG VITE_*` berubah).

---

## 3. Catatan Penting: URL QR Code pada Struk POS Kasir
Pada aplikasi kasir desktop [`FPosPembayaranPay.pas`](file:///d:/BEN/Zen/WORK_SPACE/desktop/ZenSystem/pos/FPosPembayaranPay.pas#L592), QR Code pada struk tamu saat ini masih mencetak:
```pascal
'https://zfeedback.zenfamilyspa.id/?ratingcode=' + ...
```
Agar tamu yang memindai QR struk otomatis masuk ke aplikasi baru ini tanpa harus langsung mengompilasi ulang desktop Delphi di semua cabang, pilih salah satu dari dua cara berikut:
1. **Arahkan/Alias Domain di DNS & Coolify:** Tambahkan `zfeedback.zenfamilyspa.id` sebagai domain alias (atau redirect HTTP 301 sambil mempertahankan query string `?ratingcode=...`) menuju `https://guestrate.zenfamilyspa.id/`, **atau**
2. **Perbarui URL di Desktop Delphi** (`FPosPembayaranPay.pas`) ke `https://guestrate.zenfamilyspa.id/?ratingcode=` pada rilis ZenSystem Desktop berikutnya.

---

## 4. Checklist Verifikasi Pasca-Deploy
1. Buka `https://guestrate.zenfamilyspa.id/healthz` $\rightarrow$ merespons HTTP `200 OK` (`OK`).
2. Periksa container di `/watchdogs` (`frontend\worklogs`) $\rightarrow$ status `healthy`, user container non-root, RAM stabil ~`15–25 MB`, 0 proses Node.js.
3. Buka `https://guestrate.zenfamilyspa.id/` $\rightarrow$ pastikan badge `MODE LATIHAN` muncul saat `VITE_APP_MODE=STAG`, logo tampil tanpa error jaringan, dan sakelar bahasa `ID | EN` bekerja.
4. Uji kamera **Scan QR Code Struk** lewat HTTPS di ponsel serta uji input manual kode struk dari Staging `ot_pos_guest_rating`.
5. Setelah submit rating, refresh ulang halaman dengan `?ratingcode=` yang sama $\rightarrow$ wajib tampil status **"Penilaian Sudah Tercatat"** (proteksi *single-submission* aktif).
