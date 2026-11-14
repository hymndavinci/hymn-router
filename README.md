# Hymn Router

Gateway AI **OpenAI-compatible** untuk **9 endpoint LLM gratis** — satu
API, Rp 0. Login dengan email, Google, atau GitHub, buat API key,
tembak dari kode apa pun.
Kalau satu provider kena 429 / 5xx / timeout, router otomatis fallback ke
provider berikutnya.

**Tanpa API key pun langsung jalan** lewat Kilo + LLM7 (keyless). Tambah
key gratis kalau mau kapasitas & model lebih bagus.

Live: **https://hymnrouter.my.id** (alias: https://hymn-router.vercel.app)

## Arsitektur

```
client (SDK OpenAI / cURL / fetch)
        │  POST /api/v1/chat/completions
        │  Authorization: Bearer hr_...
        ▼
Hymn Router (Next.js, Vercel)
  ├─ validasi API key (hash SHA-256, Neon Postgres)
  ├─ rate limit 60 req/menit per key
  ├─ router fallback chain (lib/free-ai-router.ts)
  └─ catat usage (request, token, provider) ──► dashboard
        │
        ▼
9 provider gratis: Groq → NVIDIA → Gemini → OpenRouter
→ Mistral → Kilo → LLM7 → Pollinations → OVH
```

## Isi web

- **`/`** — landing page (gaya Dahono): hero + stats, grid provider live,
  cara pakai + contoh kode, FAQ.
- **`/chat`** — playground: pilih provider (Auto = fallback chain) atau
  paksa satu provider, atur temperature & max tokens, system prompt
  opsional. Tiap jawaban menunjukkan provider + model + latensi + jejak
  fallback. Mode banding: dua provider menjawab prompt yang sama
  berdampingan. User yang login: riwayat tersimpan di server (bisa
  dibuka lagi, dihapus kapan saja). Anonim: riwayat di localStorage
  browser saja.
- **`/images`** — playground gambar: buat gambar dari prompt, langsung
  dari browser, tanpa login dan tanpa API key. Model `flux` dan `turbo`.
- **`/models`** — katalog model: model router per provider + model
  `:free` OpenRouter (live dari API), lengkap dengan context window
  (tertulis "tidak diketahui" kalau datanya tidak ada).
- **`/status`** — kesehatan provider dari data pemakaian (request,
  sukses, error terakhir).
- **`/docs`** — dokumentasi API: gateway `/api/v1` + endpoint `/api/ai/chat`.
- **`/login`** — masuk / daftar: email + password (hash scrypt), Google,
  atau GitHub (opsional). Satu email = satu akun, apa pun cara loginnya.
  Signup email memakai kode verifikasi 6 digit via email (Resend,
  berlaku 10 menit); lupa password juga via kode email.
- **`/dashboard`** — login wajib: Activity ala OpenRouter — rentang 7/30
  hari, tab Overview / Trends / Explore, 4 stat card + sparkline
  (Requests, Token volume, Avg latency, Kuota hari ini), tabel Top API
  Keys | Top Models, plus manajemen API key (buat + revoke) dan
  quickstart snippet.

## Endpoint gratis yang dipakai

Diverifikasi live 2026-11-13 (✅ = dites langsung, 📄 = dari dokumentasi
resmi Okt–Nov 2026).

| Provider | Model default | Key | Limit gratis | Status |
|---|---|---|---|---|
| Groq | `openai/gpt-oss-120b` | gratis, tanpa kartu | 30 RPM, 1000 req/hari, 200K token/hari | 📄 |
| NVIDIA NIM | `nvidia/nemotron-3-ultra-550b-a55b` | gratis, verifikasi HP | ~40 RPM, 10K req/hari | 📄 |
| Gemini | `gemini-3.5-flash-lite` | gratis, tanpa kartu | 500 req/hari (Flash-Lite); Flash 20 req/hari | 📄 |
| OpenRouter | `...:free` (katalog live dari API) | gratis, tanpa kartu | 20 RPM, 50 req/hari | ✅ list model |
| Mistral | `mistral-small-latest` | gratis, tanpa kartu | $10 kredit/bulan | 📄 |
| Kilo Code | `kilo-auto/free` | **tidak perlu** | 200 req/jam per IP | ✅ chat 200 |
| LLM7 | `gpt-oss:20b` | **tidak perlu** | token gratis: 60 RPM, 250 req/jam | ✅ chat 200 |
| Pollinations | `gpt-oss-20b` | **tidak perlu** | ~1 req/15 detik | ✅ chat 200 |
| OVHcloud | `gpt-oss-20b` | **tidak perlu** | 2 req/menit per IP | ✅ chat 200 (lambat) |

