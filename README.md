# Hymn Router

Chat AI lewat **9 endpoint LLM gratis** — satu API, $0. Kalau satu provider kena
429 / 5xx / timeout, router otomatis fallback ke provider berikutnya.

**Tanpa API key pun langsung jalan** lewat Kilo + LLM7 (keyless). Tambah key
gratis kalau mau kapasitas & model lebih bagus.

## Isi web

- **Chat** — playground: pilih provider (Auto = fallback chain) atau paksa satu
  provider, atur temperature & max tokens, system prompt opsional. Tiap jawaban
  menunjukkan provider + model + latensi + jejak fallback. Riwayat tersimpan di
  localStorage browser.
- **Providers** — status 9 provider: model, limit gratis, request/sukses/error,
  cooldown, dan link untuk dapat key gratis.
- **API Docs** — cara pakai endpoint dari luar (curl + JSON).

## Endpoint gratis yang dipakai

Diverifikasi live 2026-11-13 (✅ = dites langsung, 📄 = dari dokumentasi resmi
Okt–Nov 2026).

| Provider | Model default | Key | Limit gratis | Status |
|---|---|---|---|---|
| Groq | `openai/gpt-oss-120b` | gratis, tanpa kartu | 30 RPM, 1000 req/hari, 200K token/hari | 📄 |
| NVIDIA NIM | `nvidia/nemotron-3-ultra-550b-a55b` | gratis, verifikasi HP | ~40 RPM, 10K req/hari | 📄 |
| Gemini | `gemini-3.5-flash-lite` | gratis, tanpa kartu | 500 req/hari (Flash-Lite); Flash 20 req/hari | 📄 |
| OpenRouter | `...:free` (15 model live) | gratis, tanpa kartu | 20 RPM, 50 req/hari | ✅ list model |
| Mistral | `mistral-small-latest` | gratis, tanpa kartu | $10 kredit/bulan | 📄 |
| Kilo Code | `kilo-auto/free` | **tidak perlu** | 200 req/jam per IP | ✅ chat 200 |
| LLM7 | `gpt-oss:20b` | **tidak perlu** | token gratis: 60 RPM, 250 req/jam | ✅ chat 200 |
| Pollinations | `gpt-oss-20b` | **tidak perlu** | ~1 req/15 detik | ✅ chat 200 |
| OVHcloud | `gpt-oss-20b` | **tidak perlu** | 2 req/menit per IP | ✅ chat 200 (lambat) |

Urutan fallback: Groq → NVIDIA → Gemini → OpenRouter → Mistral → Kilo →
LLM7 → Pollinations → OVH. Provider ber-key yang key-nya kosong di-skip
otomatis.

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

## API

```bash
# status provider
curl http://localhost:3000/api/ai/chat

# chat
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"halo, jawab singkat"}]}'
```

Response sukses: `{ provider, model, content, tried, usage }`. Kalau semua
provider gagal: 502 + alasan tiap provider. Rate limit default 20 req/menit
per IP (`AI_ROUTER_IP_RPM`).

## Cara dapat key gratis

1. **Groq** — https://console.groq.com/keys (paling worth it: 1000 req/hari)
2. **Gemini** — https://aistudio.google.com/apikey
3. **OpenRouter** — https://openrouter.ai/keys
4. **NVIDIA** — https://build.nvidia.com (butuh verifikasi HP)
5. **Mistral** — https://console.mistral.ai/api-keys
6. **LLM7 (opsional)** — https://token.llm7.io

## Deploy

### Vercel (paling gampang)

```bash
npm i -g vercel
vercel
```

Lalu isi env di dashboard Vercel (Project → Settings → Environment Variables).
`maxDuration` API route diset 60 detik.

### Railway / VPS

```bash
npm install
npm run build
npm run start   # PORT dari env, default 3000
```

### Pterodactyl (Node.js egg)

- Startup: `npm run start` (atau `node node_modules/next/dist/bin/next start -p {{SERVER_PORT}}`)
- Build dulu sekali: `npm install && npm run build` (bisa lewat startup command
  sekali jalan, lalu ganti ke start saja)
- Env di panel: `PORT={{SERVER_PORT}}` + key-key di atas
- Node 20+

## Struktur

```
app/
  page.tsx                  # header + tabs (Chat / Providers / API Docs)
  layout.tsx, globals.css   # shell + design tokens (dark, dense, tanpa blur/gradient)
  api/ai/chat/route.ts      # POST chat (rate limit per IP) + GET status
components/
  chat-playground.tsx       # playground chat
  providers-panel.tsx       # kartu status provider
  api-docs.tsx              # dokumentasi endpoint + contoh curl
lib/
  free-ai-router.ts         # fallback chain 9 provider (tanpa dependency)
scripts/
  test-keyless.mjs          # tes 4 provider keyless dari terminal
```

## Yang perlu lu tahu

- **Free tier berubah-ubah.** Model `:free` OpenRouter median umurnya ~75 hari.
  Jangan jadikan ini satu-satunya fondasi untuk sesuatu yang kritikal.
- **Bukan untuk data sensitif.** Prompt di free tier bisa dipakai provider untuk
  improve produk / di-log. Jangan kirim password, token, atau data pribadi.
- **Batasan ToS.** OpenRouter melarang resell API / bikin layanan kompetitor.
  NVIDIA free endpoint hanya untuk trial/eval, bukan produksi.
- **Statistik per proses server**, reset saat restart. Untuk histori permanen,
  simpan log ke database.
