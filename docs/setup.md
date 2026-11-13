# Setup Hymn Router — login, database, API key

Hymn Router jalan dalam dua mode:

| Fitur | Tanpa setup | Setelah setup |
|---|---|---|
| Landing page, playground chat anonim (`/chat`), `GET /api/ai/chat` | ✅ jalan | ✅ jalan |
| `POST /api/ai/chat` anonim (20 req/menit/IP) | ✅ jalan | ✅ jalan |
| Login (email/Google/GitHub), dashboard, API key per user, gateway `/api/v1` | ❌ tidak aktif | ✅ jalan |

Setup = 3 langkah: (1) Google OAuth client, (2) database Neon, (3) isi
4 environment variable + migrasi + redeploy. Semuanya gratis.
GitHub OAuth bersifat opsional (langkah 2b) dan verifikasi email via
Resend bersifat opsional (langkah 2c) — tanpa keduanya, login email +
Google tetap jalan (signup langsung aktif tanpa kode).

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
   - `https://hymnrouter.my.id/api/auth/callback/google` (production, domain utama)
   - `https://hymn-router.vercel.app/api/auth/callback/google` (production, alias Vercel)
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

   Migrasi membuat tabel inti: `users`, `api_keys`, `usage` (+ index)
   — `db/migrations/001_init.sql`. Migrasi `002_auth.sql` menambahkan
   kolom `password_hash` + `github_id`, membuat `google_sub` boleh
   NULL (akun email/GitHub tidak punya), dan unique index email +
   `github_id` — wajib dijalankan sebelum login email/GitHub dipakai.
   Migrasi `003_chat_history.sql` menambahkan `conversations` +
   `messages` (riwayat chat user yang login), dan
   `004_email_verification.sql` menambahkan `pending_signups` +
   `password_resets` (kode verifikasi signup + reset password).

## 2b. GitHub OAuth App (opsional — untuk tombol GitHub di /login)

1. Buka [github.com](https://github.com/) → foto profil → **Settings** →
   **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Isi:
   - **Application name**: `Hymn Router` (bebas).
   - **Homepage URL**: `https://hymnrouter.my.id`
   - **Authorization callback URL**:
     `https://hymn-router.vercel.app/api/auth/callback/github`
     (harus cocok persis — GitHub OAuth App hanya mengizinkan satu
     callback URL; callback sengaja tetap di alias Vercel karena
     satu-satunya yang terdaftar, jadi login GitHub hanya berfungsi
     dari `hymn-router.vercel.app`, bukan dari domain utama. Untuk
     lokal, buat OAuth App kedua dengan
     `http://localhost:3000/api/auth/callback/github`).
3. Register → salin **Client ID**, lalu **Generate a new client secret**.
   Ini jadi `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET`.
4. Tanpa kedua variabel ini, tombol GitHub tidak muncul di `/login` dan
   `/api/auth/github` redirect ke `/login?error=github_not_configured`.

## 2c. Verifikasi email via Resend (opsional — untuk kode signup + reset password)

1. Buka [resend.com](https://resend.com/) → sign up (gratis) →
   **API Keys** → buat key baru (Full access). Ini jadi
   `RESEND_API_KEY`.
2. **Domains** → tambahkan domain pengirim (mis. `hymnrouter.my.id`)
   → ikuti petunjuk DNS-nya (rekaman DKIM/SPF/DMARC) sampai status
   **Verified**. Alamat pengirim default adalah
   `noreply@hymnrouter.my.id` (bisa diganti lewat
   `RESEND_FROM_EMAIL`, tapi domainnya harus terverifikasi di Resend).
3. Tanpa `RESEND_API_KEY`, verifikasi email tidak aktif: signup email
   langsung membuat akun aktif (tanpa kode), dan lupa password
   mengembalikan 503.

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
   - (Opsional) `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — dari
     langkah 2b, untuk tombol GitHub di `/login`.
   - (Opsional) `RESEND_API_KEY` (+ `RESEND_FROM_EMAIL` kalau mau
     ganti alamat pengirim) — dari langkah 2c, untuk kode verifikasi
     signup + reset password.
   - (Opsional) `GROQ_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_API_KEY`,
     `OPENROUTER_API_KEY`, `MISTRAL_API_KEY` — key gratis tiap provider
     kalau mau kapasitas lebih besar. Tanpa ini pun router jalan lewat
     provider keyless (Kilo, LLM7, Pollinations, OVH).
2. **Redeploy**: Deployments → menu (⋯) di deployment terbaru → Redeploy.
   (Env var baru hanya dibaca saat build/runtime berikutnya.)
3. Tes: buka `https://hymnrouter.my.id` → **Mulai** → login Google →
   dashboard terbuka → buat API key → tes:
   ```bash
   curl https://hymnrouter.my.id/api/v1/chat/completions \
     -H "Authorization: Bearer hr_KEY_LU" \
     -H "Content-Type: application/json" \
     -d '{"model": "hymn/auto", "messages": [{"role": "user", "content": "Halo!"}]}'
   ```

## Troubleshooting

| Gejala | Penyebab paling mungkin |
|---|---|
| Tombol login balas 503 "Google login belum dikonfigurasi" | `GOOGLE_CLIENT_ID` belum diisi di Vercel, atau belum redeploy |
| Google error `redirect_uri_mismatch` | Redirect URI di Google Cloud Console tidak sama persis dengan `{origin}/api/auth/callback/google` |
| `/login?error=github_not_configured` | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` belum diisi (tombol GitHub seharusnya tidak muncul kalau belum di-set) |
| `/login?error=github_no_email` | Akun GitHub menyembunyikan email (Settings → Emails → Keep my email addresses private) dan tidak ada email terverifikasi |
| Signup/login email balas 503 "Migrasi database belum dijalankan" | Migrasi `002_auth.sql` belum dijalankan (`npm run migrate`) |
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
- Password user disimpan sebagai **hash scrypt** (salt acak per user),
  bukan plaintext. Password asli tidak pernah di-log.
- Login email dibatasi 10 percobaan per 15 menit per IP, dan pesan
  error login sengaja generik supaya email yang terdaftar tidak bisa
  ditebak (anti-enumerasi).
- Prompt dan response **tidak disimpan** — kecuali riwayat chat `/chat`
  user yang login, yang sengaja disimpan agar bisa dibuka lagi (dan bisa
  dihapus kapan saja). Yang dicatat hanya jumlah request, token, provider,
  dan latensi. Tapi request tetap diteruskan ke provider gratis pihak
  ketiga — jangan kirim data sensitif.