Urutan fallback: Groq → NVIDIA → Gemini → OpenRouter → Mistral → Kilo →
LLM7 → Pollinations → OVH. Provider ber-key yang key-nya kosong di-skip
otomatis.

## API

### Gateway v1 (OpenAI-compatible, pakai API key dari dashboard)

```bash
# daftar model (tanpa auth)
curl https://hymnrouter.my.id/api/v1/models

# chat — model bisa "hymn/auto", id provider ("groq"), atau id model
curl https://hymnrouter.my.id/api/v1/chat/completions \
  -H "Authorization: Bearer hr_KEY_LU" \
  -H "Content-Type: application/json" \
  -d '{"model": "hymn/auto", "messages": [{"role": "user", "content": "Halo!"}]}'
```

Response bentuk OpenAI: `{ id, object: "chat.completion", created, model,
choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
usage }`. Streaming didukung: `stream: true` mengembalikan SSE
(`data: {...}` per token, ditutup `data: [DONE]`). Rate limit 60
req/menit per key (`AI_ROUTER_KEY_RPM`). Kuota harian gratis **100
request/hari per user** (reset 00:00 WIB; header `X-Quota-Limit`,
`X-Quota-Remaining`, `X-Quota-Reset`); kuota habis → 429
`quota_exceeded`. Kuota berlaku untuk semua request ber-autentikasi
(`/v1` + `/api/ai/chat` dengan key); `/api/ai/chat` anonim tidak kena
kuota (tapi kena limit 20/menit per IP).

### Gambar (OpenAI-compatible, pakai API key dari dashboard)

```bash
curl https://hymnrouter.my.id/api/v1/images/generations \
  -H "Authorization: Bearer hr_KEY_LU" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "kucing astronot", "model": "flux", "size": "512x512"}'
```

Model: `flux` (kualitas) dan `turbo` (cepat). Response OpenAI:
`{ created, data: [{ url, revised_prompt, b64_json }] }` — URL gambar
dan base64 JPEG. Size: `1024x1024`, `512x512`, `1024x1792`,
`1792x1024`; `n` hanya 1; `seed` opsional (integer ≥ 0). Layanan
gambar membatasi 1 gambar per 45 detik per IP server — request yang
terlalu cepat dibalas 429 `image_rate_limited` + header `Retry-After`
(tidak menghabiskan kuota).

Pakai OpenAI SDK (Python):

```python
from openai import OpenAI
client = OpenAI(
    api_key="hr_KEY_LU",
    base_url="https://hymnrouter.my.id/api/v1",
)
res = client.chat.completions.create(
    model="hymn/auto",
    messages=[{"role": "user", "content": "Halo!"}],
)
```

### Endpoint sederhana /api/ai/chat

```bash
# status provider
curl http://localhost:3000/api/ai/chat

# chat anonim (20 req/menit per IP)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"halo, jawab singkat"}]}'

# chat dengan API key (60 req/menit per key, tercatat di dashboard)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer hr_KEY_LU" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"halo"}]}'
```

Response sukses: `{ provider, model, content, tried, usage }`. Kalau semua
provider gagal: 502 + alasan tiap provider. Bearer yang tidak valid → 401
(tidak diam-diam fallback anonim).

## Jalankan lokal

```bash
npm install
cp .env.example .env.local   # isi key yang lu punya — boleh kosong semua
npm run dev                  # http://localhost:3000
```

Tes provider keyless dari terminal:

```bash
npm run test:keyless
```

### Aktifkan login + dashboard + /v1 (lokal)

Ikuti **[docs/setup.md](docs/setup.md)**: buat Google OAuth client +
project Neon gratis, isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`SESSION_SECRET`, `DATABASE_URL` di `.env.local`, lalu:

```bash
npm run migrate   # 001 tabel inti, 002 kolom auth, 003 riwayat chat, 004 verifikasi email
```

GitHub OAuth bersifat opsional — tambah `GITHUB_CLIENT_ID` +
`GITHUB_CLIENT_SECRET` (lihat docs/setup.md) kalau mau tombol GitHub
muncul di `/login`. Tanpa itu, login email + Google tetap jalan.

