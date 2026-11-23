# Panduan Mekanisme Alert Email Rating Buruk (`< 3★`) via `master_email` & n8n

Dokumen ini menjelaskan arsitektur lengkap bagaimana pengiriman penilaian tamu di `guestrating` secara otomatis memicu notifikasi email real-time kepada manajemen cabang dan Holding ketika terdapat skor kurang dari 3 (`< 3★`), menggunakan direktori penerima terpusat `public.master_email`.

---

## 1. Arsitektur End-to-End (5 Tahap)

```text
[Tamu di guestrate.zenfamilyspa.id]
       │  (1) POST /rest/v1/rpc/submit_guest_rating (anon key)
       ▼
[Supabase PostgreSQL]
       │  (2) INSERT ke public.web_guest_rating_submissions
       │      Otomatis menghitung kolom GENERATED:
       │      - avg_rate = ROUND((outlet_rate + tr_rate + room_rate) / 3.0, 2)
       │      - is_bad_rating = (outlet_rate < 3 OR tr_rate < 3 OR room_rate < 3)
       ▼
[Supabase Database Webhook (INSERT on web_guest_rating_submissions)]
       │  (3) Mengirim HTTPS POST { record: { uid, is_bad_rating, ... } }
       ▼
[n8n Workflow]
       │  (4) IF record.is_bad_rating === true (atau kirim semua ke filter masing-masing)
       │      POST /rest/v1/rpc/get_guest_rating_notification_payload
       │      Header: apikey & Authorization = Bearer <SUPABASE_SERVICE_ROLE_KEY>
       │      Body: { "p_submission_uid": "{{ $json.record.uid }}" }
       ▼
[PostgreSQL RPC: get_guest_rating_notification_payload]
       │  - Join web_guest_rating_submissions + master_outlet + ot_hrd_karyawan_info + ot_master_room
       │  - Query public.master_email:
       │      active = true
       │      AND (kode_outlet IS NULL OR kode_outlet = submission.kode_outlet)
       │      AND (is_bad_rating = true -> testi_bad = true | >=3 -> testi_notif = true)
       │  - Kembalikan JSON lengkap + recipients[]
       ▼
[n8n Code Node (Split Recipients) -> Gmail Send Email (Individual)]
```

---

## 2. Mengapa Arsitektur Ini Aman & Anti-Gagal?

1. **Zero Exposure PII & Konfigurasi Email di Browser:**
   - Browser tamu (`anon` key) **sama sekali tidak bisa** membaca tabel `web_guest_rating_submissions`, tabel `master_email`, maupun memanggil RPC `get_guest_rating_notification_payload` (`REVOKE ALL FROM PUBLIC, anon, authenticated` $\rightarrow$ HTTP `401` / kode `42501`).
   - Daftar email manajemen (`master_email`) hanya diolah di dalam fungsi `SECURITY DEFINER` di PostgreSQL dan hanya boleh dipanggil oleh n8n menggunakan `service_role` key lewat HTTPS (Port `443`).
2. **Mengatasi Kendala Koneksi IPv4 Database:**
   - Sama seperti `get_testimonial_notification_payload` pada `web_testimonials`, n8n memanggil Supabase melalui endpoint **HTTPS PostgREST API (Port 443)**, sehingga bekerja mulus meski server n8n tidak memiliki jalur IPv6 langsung ke port `5432`.
3. **Deteksi Otomatis 3 Dimensi (`is_bad_rating`):**
   - Kolom `is_bad_rating` bertipe `GENERATED ALWAYS AS (outlet_rate < 3 OR tr_rate < 3 OR room_rate < 3) STORED`.
   - Artinya walaupun rata-rata terlihat tinggi (misal Outlet `5`, Ruangan `5`, tetapi Terapis `2`), `is_bad_rating` tetap otomatis bernilai `true` sehingga manajemen langsung mendapat peringatan dini (*early warning*) untuk aspek yang bermasalah.
4. **Routing Hirarkis Berbasis `master_email`:**
   - Baris dengan `kode_outlet IS NULL` dan `testi_bad = true` $\rightarrow$ **Direksi / QA Holding** menerima alert rating buruk dari **seluruh cabang**.
   - Baris dengan `kode_outlet = '101'` dan `testi_bad = true` $\rightarrow$ **Manager / Admin Cabang 101** hanya menerima alert untuk cabang `101`.
   - Jika seluruh skor `>= 3`, sistem memakai flag `testi_notif = true` bila ingin mengirim laporan notifikasi ulasan positif.

---

## 3. Langkah Konfigurasi di Supabase Studio & n8n

### A. Pastikan Data Penerima di `public.master_email`
Contoh entri pada `public.master_email`:
- **Holding QA (Semua Cabang):** `email = 'qa.holding@zenfamilyspa.com'`, `kode_outlet = NULL`, `testi_bad = true`, `active = true`.
- **Manager Cabang (Misal Cabang 101):** `email = 'manager.sunda@zenfamilyspa.com'`, `kode_outlet = '101'`, `testi_bad = true`, `active = true`.

