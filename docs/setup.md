# Setup Hymn Router — login Google, database, API key

Hymn Router jalan dalam dua mode:

| Fitur | Tanpa setup | Setelah setup |
|---|---|---|
| Landing page, playground chat anonim (`/chat`), `GET /api/ai/chat` | ✅ jalan | ✅ jalan |
| `POST /api/ai/chat` anonim (20 req/menit/IP) | ✅ jalan | ✅ jalan |
| Login Google, dashboard, API key per user, gateway `/api/v1` | ❌ tidak aktif | ✅ jalan |

Setup = 3 langkah: (1) Google OAuth client, (2) database Neon, (3) isi
4 environment variable + migrasi + redeploy. Semuanya gratis.

---

## 1. Google OAuth client (console.cloud.google.com)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat
   project baru (nama bebas, mis. `hymn-router`).
2. **APIs & Services → OAuth consent screen** → User type: **External** →
   isi nama aplikasi + email support + email developer → Save.
   - Tidak perlu menambahkan scope tambahan — scope `openid email profile`
     sudah termasuk default.
   - Tidak perlu memverifikasi aplikasi kalau hanya dipakai sendiri /
     teman. Aplikasi yang belum terverifikasi menampilkan layar peringatan
     "Google hasn't verified this app" saat login — klik **Advanced →
     Go to Hymn Router** untuk lanjut. Itu normal untuk app pribadi.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type: **Web application**.
4. Di **Authorized redirect URIs**, tambahkan (satu per baris):
   - `https://hymn-router.vercel.app/api/auth/callback/google` (production)
   - `http://localhost:3000/api/auth/callback/google` (lokal, opsional)
5. Create → salin **Client ID** dan **Client secret**. Ini jadi
   `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`.

Catatan: redirect URI harus cocok persis dengan yang dipakai aplikasi
(`{origin}/api/auth/callback/google`). Kalau salah, Google menolak dengan
`redirect_uri_mismatch`.

## 2. Database Neon (neon.tech)

1. Buka [neon.tech](https://neon.tech/) → sign up (gratis) → **Create
   project** (nama bebas, region pilih yang terdekat, mis. Singapore).
2. Di dashboard project, salin **connection string** (format
   `postgresql://user:password@host/db?sslmode=require`). Ini jadi
   `DATABASE_URL`.
   - Pakai connection string yang **pooled** (ada `-pooler` di hostname)
     kalau tersedia — lebih cocok untuk serverless.
3. Jalankan migrasi dari repo ini (sekali saja, idempotent):

   ```bash
   npm install
   # isi DATABASE_URL di .env.local dulu, lalu:
   npm run migrate
   ```

   Migrasi membuat 3 tabel: `users`, `api_keys`, `usage` (+ index).
   Skemanya ada di `db/migrations/001_init.sql`.

## 3. Environment variable di Vercel + redeploy

1. Buka Vercel → project `hymn-router` → **Settings → Environment
   Variables**. Tambahkan (Production + Preview + Development):
   - `GOOGLE_CLIENT_ID` — dari langkah 1
   - `GOOGLE_CLIENT_SECRET` — dari langkah 1
   - `SESSION_SECRET` — string acak min 32 karakter. Buat dengan:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
     Jangan pakai nilai ini di tempat lain, dan jangan commit ke repo.
   - `DATABASE_URL` — dari langkah 2
   - (Opsional) `GROQ_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_API_KEY`,
     `OPENROUTER_API_KEY`, `MISTRAL_API_KEY` — key gratis tiap provider
     kalau mau kapasitas lebih besar. Tanpa ini pun router jalan lewat
     provider keyless (Kilo, LLM7, Pollinations, OVH).
2. **Redeploy**: Deployments → menu (⋯) di deployment terbaru → Redeploy.
   (Env var baru hanya dibaca saat build/runtime berikutnya.)
3. Tes: buka `https://hymn-router.vercel.app` → **Mulai** → login Google →
   dashboard terbuka → buat API key → tes:
   ```bash
   curl https://hymn-router.vercel.app/api/v1/chat/completions \
     -H "Authorization: Bearer hr_KEY_LU" \
     -H "Content-Type: application/json" \
     -d '{"model": "hymn/auto", "messages": [{"role": "user", "content": "Halo!"}]}'
   ```

## Troubleshooting

| Gejala | Penyebab paling mungkin |
|---|---|
| Tombol login balas 503 "Google login belum dikonfigurasi" | `GOOGLE_CLIENT_ID` belum diisi di Vercel, atau belum redeploy |
| Google error `redirect_uri_mismatch` | Redirect URI di Google Cloud Console tidak sama persis dengan `{origin}/api/auth/callback/google` |
| Login gagal ke `/auth/error?reason=no_database` | `DATABASE_URL` belum diisi |
| Login gagal ke `/auth/error?reason=db_error` | Migrasi belum dijalankan (`npm run migrate`) |
| Login gagal ke `/auth/error?reason=no_session_secret` | `SESSION_SECRET` belum diisi / kurang dari 32 karakter |
| `/api/v1/...` balas 503 "API key belum dikonfigurasi" | `DATABASE_URL` belum diisi |
| `/api/v1/...` balas 401 | Header `Authorization: Bearer hr_...` kosong / key salah / key sudah di-revoke |
| Layar "Google hasn't verified this app" | Normal untuk app yang belum diverifikasi — klik Advanced → Go. Verifikasi hanya perlu kalau app dipakai publik luas. |

## Keamanan — baca ini

- **Jangan pernah commit `.env.local`** atau file berisi secret apa pun.
  Cek `.gitignore` sebelum push.
- `SESSION_SECRET` yang bocor memungkinkan orang memalsukan session —
  kalau bocor, ganti nilainya (semua user otomatis logout).
- API key user (`hr_...`) disimpan sebagai **hash SHA-256** di database,
  bukan plaintext. Key utuh hanya tampil sekali saat dibuat.
- Prompt dan response **tidak disimpan**. Yang dicatat hanya jumlah
  request, token, provider, dan latensi. Tapi request tetap diteruskan ke
  provider gratis pihak ketiga — jangan kirim data sensitif.