Tanpa 4 variabel itu, login/dashboard/API key tidak aktif — tapi landing,
playground anonim, dan `/api/ai/chat` tetap jalan normal.

## Environment variable

| Variabel | Wajib? | Keterangan |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Untuk login | Google Cloud Console → OAuth client ID (Web) |
| `SESSION_SECRET` | Untuk login | Min 32 karakter acak, penanda session cookie |
| `DATABASE_URL` | Untuk login/key | Neon Postgres connection string |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY` | Opsional | Key gratis tiap provider (kapasitas lebih besar) |
| `RESEND_API_KEY` | Opsional | Resend (resend.com) — aktifkan verifikasi email signup + reset password. Tanpa ini, signup langsung aktif dan reset password balas 503 |
| `RESEND_FROM_EMAIL` | Opsional | Alamat pengirim kode verifikasi (default `noreply@hymnrouter.my.id`; domain harus terverifikasi di Resend) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Opsional | GitHub OAuth App — tombol GitHub di `/login` |
| `KILO_API_KEY`, `LLM7_API_KEY` | Opsional | Token opsional untuk limit lebih longgar |
| `GEMINI_MODEL`, `OPENROUTER_MODEL` | Opsional | Ganti model default |
| `AI_ROUTER_IP_RPM` | Opsional | Limit anonim per IP (default 20/menit) |
| `AI_ROUTER_KEY_RPM` | Opsional | Limit per API key (default 60/menit) |
| `SITE_URL`, `SITE_TITLE` | Opsional | Referer/title untuk OpenRouter |
| `PORT` | Opsional | Port `npm run start` (default 3000) |

## Cara dapat key gratis

1. **Groq** — https://console.groq.com/keys (paling worth it: 1000 req/hari)
2. **Gemini** — https://aistudio.google.com/apikey
3. **OpenRouter** — https://openrouter.ai/keys
4. **NVIDIA** — https://build.nvidia.com (butuh verifikasi HP)
5. **Mistral** — https://console.mistral.ai/api-keys
6. **LLM7 (opsional)** — https://token.llm7.io

## Deploy

### Vercel (dipakai sekarang — Git-linked, auto-deploy tiap push main)

Isi env di dashboard Vercel (Project → Settings → Environment Variables),
lalu redeploy. `maxDuration` API route diset 60 detik. Jangan lupa
`npm run migrate` sekali setelah `DATABASE_URL` diisi (dari lokal, dengan
`DATABASE_URL` yang sama).

### Railway / VPS

```bash
npm install
npm run build
npm run start   # PORT dari env, default 3000
```

### Pterodactyl (Node.js egg)

- Startup: `npm run start` (atau `node node_modules/next/dist/bin/next start -p {{SERVER_PORT}}`)
- Build dulu sekali: `npm install && npm run build` (bisa lewat startup
  command sekali jalan, lalu ganti ke start saja)
- Env di panel: `PORT={{SERVER_PORT}}` + key-key di atas
- Node 20+

## Struktur

```
app/
  page.tsx                  # landing page (hero, provider, cara pakai, FAQ, CTA)
  chat/page.tsx             # playground chat (+ mode banding, riwayat)
  images/page.tsx           # playground gambar (flux / turbo)
  models/page.tsx           # katalog model (router + :free OpenRouter)
  status/page.tsx           # kesehatan provider dari data pemakaian
  docs/page.tsx             # dokumentasi API
  login/page.tsx            # masuk / daftar / verifikasi / lupa password
  dashboard/page.tsx        # dashboard (login wajib)
  auth/error/page.tsx       # pesan error login OAuth
  layout.tsx, globals.css   # shell + design tokens (light, Dahono-style)
  loading.tsx               # skeleton saat navigasi
  api/
    ai/chat/route.ts        # POST chat (anonim/IP + Bearer/key) + GET status
    v1/chat/completions/route.ts   # gateway OpenAI-compatible (Bearer wajib)
    v1/images/generations/route.ts # gambar flux/turbo (Bearer wajib)
    v1/models/route.ts      # GET daftar model (tanpa auth)
    auth/signup/route.ts    # daftar email (+ kirim kode verifikasi)
    auth/verify/route.ts    # verifikasi kode signup
    auth/verify/resend/route.ts   # kirim ulang kode
    auth/login/route.ts     # login email + password
    auth/forgot-password/route.ts # minta kode reset
    auth/reset-password/route.ts  # reset password pakai kode
    auth/google/route.ts    # mulai OAuth Google
    auth/github/route.ts    # mulai OAuth GitHub
    auth/callback/google/route.ts  # terima code, buat session
    auth/callback/github/route.ts  # terima code, buat session
    auth/logout/route.ts    # hapus session
    auth/me/route.ts        # user yang login
    chat/conversations/route.ts    # GET/POST percakapan tersimpan
    chat/conversations/[id]/route.ts          # GET/DELETE satu percakapan
    chat/conversations/[id]/messages/route.ts # POST pesan ke percakapan
    dashboard/keys/route.ts # GET daftar key, POST buat key
    dashboard/keys/[id]/revoke/route.ts
    dashboard/usage/route.ts
    locale/route.ts         # ganti bahasa (cookie)