### B. Buat Database Webhook di Supabase Studio (Staging / Production)
1. Masuk ke **Supabase Studio $\rightarrow$ Database $\rightarrow$ Webhooks $\rightarrow$ Create a new hook**.
2. Isi konfigurasi:
   - **Name:** `notify_guest_rating_submission`
   - **Table:** `public.web_guest_rating_submissions`
   - **Events:** Centang **`INSERT`** saja.
   - **Type:** `HTTP Request` (`POST`)
   - **URL:** URL Webhook n8n Anda (mis. `https://n8nserver.zenfamilyspa.id/webhook/zen-guest-rating-alert`)
   - **HTTP Headers:** Tambahkan secret header khusus n8n (mis. `x-zen-webhook-secret: <secret_webhook_anda>`) agar hanya Supabase yang dapat memicu webhook n8n.

### C. Susunan 5 Node Workflow di n8n
1. **Node 1 — Webhook:**
   - Method `POST`, verifikasi header `x-zen-webhook-secret`.
2. **Node 2 — IF (`Hanya Rating Buruk` / Opsional):**
   - Kondisi: `{{ $json.body.record.is_bad_rating === true }}` *(atau biarkan lanjut ke node 3 bila ingin membedakan template email buruk vs normal berdasarkan `is_bad_rating`)*.
3. **Node 3 — HTTP Request (`Fetch Notification Payload`):**
   - **Method:** `POST`
   - **URL:** `https://<PROJECT_REF>.supabase.co/rest/v1/rpc/get_guest_rating_notification_payload`
   - **Headers:**
     - `apikey`: `<SUPABASE_SERVICE_ROLE_KEY>`
     - `Authorization`: `Bearer <SUPABASE_SERVICE_ROLE_KEY>`
     - `Content-Type`: `application/json`
   - **Body (JSON):**
     ```json
     {
       "p_submission_uid": "{{ $json.body.record.uid }}"
     }
     ```
4. **Node 4 — Code (`Render HTML & Split Recipients`):**
   - Membangun kartu email HTML Zen Luxury (menampilkan Cabang, Tanggal, Kode Struk, Terapis + Foto, Ruang, skor masing-masing dimensi dengan sorotan merah untuk skor `< 3`, tag keluhan, catatan tamu, serta identitas & email tamu jika non-anonim).
   - Memecah `data.recipients` menjadi 1 item n8n per email penerima (mencegah error array/BCC di Gmail node dan menjaga privasi antar penerima):
     ```javascript
     const payload = $input.first().json;
     if (!payload?.found || !Array.isArray(payload.recipients) || payload.recipients.length === 0) {
       return [];
     }

     const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
     const badgeColor = payload.is_bad_rating ? '#B91C1C' : '#6E8027';
     const subjectPrefix = payload.is_bad_rating ? '[ALERT RATING < 3★]' : '[Guest Rating]';

     const html = `
       <div style="font-family:Arial,sans-serif;background:#F8F5F1;padding:24px;color:#3C3C32;">
         <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E5DACB;border-radius:16px;padding:24px;">
           <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:${badgeColor};text-transform:uppercase;">
             ${payload.is_bad_rating ? 'Peringatan Kualitas Layanan (< 3 Bintang)' : 'Penilaian Baru Tamu Zen'}
           </p>
           <h2 style="margin:0 0 16px;font-size:20px;">${payload.outlet_name} (${payload.kode_outlet})</h2>
           <p style="margin:0 0 12px;font-size:13px;color:#717163;">
             Tanggal: <b>${payload.tanggal || '-'}</b> | Kode: <code>${payload.ratingcode}</code> | Rata-rata: <b>${payload.avg_rate}/5</b>
           </p>
           <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
             <tr><td style="padding:8px 0;border-bottom:1px solid #F4EFEB;"><b>Cabang</b></td><td style="padding:8px 0;border-bottom:1px solid #F4EFEB;">${stars(payload.outlet_rate)} (${payload.outlet_rate}/5)<br/>${(payload.outlet_tags || []).join(', ')} ${payload.outlet_notes ? '— ' + payload.outlet_notes : ''}</td></tr>
             <tr><td style="padding:8px 0;border-bottom:1px solid #F4EFEB;"><b>Terapis (${payload.therapist_name})</b></td><td style="padding:8px 0;border-bottom:1px solid #F4EFEB;">${stars(payload.tr_rate)} (${payload.tr_rate}/5)<br/>${(payload.tr_tags || []).join(', ')} ${payload.tr_notes ? '— ' + payload.tr_notes : ''}</td></tr>
             <tr><td style="padding:8px 0;"><b>Ruangan (${payload.room_id || '-'})</b></td><td style="padding:8px 0;">${stars(payload.room_rate)} (${payload.room_rate}/5)<br/>${(payload.room_tags || []).join(', ')} ${payload.room_notes ? '— ' + payload.room_notes : ''}</td></tr>
           </table>
           <p style="margin:0;font-size:12px;color:#717163;">
             Pengirim: <b>${payload.guest_name}</b> ${payload.guest_email ? '(' + payload.guest_email + ')' : ''}
           </p>
         </div>
       </div>
     `;

     return payload.recipients
       .filter((email) => typeof email === 'string' && email.includes('@'))
       .map((to) => ({
         json: {
           to,
           subject: `${subjectPrefix} ${payload.outlet_name} — Rata-rata ${payload.avg_rate}/5 (${payload.therapist_name})`,
           html,
         },
       }));
     ```
5. **Node 5 — Gmail (`Send a message`):**
   - **To:** `={{ $json.to }}`
   - **Subject:** `={{ $json.subject }}`
   - **Message (HTML):** `={{ $json.html }}`