components/
  navbar.tsx, footer.tsx    # header (baca session) + footer
  globe-art.tsx             # motif globe SVG (hero)
  code-window.tsx           # contoh kode tab cURL/Python/TS
  faq.tsx                   # accordion FAQ
  provider-section.tsx      # wrapper grid provider (refresh 30 detik)
  chat-playground.tsx       # playground chat
  chat-page-client.tsx      # halaman /chat (client)
  image-playground.tsx      # playground gambar
  model-catalog.tsx         # katalog model
  providers-panel.tsx       # kartu status provider
  api-docs.tsx              # dokumentasi endpoint + contoh
  dashboard-client.tsx      # dashboard interaktif (key + usage)
  login-form.tsx            # form login/signup/verifikasi/reset
  locale-provider.tsx, locale-toggle.tsx  # i18n EN/ID
  mobile-menu.tsx, reveal.tsx, copy-button.tsx
lib/
  free-ai-router.ts         # fallback chain 9 provider (tanpa dependency)
  db.ts                     # client Neon (lazy, null kalau belum dikonfigurasi)
  auth.ts                   # session cookie HMAC-SHA256 (30 hari)
  api-keys.ts               # buat/validasi/revoke key + log usage + kuota
  usage.ts                  # agregasi pemakaian dashboard
  rate-limit.ts             # fixed-window limiter in-memory + clientIp
  chat-history.ts           # percakapan tersimpan (user login)
  password.ts               # hash scrypt + validasi kekuatan
  verification.ts           # kode 6 digit (scrypt-hashed, 10 menit, 5x coba)
  mail.ts                   # kirim email via Resend
  i18n.ts, i18n-utils.ts    # kamus EN/ID + helper fill
  sse.ts                    # helper streaming SSE
  think-strip.ts            # hapus blok <think> dari reasoning model
  openrouter-catalog.ts     # katalog :free live + context window
  pollinations-images.ts    # klien image generation (flux/turbo)
  site-url.ts               # base URL dari header request
  api-error.ts              # bentuk error JSON OpenAI-style
db/migrations/
  001_init.sql              # users, api_keys, usage
  002_auth.sql              # password_hash, github_id, google_sub nullable
  003_chat_history.sql      # conversations, messages
  004_email_verification.sql # pending_signups, password_resets
scripts/
  migrate.mjs               # jalankan migrasi (npm run migrate)
  test-keyless.mjs          # tes 4 provider keyless dari terminal
docs/
  setup.md                  # setup Google OAuth + Neon + Resend + Vercel
```

## Yang perlu lu tahu

- **Free tier berubah-ubah.** Model `:free` OpenRouter median umurnya ~75
  hari. Jangan jadikan ini satu-satunya fondasi untuk sesuatu yang kritikal.
- **Bukan untuk data sensitif.** Prompt di free tier bisa dipakai provider
  untuk improve produk / di-log. Jangan kirim password, token, atau data
  pribadi. Server ini tidak menyimpan prompt/response — kecuali riwayat
  chat `/chat` user yang login, yang sengaja disimpan agar bisa dibuka
  lagi (dan bisa dihapus kapan saja). Yang dicatat hanya jumlah request,
  token, provider, dan latensi.
- **Batasan ToS.** OpenRouter melarang resell API / bikin layanan kompetitor.
  NVIDIA free endpoint hanya untuk trial/eval, bukan produksi.
- **Statistik provider per proses server**, reset saat restart. Histori
  pemakaian per user (dashboard) tersimpan permanen di database.
- **API key user disimpan sebagai hash SHA-256**, bukan plaintext. Key utuh
  hanya tampil sekali saat dibuat.
