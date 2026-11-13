/**
 * i18n Hymn Router — kamus Bahasa Indonesia (formal) + Inggris.
 *
 * - Locale disimpan di cookie `hymn_locale` ("id" | "en"), default "en".
 * - TANPA prefix URL locale: semua route tetap /login, /dashboard, dst.
 * - Teks Indonesia di sini adalah teks formal dari commit 12b7fe0 —
 *   jangan diubah ke bahasa kasual.
 * - Nilai dinamis memakai placeholder {nama} dan diisi helper `fill`
 *   di components/locale-provider.tsx (kamus harus tetap serializable
 *   karena diteruskan sebagai prop dari Server Component ke client).
 * - Item docs yang mengandung <code> inline direpresentasikan sebagai
 *   array segmen Rich: { t: "teks" } atau { c: "kode" }.
 *
 * CATATAN IMPOR: file ini mengimpor next/headers (untuk getLocale).
 * Client component TIDAK BOLEH mengimpor nilai dari file ini — mereka
 * memakai kamus lewat LocaleProvider (context). Yang diizinkan hanya
 * `import type { ... }` (dihapus saat compile).
 */

import { cookies } from "next/headers";

export type Locale = "id" | "en";

export const LOCALE_COOKIE = "hymn_locale";
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(v: unknown): v is Locale {
  return v === "id" || v === "en";
}

/** Baca locale dari cookie (Server Component / route handler saja). */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Satu segmen teks docs: teks biasa atau potongan kode inline. */
export type RichSeg = { t: string } | { c: string };
export type Rich = RichSeg[];

const id = {
  meta: {
    homeTitle: "Hymn Router — Satu Endpoint untuk Semua Model AI Gratis",
    homeDescription:
      "Gateway OpenAI-compatible untuk {total} endpoint LLM gratis (Groq, Gemini, NVIDIA, OpenRouter, Kilo, LLM7, dan lainnya) dengan fallback otomatis. Masuk, buat API key, dan akses hymn-router.vercel.app/api/v1. Rp 0.",
    loginTitle: "Masuk — Hymn Router",
    loginDescription:
      "Masuk ke Hymn Router dengan email, Google, atau GitHub untuk membuat API key dan memakai gateway AI gratis.",
    chatTitle: "Chat — Hymn Router",
    chatDescription:
      "Playground chat Hymn Router: coba {total} provider LLM gratis tanpa login, tanpa API key.",
    docsTitle: "API Docs — Hymn Router",
    docsDescription:
      "Dokumentasi Hymn Router: gateway OpenAI-compatible /api/v1 dan endpoint /api/ai/chat.",
    modelsTitle: "Model — Hymn Router",
    modelsDescription:
      "Katalog model Hymn Router: model gratis {total} provider + model :free OpenRouter, dengan context window dan limit free tier.",
    imagesTitle: "Gambar — Hymn Router",
    imagesDescription:
      "Playground image generation gratis Hymn Router: buat gambar dengan Flux atau Turbo, tanpa login.",
    statusTitle: "Status — Hymn Router",
    statusDescription:
      "Status provider Hymn Router: konfigurasi, request 24 jam terakhir, dan latensi rata-rata.",
  },
  nav: {
    provider: "Provider",
    models: "Model",
    images: "Gambar",
    status: "Status",
    guide: "Panduan",
    howto: "Cara Penggunaan",
    api: "API",
    faq: "FAQ",
    chat: "Chat",
    apiDocs: "API Docs",
    dashboard: "Dasbor",
    signIn: "Masuk",
    start: "Mulai",
    signOut: "Keluar",
    signInUp: "Masuk / Daftar",
    openMenu: "Buka menu",
    closeMenu: "Tutup menu",
    changeLanguage: "Ganti bahasa",
  },
  footer: {
    tagline:
      "Satu endpoint untuk semua model AI gratis. Masuk, buat API key, dan panggil dari kode apa pun.",
    products: "Produk",
    resources: "Resource",
    privacy: "Privasi",
    privacyText:
      "Prompt dan isi response tidak disimpan. Yang dicatat hanya jumlah request, token, dan provider — untuk dasbor pemakaian Anda. Free tier berubah-ubah; jangan kirim data sensitif melalui endpoint gratis.",
    bottom: "{total} provider gratis · 1 endpoint · Rp 0",
  },
  home: {
    announcement: "100% gratis — {total} provider, tanpa kartu kredit",
    announcementLink: "Lihat provider →",
    heroBadge: "AI Router · Gratis · OpenAI-Compatible",
    heroTitle: "Satu endpoint untuk semua model AI gratis.",
    heroSub:
      "Sembilan provider LLM gratis di balik satu API. Masuk, buat API key, dan panggil dari kode Anda — tanpa kartu kredit, tanpa saldo.",
    ctaStart: "Mulai sekarang",
    ctaChat: "Coba chat",
    ctaDocs: "Dokumentasi →",
    providerLine:
      "{configured}/{total} provider aktif saat ini · tanpa key pun langsung dapat digunakan",
    stats: [
      { value: "9", label: "provider, satu endpoint" },
      { value: "4", label: "tanpa API key" },
      { value: "Rp 0", label: "tanpa kartu kredit" },
      { value: "1", label: "endpoint OpenAI-compatible" },
    ],
    providersEyebrow: "Provider",
    providersTitle: "Sembilan provider. Satu endpoint.",
    providersSub:
      "Status live dari server — urutan kartu adalah urutan fallback (atas dicoba duluan). Empat provider berfungsi tanpa API key.",
    howtoEyebrow: "Cara Penggunaan",
    howtoTitle: "Ganti base URL. Kode tetap berfungsi.",
    howtoSub:
      "Gateway memakai format OpenAI API, jadi SDK dan tools yang sudah Anda gunakan tetap berfungsi — yang berubah hanya base URL dan API key.",
    steps: [
      {
        n: "01",
        title: "Masuk / Daftar",
        body: "Masuk dengan Google, GitHub, atau email. Akun digunakan untuk dasbor dan API key Anda.",
      },
      {
        n: "02",
        title: "Buat API key di dasbor",
        body: "Key diawali hr_, bisa dibuat banyak, dan bisa di-revoke kapan saja.",
      },
      {
        n: "03",
        title: "Arahkan client ke gateway",
        body: "Atur base URL ke /api/v1 dan gunakan model hymn/auto — atau pilih provider tertentu.",
      },
    ],
    worksWith: "Bisa dipakai di",
    codeNote:
      "Simpan API key di environment variable. Streaming didukung melalui SSE — lihat dokumentasi.",
    quickstartEyebrow: "Mulai Cepat",
    quickstartTitle: "Mulai dalam 3 langkah.",
    quickstartSub:
      "Dari nol sampai request pertama — tanpa kartu kredit, tanpa setup rumit.",
    quickstartSteps: [
      {
        n: "1",
        title: "Daftar / Masuk",
        body: "Buat akun dengan Google, GitHub, atau email — gratis. Pendaftaran email memakai kode verifikasi.",
        cta: "Masuk / Daftar",
      },
      {
        n: "2",
        title: "Buat API Key",
        body: "Di dasbor, buat key pertama Anda. Key diawali hr_ dan bisa di-revoke kapan saja.",
        cta: "Buka dasbor",
      },
      {
        n: "3",
        title: "Coba Chat",
        body: "Kirim pesan pertama di playground — atau panggil /api/v1 dari kode Anda.",
        cta: "Buka playground",
      },
    ],
    dashboardEyebrow: "Dasbor",
    dashboardTitle: "Semua pemakaian Anda, dalam satu dasbor.",
    dashboardSub:
      "Setelah masuk, semua request melalui API key Anda tercatat dan dapat dipantau — tanpa setup apa pun.",
    dashboardFeatures: [
      {
        title: "Pantau request & token per provider",
        body: "Jumlah request dan token 7 hari terakhir, dirinci per provider yang benar-benar menjawab.",
      },
      {
        title: "API key sendiri, bisa revoke",
        body: "Buat key per proyek atau per perangkat. Key yang bocor dapat langsung di-revoke — key lainnya tetap berfungsi.",
      },
      {
        title: "Limit per key",
        body: "60 request/menit per API key, terpisah dari limit anonim 20 request/menit per IP.",
      },
    ],
    mockLabel: "dasbor / pemakaian",
    mockActive: "● {configured}/{total} provider aktif",
    mockStats: [
      { v: "1.284", l: "request · 7 hari" },
      { v: "96,4K", l: "token" },
      { v: "3", l: "API key aktif" },
    ],
    mockActiveLabel: "aktif",
    mockCaption: "Ilustrasi dasbor. Nama dan angka hanya contoh.",
    whyEyebrow: "Kenapa Hymn Router",
    whyTitle: "Semua model gratis, dalam satu akun.",
    whyCards: [
      {
        big: "9",
        title: "provider",
        body: "Satu endpoint untuk semuanya. Fallback otomatis jika satu provider gagal atau mencapai limit.",
      },
      {
        big: "Rp 0",
        title: "tanpa kartu kredit",
        body: "Tidak ada saldo, tidak ada langganan, tidak ada tagihan kejutan. Gratis berarti gratis.",
      },
      {
        big: "4",
        title: "keyless",
        body: "Kilo, LLM7, Pollinations, dan OVH langsung berfungsi tanpa API key provider apa pun.",
      },
    ],
    whyPrivacy:
      "Soal privasi: prompt dan response tidak pernah disimpan di server ini. Yang dicatat hanya jumlah request, token, dan provider — untuk dasbor Anda sendiri. Request tetap diteruskan ke provider gratis pihak ketiga, jadi jangan kirim data sensitif.",
    faqEyebrow: "FAQ",
    faqTitle: "Pertanyaan yang sering muncul.",
    faqSub:
      "Gratis, limit, privasi, dan cara penggunaan. Detail lain ada di dokumentasi.",
    faqItems: [
      {
        q: "Apa itu Hymn Router?",
        a: "Gateway AI OpenAI-compatible yang merutekan request Anda ke endpoint LLM gratis (Groq, NVIDIA, Gemini, OpenRouter, Mistral, Kilo, LLM7, Pollinations, OVH) melalui satu endpoint. Jika satu provider gagal atau mencapai limit, router otomatis beralih ke provider berikutnya.",
      },
      {
        q: "Apakah benar-benar gratis?",
        a: "Ya. Semua provider yang dipakai adalah tier gratis mereka — tanpa kartu kredit, tanpa saldo, tanpa langganan. Limitnya mengikuti limit gratis tiap provider (mis. Groq 1.000 req/hari, OpenRouter 50 req/hari).",
      },
      {
        q: "Perlu API key provider?",
        a: "Tidak, untuk mulai. Empat provider (Kilo, LLM7, Pollinations, OVH) bisa dipakai tanpa key sama sekali. Yang Anda butuhkan hanyalah API key Hymn Router (diawali hr_) yang dibuat di dasbor setelah masuk — key tersebut untuk gateway ini, bukan key provider.",
      },
      {
        q: "Bagaimana cara menggunakannya di kode?",
        a: "Arahkan base URL client OpenAI Anda ke /api/v1, isi API key dari dasbor, dan gunakan model \"hymn/auto\". SDK OpenAI, cURL, dan fetch biasa semuanya dapat digunakan — contoh lengkap tersedia di dokumentasi.",
      },
      {
        q: "Apakah prompt saya disimpan?",
        a: "Tidak. Prompt dan isi response tidak pernah disimpan di server ini. Yang dicatat hanya jumlah request, token, provider, dan latensi — untuk dasbor pemakaian Anda. Catatan jujur: request tetap diteruskan ke provider gratis pihak ketiga, dan beberapa provider bisa me-log prompt sesuai kebijakannya sendiri. Jangan kirim data sensitif.",
      },
      {
        q: "Mengapa terkadang lambat / gagal?",
        a: "Provider gratis memiliki limit dan terkadang sibuk. Router otomatis mencoba provider berikutnya jika satu gagal; provider yang terkena 429/5xx masuk cooldown 60 detik. OVH dikenal lambat (sekitar 15 detik). Jika semua provider gagal, responsnya 502 beserta alasan tiap provider agar mudah di-debug.",
      },
      {
        q: "Berapa limitnya?",
        a: "Anonim (playground dan /api/ai/chat tanpa key): 20 request/menit per IP. Menggunakan API key: 60 request/menit per key. Di atas itu, limit gratis tiap provider tetap berlaku.",
      },
    ],
    ctaTitle: "Mulai gunakan hari ini.",
    ctaSub:
      "Masuk, buat API key pertama Anda, dan kirim request pertama dalam waktu kurang dari semenit.",
  },
  providers: {
    loadError: "Gagal memuat status provider:",
    retry: "Coba lagi",
    loading: "Memuat status provider…",
    summary:
      "{configured}/{total} provider aktif · urutan fallback mengikuti urutan kartu (kiri atas dicoba duluan) · statistik per proses server, reset saat restart",
    refresh: "Refresh",
    refreshing: "Memuat…",
    badgeNeedsKey: "butuh key",
    badgeCooldown: "cooldown",
    badgeActive: "aktif",
    badgeActiveKeyless: "aktif · tanpa key",
    successRate: "{pct}% sukses",
    neverUsed: "belum dipakai",
    requestsLabel: "request:",
    successesLabel: "sukses:",
    lastUsed: "terakhir:",
    getKey: "Dapatkan key gratis ↗",
    optionalToken: "Token opsional ↗",
    optional: "(opsional)",
    notes: {
      groq: "Free: 30 RPM, 1000 req/hari, 200K token/hari per model. Tanpa kartu.",
      nvidia: "Free: ~40 RPM, 10K req/hari per model. Trial/eval only, bukan produksi.",
      gemini:
        "Free: Flash-Lite 500 req/hari; Flash 20 req/hari. Prompt free-tier dapat digunakan Google untuk meningkatkan produk.",
      openrouter:
        "Free: 20 RPM, 50 req/hari (1000/hari setelah top-up $10 sekali). Model :free bisa berubah sewaktu-waktu.",
      mistral: "Free mode: $10 kredit/bulan. Tanpa kartu.",
      kilo: "Tanpa key: 200 req/jam per IP. Auto-router dapat mengirim ke provider yang me-log prompt.",
      llm7: "Tanpa key bisa panggil model turbo. Token gratis di token.llm7.io: 60 RPM, 250 req/jam, 100K token/24 jam.",
      pollinations: "Legacy lane tanpa key, ~1 req/15 detik. Terverifikasi OK via node 2026-11-13.",
      ovh: "Tanpa key: 2 req/menit per IP per model. Terverifikasi OK via node 2026-11-13, tetapi lambat (~15 detik).",
    } as Record<string, string>,
  },
  login: {
    badge: "Akun Hymn Router",
    title: "Masuk ke Hymn Router",
    subtitle: "Satu akun untuk API key, dasbor pemakaian, dan gateway /v1.",
    errors: {
      github_not_configured:
        "Login GitHub belum dikonfigurasi di server. Silakan gunakan Google atau email.",
      github_no_email:
        "Akun GitHub Anda tidak membagikan alamat email (periksa Settings → Emails di GitHub). Silakan gunakan Google atau email.",
      github_failed:
        "Login GitHub gagal — silakan coba lagi, atau gunakan Google / email.",
      oauth_only:
        "Akun ini dibuat melalui Google/GitHub. Silakan masuk menggunakan tombol di atas.",
    } as Record<string, string>,
    googleBtn: "Lanjutkan dengan Google",
    githubBtn: "Lanjutkan dengan GitHub",
    divider: "atau lanjut dengan email",
    footnote:
      "Dengan masuk, Anda menggunakan gateway AI gratis ini untuk keperluan pribadi. Password disimpan sebagai hash scrypt — password asli tidak pernah disimpan.",
    modeLogin: "Masuk",
    modeSignup: "Daftar",
    nameLabel: "Nama",
    optional: "(opsional)",
    namePlaceholder: "Nama Anda",
    emailLabel: "Email",
    emailPlaceholder: "nama@email.com",
    passwordLabel: "Password",
    passwordHint: "(minimal 8 karakter)",
    invalidEmail: "Format email tidak valid.",
    passwordShort: "Password minimal 8 karakter.",
    passwordRequired: "Password wajib diisi.",
    processing: "Memproses…",
    submitLogin: "Masuk",
    submitSignup: "Buat akun",
    signupNote: "Belum ada verifikasi email — akun langsung aktif setelah daftar.",
    signupNoteVerify:
      "Setelah daftar, kode verifikasi 6 digit dikirim ke email Anda — kode berlaku 10 menit.",
    verifyTitle: "Verifikasi email Anda",
    verifySubtitle: "Kode 6 digit telah dikirim ke {email}. Masukkan kode tersebut di bawah ini.",
    codeLabel: "Kode verifikasi",
    codePlaceholder: "123456",
    verifySubmit: "Verifikasi & buat akun",
    verifying: "Memverifikasi…",
    resendBtn: "Kirim ulang kode",
    resendCooldown: "Kirim ulang dalam {seconds} detik",
    wrongEmail: "Salah email? Daftar ulang",
    codeInvalid: "Kode harus 6 digit.",
    codeSent: "Kode baru telah dikirim ke email Anda.",
    errInvalidCode: "Kode salah — tersisa {remaining} percobaan.",
    errExpired: "Kode sudah kedaluwarsa — silakan daftar ulang.",
    errTooMany: "Terlalu banyak percobaan — silakan daftar ulang.",
    errNotFound: "Verifikasi tidak ditemukan — silakan daftar ulang.",
    errResendSoon: "Tunggu {seconds} detik sebelum meminta kode baru.",
    errSendFailed: "Gagal mengirim kode — silakan coba lagi.",
    forgotLink: "Lupa password?",
    forgotTitle: "Reset password",
    forgotSubtitle: "Masukkan email akun Anda — kami akan mengirim kode reset 6 digit.",
    forgotSend: "Kirim kode",
    forgotSent: "Jika email tersebut terdaftar, kode reset telah dikirim. Periksa kotak masuk Anda (termasuk folder spam).",
    forgotCodeLabel: "Kode reset",
    forgotNewPassword: "Password baru",
    forgotConfirmPassword: "Konfirmasi password baru",
    forgotResetSubmit: "Reset password",
    forgotSuccess: "Password berhasil diubah — silakan masuk dengan password baru Anda.",
    forgotBack: "Kembali ke masuk",
    forgotPasswordMismatch: "Konfirmasi password tidak cocok.",
    forgotResend: "Tidak menerima kode? Kirim ulang",
    errResetNotFound: "Reset tidak ditemukan — silakan minta kode baru.",
    errResetExpired: "Kode sudah kedaluwarsa — silakan minta kode baru.",
    errResetTooMany: "Terlalu banyak percobaan — silakan minta kode baru.",
  },
  authError: {
    badge: "Login Google",
    messages: {
      denied: {
        title: "Login dibatalkan",
        body: "Anda menolak izin di halaman Google. Tidak ada data yang disimpan — silakan coba lagi jika ingin melanjutkan.",
      },
      missing_code: {
        title: "Kode login tidak ada",
        body: "Google tidak mengirim kode otorisasi. Silakan masuk lagi dari awal.",
      },
      bad_state: {
        title: "Sesi login tidak valid",
        body: "State keamanan tidak cocok — mungkin halaman login sudah terlalu lama dibuka. Silakan coba lagi.",
      },
      not_configured: {
        title: "Google login belum dikonfigurasi",
        body: "Server belum diisi GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Pemilik web perlu mengikuti docs/setup.md.",
      },
      no_session_secret: {
        title: "SESSION_SECRET belum dikonfigurasi",
        body: "Server belum diisi SESSION_SECRET (min 32 karakter acak). Pemilik web perlu mengikuti docs/setup.md.",
      },
      no_database: {
        title: "Database belum dikonfigurasi",
        body: "Server belum diisi DATABASE_URL. Login memerlukan database untuk menyimpan akun — pemilik web perlu mengikuti docs/setup.md.",
      },
      token_exchange_failed: {
        title: "Gagal menukar kode login",
        body: "Google menolak kode otorisasi — mungkin sudah dipakai atau kadaluarsa. Silakan masuk lagi.",
      },
      no_id_token: {
        title: "Google tidak mengirim id_token",
        body: "Respons Google tidak lengkap. Silakan masuk lagi.",
      },
      tokeninfo_failed: {
        title: "Gagal memverifikasi token Google",
        body: "Token dari Google tidak dapat diverifikasi. Silakan masuk lagi.",
      },
      bad_audience: {
        title: "Token Google bukan untuk aplikasi ini",
        body: "Audience id_token tidak cocok dengan GOOGLE_CLIENT_ID server. Periksa konfigurasi OAuth client.",
      },
      bad_token: {
        title: "Token Google tidak lengkap",
        body: "Token tidak berisi sub/email. Silakan masuk lagi.",
      },
      token_expired: {
        title: "Token Google sudah kadaluarsa",
        body: "Silakan masuk lagi.",
      },
      db_error: {
        title: "Gagal menyimpan akun",
        body: "Database menolak menyimpan akun Anda — mungkin migrasi belum dijalankan (npm run migrate). Silakan coba lagi nanti.",
      },
      unknown: {
        title: "Login gagal",
        body: "Terjadi kesalahan yang tidak terduga saat login. Silakan coba lagi.",
      },
    } as Record<string, { title: string; body: string }>,
    retryBtn: "Coba masuk lagi",
    homeBtn: "Kembali ke beranda",
  },
  chat: {
    badge: "Playground",
    title: "Coba router secara langsung.",
    sub: "Tanpa login, tanpa key. Anonim dibatasi 20 request/menit per IP — masuk dan gunakan API key untuk limit 60/menit.",
    tryLiveNote:
      "Coba langsung di sini tanpa daftar: tulis pertanyaan, pilih model di bawah, lalu tekan Kirim. Jawaban mengalir kata demi kata.",
    loadingStatus: "memuat status…",
    providersActive: "{configured}/{total} provider aktif",
    providerLabel: "Model / Provider",
    autoOption: "Auto (fallback chain)",
    needsKeySuffix: " (butuh key)",
    temperatureLabel: "Temperature · {t}",
    maxTokensLabel: "Max tokens",
    systemShow: "System prompt",
    systemHide: "Sembunyikan system prompt",
    clearHistory: "Hapus riwayat",
    systemPlaceholder:
      "System prompt (opsional), mis. Jawab singkat dalam Bahasa Indonesia.",
    noProvidersWarning:
      "Belum ada provider yang terkonfigurasi — hal ini seharusnya tidak terjadi, karena Kilo & LLM7 keyless selalu aktif. Periksa bagian Provider di beranda.",
    emptyTitle: "Belum ada pesan.",
    emptyBody:
      "Ketik pesan di bawah untuk menguji router. Tanpa API key pun dapat langsung digunakan melalui Kilo & LLM7 — masuk dan gunakan API key dari dasbor jika menginginkan limit yang lebih besar (60 req/menit).",
    youLabel: "Anda",
    assistantLabel: "asisten",
    waiting: "menunggu jawaban…",
    stopped: "(dihentikan)",
    streamInterrupted: "(stream terputus)",
    emptyResponse: "(respons kosong)",
    composerPlaceholder:
      "Tanyakan apa saja — contoh: Jelaskan fotosintesis dalam satu kalimat. (Enter untuk kirim, Shift+Enter untuk baris baru)",
    modelHint:
      "Pesan dikirim ke {model}. “Auto” mencoba semua provider sampai ada yang berhasil.",
    footerStats: "{configured}/{total} provider aktif · POST /api/ai/chat",
    stopBtn: "Stop",
    sendBtn: "Kirim",
    historyTitle: "Riwayat percakapan",
    newChat: "+ Chat baru",
    noConversations: "Belum ada percakapan tersimpan.",
    signInToSave: "Masuk untuk menyimpan riwayat percakapan Anda.",
    signInLink: "Masuk →",
    deleteConversation: "Hapus",
    loadingConversations: "Memuat riwayat…",
    historyError: "Riwayat tidak bisa dimuat saat ini.",
    toggleHistory: "Riwayat",
    compareToggle: "Bandingkan",
    compareModelA: "Model A",
    compareModelB: "Model B",
    compareQuotaNote:
      "Mode banding mengirim prompt Anda ke dua model sekaligus — memakai 2 unit kuota per kirim (untuk pengguna yang masuk).",
    compareNoAnswer: "(tidak ada jawaban)",
    saveFailedNote: "Pesan terkirim, tetapi gagal disimpan ke riwayat.",
    errorLabel: "Kesalahan",
    sendFailed: "Pesan gagal dikirim — periksa koneksi Anda, lalu coba lagi.",
    rateLimited: "Terlalu banyak permintaan — mohon tunggu sebentar sebelum mencoba lagi.",
    invalidKey: "API key tidak valid atau sudah dicabut.",
    serverNotConfigured: "Layanan belum dikonfigurasi di server.",
    allProvidersFailed: "Semua provider gagal merespons — silakan coba lagi sebentar.",
    invalidRequest: "Permintaan tidak valid.",
    deleteFailed: "Percakapan gagal dihapus.",
  },
  images: {
    badge: "Playground",
    title: "Buat gambar gratis.",
    sub: "Tulis prompt, pilih model dan ukuran — gambar dibuat langsung (Flux / Turbo), tanpa login dan tanpa API key.",
    promptLabel: "Prompt",
    promptPlaceholder:
      "Jelaskan gambar yang diinginkan, contoh: seekor kucing oranye duduk di jendela saat hujan, gaya lukisan cat air.",
    modelLabel: "Model",
    modelFluxDesc: "Flux — kualitas terbaik, sedikit lebih lambat.",
    modelTurboDesc: "Turbo — paling cepat, kualitas baik.",
    sizeLabel: "Ukuran",
    generate: "Buat gambar",
    generating: "Membuat gambar…",
    resultTitle: "Hasil",
    download: "Unduh gambar",
    copyUrl: "Salin URL",
    copied: "disalin ✓",
    newImage: "Gambar baru",
    emptyPrompt: "Prompt belum diisi — tulis dulu gambar seperti apa yang Anda inginkan.",
    failed:
      "Gambar gagal dibuat. Layanan gambar mungkin sedang sibuk — silakan coba lagi sebentar.",
    directNote:
      "Playground ini membuat gambar langsung dari browser Anda. Untuk memakai image generation dari kode, gunakan endpoint /api/v1/images/generations dengan API key — lihat dokumentasi.",
    loadingImage: "Memuat gambar…",
  },
  status: {
    badge: "Status",
    title: "Status provider.",
    sub: "Kondisi tiap provider: terkonfigurasi atau terkunci, request 24 jam terakhir, waktu sukses terakhir, dan latensi rata-rata.",
    dataNote:
      "Data di bawah berasal dari request ber-autentikasi (API key) 24 jam terakhir yang tercatat di database. Request anonim dari playground tidak dicatat, jadi provider yang hanya dipakai anonim bisa tertulis “belum ada data” meski sedang aktif.",
    configuredBadge: "aktif",
    lockedBadge: "butuh key",
    requests24h: "request · 24 jam",
    lastSuccess: "sukses terakhir",
    avgLatency: "latensi rata-rata",
    noData: "belum ada data",
    neverSucceeded: "belum pernah sukses",
    modelLabel: "model",
    freeTierLabel: "free tier",
    updatedNow: "Data diperbarui setiap kali halaman dimuat.",
  },
  docs: {
    badge: "Dokumentasi",
    title: "API Docs",
    introA: "Dua cara menggunakan router: gateway OpenAI-compatible",
    introB: "(menggunakan API key dari dasbor) dan endpoint sederhana",
    introC: "(anonim atau menggunakan key).",
    domainNoteA: "Ganti",
    domainNoteB:
      "dengan domain deployment Anda, mis. https://hymn-router.vercel.app",
    quickstartEyebrow: "Mulai Cepat",
    quickstartTitle: "Panduan singkat",
    quickstartSteps: [
      {
        title: "1. Masuk / Daftar",
        body: "Buat akun di /login dengan Google, GitHub, atau email.",
        cta: "Buka /login",
      },
      {
        title: "2. Buat API key",
        body: "Di dasbor, buat key baru dan salin — key hanya tampil sekali.",
        cta: "Buka dasbor",
      },
      {
        title: "3. Kirim request pertama",
        body: "Panggil POST /api/v1/chat/completions dengan model hymn/auto — atau coba tanpa key di /chat.",
        cta: "Buka playground",
      },
    ],
    loginEyebrow: "Akun",
    loginTitle: "Cara login",
    loginCardTitle: "Tiga cara masuk, satu akun",
    loginItems: [
      [
        { t: "Login di " },
        { c: "/login" },
        {
          t: ": email + password, Google, atau GitHub (GitHub aktif jika server sudah dikonfigurasi OAuth App-nya).",
        },
      ],
      [
        {
          t: "Daftar menggunakan email: password minimal 8 karakter, disimpan sebagai hash scrypt — password asli tidak pernah disimpan.",
        },
      ],
      [
        {
          t: "Satu email = satu akun: jika Anda mendaftar menggunakan email lalu masuk melalui Google/GitHub dengan email yang sama, akun akan ditautkan otomatis — masuk dengan cara apa pun menuju akun yang sama.",
        },
      ],
      [
        {
          t: "Pendaftaran email memakai kode verifikasi 6 digit yang dikirim ke email Anda — kode berlaku 10 menit dan dapat dikirim ulang.",
        },
      ],
      [
        {
          t: "Lupa password: minta kode reset 6 digit dari halaman login — kode berlaku 10 menit, lalu atur password baru.",
        },
      ],
      [
        {
          t: "Login dibatasi 10 percobaan per 15 menit per IP (anti brute force). Pesan error login sengaja generik supaya email yang terdaftar tidak bisa ditebak.",
        },
      ],
    ] as Rich[],
    v1Eyebrow: "Gateway",
    v1Title: "API v1 — OpenAI-compatible",
    v1CardTitle: "Cara kerja",
    v1Items: [
      [
        { t: "Satu gateway " },
        { c: "POST /api/v1/chat/completions" },
        {
          t: " dengan format request/response OpenAI. SDK OpenAI, cURL, dan fetch biasa langsung dapat digunakan — cukup ganti base URL saja.",
        },
      ],
      [
        { t: "Wajib header " },
        { c: "Authorization: Bearer hr_..." },
        { t: " dengan API key dari dasbor. Tanpa key / key tidak valid → 401." },
      ],
      [
        { c: "model" },
        { t: " bisa " },
        { c: "hymn/auto" },
        { t: " (default, fallback chain penuh), id provider (mis. " },
        { c: "groq" },
        { t: "), id model (mis. " },
        { c: "openai/gpt-oss-120b" },
        { t: "), atau model OpenRouter berakhiran " },
        { c: ":free" },
        { t: " (mis. " },
        { c: "google/gemma-4-26b-a4b-it:free" },
        {
          t: "). Model tidak dikenal → 404. Daftar lengkap (live, bisa berubah) ada di halaman Model.",
        },
      ],
      [
        { c: "stream: true" },
        { t: " mengembalikan SSE OpenAI-compatible (chunk " },
        { c: "choices[0].delta" },
        { t: ", diakhiri " },
        { c: "[DONE]" },
        { t: "). Lihat section Streaming di bawah." },
      ],
      [
        {
          t: "Rate limit: 60 request/menit per API key (melebihi itu → 429). Kuota harian Free plan: 100 request/hari per user, reset 00:00 WIB (habis → 429 ",
        },
        { c: "quota_exceeded" },
        { t: "). Sisa kuota terlihat di dasbor dan header " },
        { c: "X-Quota-Remaining" },
        { t: "." },
      ],
      [
        {
          t: "Pemakaian tercatat di dasbor: request, token, provider, model, grafik harian, dan request terakhir.",
        },
      ],
      [{ t: "Jika semua provider gagal → 502 beserta alasan tiap provider." }],
    ] as Rich[],
    v1CodeTitles: [
      "POST /api/v1/chat/completions — cURL",
      "POST /api/v1/chat/completions — Python (OpenAI SDK)",
      "POST /api/v1/chat/completions — response sukses (200)",
      "GET /api/v1/models — daftar model (tanpa auth)",
    ],
    streamEyebrow: "Real-time",
    streamTitle: "Streaming (SSE)",
    streamCardTitle: "Cara kerja",
    streamItems: [
      [
        { t: "Kirim " },
        { c: "stream: true" },
        {
          t: " di body /v1 (atau /api/ai/chat) untuk menerima token demi token melalui Server-Sent Events. Format chunk sama seperti OpenAI: delta teks di ",
        },
        { c: "choices[0].delta.content" },
        { t: ", chunk terakhir berisi " },
        { c: "finish_reason" },
        { t: ", lalu baris " },
        { c: "data: [DONE]" },
        { t: "." },
      ],
      [
        {
          t: "Router menunggu token pertama dari provider sebelum merespons — jadi jika provider pertama gagal, fallback ke provider berikutnya tetap berfungsi sebelum stream dimulai.",
        },
      ],
      [
        {
          t: "Jika provider tidak mendukung stream, router memakai respons non-stream lalu mengirimnya sebagai satu chunk delta. Client tidak perlu menangani dua format.",
        },
      ],
      [
        {
          t: "Usage token di dasbor: jika provider melaporkan usage di stream, angka itu yang dipakai; jika tidak, token diestimasi dari panjang teks (±4 karakter per token). Estimasi ini hanya untuk dasbor, tidak dikirim ke client.",
        },
      ],
      [
        { t: "Endpoint /api/ai/chat mengirim satu event tambahan di awal stream: " },
        { c: "event: meta" },
        {
          t: " berisi provider, model, dan provider yang sempat gagal. Endpoint /v1 tidak mengirim meta (strict OpenAI-compatible).",
        },
      ],
    ] as Rich[],
    streamCodeTitles: [
      "Streaming — cURL (gunakan -N agar tidak di-buffer)",
      "Streaming — Python (OpenAI SDK, stream=True)",
    ],
    imagesEyebrow: "Gambar",
    imagesTitle: "Image generation (/api/v1/images)",
    imagesCardTitle: "Cara kerja",
    imagesItems: [
      [
        { t: "Endpoint " },
        { c: "POST /api/v1/images/generations" },
        { t: " membuat gambar (gratis, tanpa key provider). Model: " },
        { c: "flux" },
        { t: " (kualitas terbaik) atau " },
        { c: "turbo" },
        { t: " (paling cepat)." },
      ],
      [
        { t: "Body: " },
        { c: "prompt" },
        { t: " (wajib, 1–4000 karakter), " },
        { c: "model" },
        { t: " (default " },
        { c: "flux" },
        { t: "), " },
        { c: "size" },
        { t: " (\"1024x1024\", \"512x512\", \"1024x1792\", \"1792x1024\"), " },
        { c: "n" },
        { t: " (hanya 1), " },
        { c: "seed" },
        { t: " (opsional, untuk hasil yang dapat diulang)." },
      ],
      [
        { t: "Wajib header " },
        { c: "Authorization: Bearer hr_..." },
        { t: " (API key dari dasbor). Respons berisi " },
        { c: "data[0].url" },
        { t: " dan " },
        { c: "data[0].b64_json" },
        { t: " sekaligus — gambar di atas ~3 MB hanya mengembalikan url." },
      ],
      [
        { t: "Satu gambar = 1 unit kuota harian (100 request/hari) dan tercatat di dasbor. Rate limit: 60 request/menit per key." },
      ],
      [
        { t: "Playground /images membuat gambar langsung dari browser (tanpa key) — untuk mencoba prompt tanpa menghabiskan kuota." },
      ],
    ] as Rich[],
    imagesCodeTitles: ["POST /api/v1/images/generations — cURL"],
    errorsEyebrow: "Referensi",
    errorsTitle: "Kode error",
    errors: [
      {
        code: "400",
        name: "invalid_request_error",
        desc: "Body tidak valid: messages kosong / >50 pesan, role tidak dikenal, konten >20000 karakter, temperature di luar 0–2, max_tokens di luar 1–8192, atau stream bukan boolean.",
      },
      {
        code: "401",
        name: "invalid_api_key",
        desc: "Header Authorization kosong, key tidak valid, atau key sudah di-revoke. Buat key baru di dasbor.",
      },
      {
        code: "404",
        name: "model_not_found",
        desc: "Model tidak dikenal. Gunakan \"hymn/auto\", id provider, id model dari GET /api/v1/models, atau model OpenRouter berakhiran \":free\".",
      },
      {
        code: "429",
        name: "rate_limit_exceeded",
        desc: "Melebihi 60 request/menit per API key (atau 20/menit per IP untuk /api/ai/chat anonim).",
      },
      {
        code: "429",
        name: "quota_exceeded",
        desc: "Kuota harian gratis (100 request/hari) habis. Respons menyertakan retry_after (detik) dan header Retry-After; reset 00:00 WIB.",
      },
      {
        code: "502",
        name: "all_providers_failed",
        desc: "Semua provider gagal (429 / 5xx / timeout). Pesan error berisi alasan tiap provider.",
      },
      {
        code: "503",
        name: "model_unavailable",
        desc: "Model :free diminta tapi server belum mengonfigurasi OPENROUTER_API_KEY.",
      },
      {
        code: "503",
        name: "server_not_configured",
        desc: "DATABASE_URL belum diisi di server — API key belum bisa divalidasi.",
      },
    ],
    chatEyebrow: "Sederhana",
    chatTitle: "API /api/ai/chat",
    chatCardTitle: "Cara kerja",
    chatItems: [
      [
        { t: "Endpoint sederhana " },
        { c: "POST /api/ai/chat" },
        {
          t: " memanggil provider gratis (Groq, NVIDIA, Gemini, OpenRouter, Mistral, Kilo, LLM7, Pollinations, OVH) secara berurutan sampai ada yang berhasil.",
        },
      ],
      [
        { t: "Anonim: rate limit 20 request/menit per IP, tidak dikenakan kuota harian. Dengan header " },
        { c: "Authorization: Bearer hr_..." },
        {
          t: ": limit 60/menit per key + pemakaian tercatat di dasbor dan turut menghabiskan kuota harian 100 request/hari. Bearer tidak valid → 401 (tidak fallback anonim).",
        },
      ],
      [
        { t: "Tambahkan " },
        { c: "stream: true" },
        { t: " di body untuk SSE (format sama seperti /v1, plus satu " },
        { c: "event: meta" },
        {
          t: " di awal berisi provider/model). Playground /chat memakai mode ini.",
        },
      ],
      [
        {
          t: "Provider yang kena 429 / 5xx / timeout masuk cooldown 60 detik, lalu dicoba lagi di request berikutnya.",
        },
      ],
      [
        {
          t: "Semua API key provider hanya dibaca server-side dari env. Tidak ada key yang dikirim ke browser.",
        },
      ],
      [
        {
          t: "Jika semua provider gagal, responsnya 502 beserta alasan tiap provider — sehingga mudah di-debug.",
        },
      ],
    ] as Rich[],
    chatCodeTitles: [
      "POST /api/ai/chat — curl",
      "POST /api/ai/chat — request body",
      "POST /api/ai/chat — response sukses (200)",
      "GET /api/ai/chat — status provider (tanpa key, aman dibuka)",
    ],
    limitsEyebrow: "Catatan",
    limitsTitle: "Limit & privasi",
    limitsCardTitle: "Yang perlu diingat",
    limitsItems: [
      [
        { t: "Free tier berubah-ubah: model " },
        { c: ":free" },
        { t: " OpenRouter bisa hilang / jadi berbayar sewaktu-waktu. Periksa " },
        { c: "https://openrouter.ai/api/v1/models" },
        { t: " jika ada model yang 404." },
      ],
      [
        {
          t: "Jangan kirim data sensitif melalui router ini — prompt di free tier dapat digunakan provider untuk meningkatkan produk / dicatat di log. Server ini sendiri tidak menyimpan prompt atau response; yang dicatat hanya jumlah request, token, provider, dan latensi.",
        },
      ],
      [
        {
          t: "Statistik di section Provider bersifat per proses server dan reset saat restart. Histori pemakaian per user (dasbor) tersimpan permanen di database.",
        },
      ],
    ] as Rich[],
  },
  models: {
    badge: "Katalog Model",
    title: "Model",
    introA:
      "Semua model yang dapat digunakan melalui Hymn Router — gratis. Salin id model ke field",
    introB: "di",
    introC:
      ". Context window diambil dari data OpenRouter; jika tidak ada datanya, tertulis “tidak diketahui”.",
    routerTitle: "Model Router",
    routerActive: "{configured}/{total} aktif",
    routerIntroA: "Model default tiap provider. Gunakan",
    routerIntroB: "untuk fallback otomatis, id provider (mis.",
    routerIntroC:
      ") untuk memprioritaskan satu provider, atau id model persis seperti di bawah.",
    autoDesc:
      "Router otomatis — mencoba {total} provider berurutan sampai ada yang berhasil. Pilihan default jika Anda belum yakin model apa yang akan digunakan.",
    recommended: "rekomendasi",
    statusActive: "aktif",
    statusNeedsKey: "butuh key",
    contextLabel: "konteks",
    unknownContext: "tidak diketahui",
    contextTokens: "{n} token",
    accessLabel: "akses",
    needsServerKey: "butuh API key server",
    noKey: "tanpa key",
    freeTitle: "Model :free OpenRouter",
    orConfigured: "terkonfigurasi",
    orNotConfigured: "belum ada key",
    freeIntroA:
      "Model gratis dari OpenRouter — kirim id-nya persis seperti di bawah ke field",
    freeIntroB: "di /v1 dan router meneruskannya ke OpenRouter. Hanya model berakhiran",
    freeIntroC:
      "yang diizinkan. Daftar ini live dari OpenRouter (cache 1 jam) dan bisa berubah sewaktu-waktu.",
    freeNotConfiguredA: "Saat ini server belum mengonfigurasi",
    freeNotConfiguredB: ", jadi model-model ini belum bisa dipakai.",
    catalogErrorTitle: "Katalog OpenRouter tidak bisa dimuat saat ini.",
    catalogErrorBody:
      "Silakan muat ulang halaman nanti. Model router di atas tetap bisa dipakai seperti biasa.",
    searchPlaceholder: "Cari dari {n} model :free…",
    searchAria: "Cari model :free",
    noMatch: "Tidak ada model yang cocok dengan “{q}”.",
    imageTitle: "Model Gambar",
    imageIntroA: "Model image generation — dipakai di",
    imageIntroB: "dan playground /images. Satu gambar = 1 unit kuota harian.",
    fluxDesc: "Kualitas terbaik, sedikit lebih lambat. Cocok untuk gambar detail.",
    turboDesc: "Paling cepat, kualitas baik. Cocok untuk iterasi cepat.",
    sizesLabel: "ukuran",
    endpointLabel: "endpoint",
  },
  dashboard: {
    dbErrorTitle: "Database sedang bermasalah",
    dbErrorBody:
      "Dasbor tidak dapat memuat data Anda saat ini — kemungkinan koneksi ke database sedang gagal sesaat. Silakan muat ulang halaman ini sebentar lagi; sesi login Anda tidak hilang.",
    greeting: "Halo,",
    nameFallback: "di sana",
    signedInWith: "Masuk melalui",
    requestsDays: "request · {days} hari terakhir",
    tokensTotal: "token total",
    tokensCount: "{n} token",
    tokensPrompt: "token prompt",
    tokensCompletion: "token completion",
    quotaTitle: "Kuota harian · Free plan",
    quotaUsed: "{used}/{limit} request hari ini",
    quotaRemaining: "Sisa {n} request.",
    quotaExhausted:
      "Kuota hari ini habis — request /v1 akan ditolak 429 sampai reset.",
    quotaReset:
      "Reset {date} WIB · berlaku untuk request /v1 ber-autentikasi (termasuk /api/ai/chat menggunakan key).",
    perProvider: "Per provider",
    noRequests:
      "Belum ada request tercatat dalam {days} hari terakhir. Buat API key di bawah dan kirim request pertama Anda.",
    noRequestsShort: "Belum ada request tercatat dalam {days} hari terakhir.",
    perModel: "Per model",
    last7days: "7 hari terakhir",
    noDailyData: "Belum ada data harian.",
    chartNote:
      "Angka di atas bar = jumlah request (WIB). Arahkan kursor ke bar untuk melihat token.",
    chartTooltip: "{date}: {requests} request · {tokens} token",
    perKey: "Per API key",
    unnamedKey: "key tanpa nama",
    recentTitle: "Request terakhir",
    noRecent: "Belum ada request tercatat.",
    thTime: "Waktu",
    thModel: "Model",
    thProvider: "Provider",
    thTokens: "Token",
    thLatency: "Latensi",
    thKey: "Key",
    keysTitle: "API key",
    keysActive: "{n} aktif",
    keysLimit: "limit 60 req/menit per key",
    keyNamePlaceholder: "Nama key, mis. bot-discord",
    creating: "Membuat…",
    createKey: "Buat key baru",
    copyNewKey:
      "Salin key ini sekarang — tidak bisa dilihat lagi sesudahnya.",
    copiedBtn: "disalin ✓",
    copyKeyBtn: "Salin key",
    noKeys: "Belum ada API key. Buat satu di atas untuk mulai memakai gateway.",
    revoked: "revoked",
    active: "aktif",
    createdLabel: "Dibuat",
    lastUsedLabel: "Terakhir dipakai",
    neverUsed: "belum pernah",
    revokeBtn: "Revoke",
    thName: "Nama",
    thCreated: "Dibuat",
    thLastUsed: "Terakhir dipakai",
    thStatus: "Status",
    quickstartTitle: "quickstart — cURL",
    quickstartA:
      "Ganti hr_KEY_ANDA dengan API key dari tabel di atas. Model juga bisa berupa id provider (mis. \"groq\"), id model dari GET ",
    quickstartB:
      "/api/v1/models, atau model OpenRouter berakhiran \":free\". Streaming didukung: tambahkan ",
    quickstartC:
      " dan baca SSE-nya. Kuota Free plan: 100 request/hari, reset 00:00 WIB. Detail lengkap di /docs.",
    guideTitle: "Langkah berikutnya: buat API key pertama Anda",
    guideBody:
      "Anda belum punya API key — tanpa key, gateway /v1 belum bisa dipakai dari kode. Buat satu di bawah (gratis, 1 menit), lalu salin ke kode Anda. Atau coba dulu tanpa key di playground chat.",
    guideCta: "Buat API Key",
    guideChatLink: "Coba chat tanpa key →",
    keyCreateFailed: "API key gagal dibuat — silakan coba lagi sebentar.",
    keyRevokeFailed: "API key gagal dicabut — silakan coba lagi sebentar.",
    keyInvalidName: "Nama key wajib diisi (1–64 karakter).",
    keyNotFound: "API key tidak ditemukan atau sudah dicabut.",
    sessionExpired: "Sesi Anda telah berakhir — silakan masuk kembali.",
    serverError: "Terjadi kesalahan server — silakan coba lagi sebentar.",
  },
  common: {
    copy: "salin",
    copied: "disalin ✓",
    copyLabel: "Salin",
    copiedLabel: "Disalin!",
    tryAgain: "Coba lagi",
    loading: "Memuat…",
  },
};

export type Dict = typeof id;

const en: Dict = {
  meta: {
    homeTitle: "Hymn Router — One Endpoint for Every Free AI Model",
    homeDescription:
      "An OpenAI-compatible gateway for {total} free LLM endpoints (Groq, Gemini, NVIDIA, OpenRouter, Kilo, LLM7, and more) with automatic fallback. Sign in, create an API key, and call hymn-router.vercel.app/api/v1. Free.",
    loginTitle: "Sign in — Hymn Router",
    loginDescription:
      "Sign in to Hymn Router with email, Google, or GitHub to create API keys and use the free AI gateway.",
    chatTitle: "Chat — Hymn Router",
    chatDescription:
      "Hymn Router chat playground: try {total} free LLM providers with no sign-in and no API key.",
    docsTitle: "API Docs — Hymn Router",
    docsDescription:
      "Hymn Router documentation: the OpenAI-compatible /api/v1 gateway and the /api/ai/chat endpoint.",
    modelsTitle: "Models — Hymn Router",
    modelsDescription:
      "Hymn Router model catalog: free models from {total} providers plus OpenRouter :free models, with context windows and free-tier limits.",
    imagesTitle: "Images — Hymn Router",
    imagesDescription:
      "Hymn Router free image generation playground: create images with Flux or Turbo, no sign-in needed.",
    statusTitle: "Status — Hymn Router",
    statusDescription:
      "Hymn Router provider status: configuration, requests in the last 24 hours, and average latency.",
  },
  nav: {
    provider: "Providers",
    models: "Models",
    images: "Images",
    status: "Status",
    guide: "Guide",
    howto: "How to Use",
    api: "API",
    faq: "FAQ",
    chat: "Chat",
    apiDocs: "API Docs",
    dashboard: "Dashboard",
    signIn: "Sign in",
    start: "Start",
    signOut: "Sign out",
    signInUp: "Sign in / Create account",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    changeLanguage: "Change language",
  },
  footer: {
    tagline:
      "One endpoint for every free AI model. Sign in, create an API key, and call it from any code.",
    products: "Products",
    resources: "Resources",
    privacy: "Privacy",
    privacyText:
      "Prompts and response content are never stored. Only request counts, tokens, and providers are recorded — for your usage dashboard. Free tiers change over time; never send sensitive data through free endpoints.",
    bottom: "{total} free providers · 1 endpoint · $0",
  },
  home: {
    announcement: "100% free — {total} providers, no credit card",
    announcementLink: "See providers →",
    heroBadge: "AI Router · Free · OpenAI-Compatible",
    heroTitle: "One endpoint for every free AI model.",
    heroSub:
      "Nine free LLM providers behind a single API. Sign in, create an API key, and call it from your code — no credit card, no balance.",
    ctaStart: "Get started",
    ctaChat: "Try the chat",
    ctaDocs: "Documentation →",
    providerLine:
      "{configured}/{total} providers active right now · usable even without a key",
    stats: [
      { value: "9", label: "providers, one endpoint" },
      { value: "4", label: "without an API key" },
      { value: "$0", label: "no credit card" },
      { value: "1", label: "OpenAI-compatible endpoint" },
    ],
    providersEyebrow: "Providers",
    providersTitle: "Nine providers. One endpoint.",
    providersSub:
      "Live status from the server — card order is the fallback order (top is tried first). Four providers work without an API key.",
    howtoEyebrow: "How to Use",
    howtoTitle: "Change the base URL. Your code keeps working.",
    howtoSub:
      "The gateway speaks the OpenAI API format, so the SDKs and tools you already use keep working — only the base URL and API key change.",
    steps: [
      {
        n: "01",
        title: "Sign in / Create account",
        body: "Sign in with Google, GitHub, or email. Your account is used for the dashboard and your API keys.",
      },
      {
        n: "02",
        title: "Create an API key in the dashboard",
        body: "Keys start with hr_, you can create many, and revoke any of them at any time.",
      },
      {
        n: "03",
        title: "Point your client at the gateway",
        body: "Set the base URL to /api/v1 and use the hymn/auto model — or pick a specific provider.",
      },
    ],
    worksWith: "Works with",
    codeNote:
      "Store your API key in an environment variable. Streaming is supported via SSE — see the documentation.",
    quickstartEyebrow: "Quick Start",
    quickstartTitle: "Start in 3 steps.",
    quickstartSub:
      "From zero to your first request — no credit card, no complicated setup.",
    quickstartSteps: [
      {
        n: "1",
        title: "Sign up / Sign in",
        body: "Create an account with Google, GitHub, or email — free. Email sign-up uses a verification code.",
        cta: "Sign in / Create account",
      },
      {
        n: "2",
        title: "Create an API Key",
        body: "In the dashboard, create your first key. Keys start with hr_ and can be revoked anytime.",
        cta: "Open dashboard",
      },
      {
        n: "3",
        title: "Try the Chat",
        body: "Send your first message in the playground — or call /api/v1 from your code.",
        cta: "Open playground",
      },
    ],
    dashboardEyebrow: "Dashboard",
    dashboardTitle: "All your usage, in one dashboard.",
    dashboardSub:
      "Once you sign in, every request made with your API keys is recorded and can be monitored — with no setup at all.",
    dashboardFeatures: [
      {
        title: "Monitor requests & tokens per provider",
        body: "Request and token counts for the last 7 days, broken down by the provider that actually answered.",
      },
      {
        title: "Your own API keys, revocable",
        body: "Create a key per project or device. A leaked key can be revoked immediately — your other keys keep working.",
      },
      {
        title: "Per-key limits",
        body: "60 requests/minute per API key, separate from the anonymous limit of 20 requests/minute per IP.",
      },
    ],
    mockLabel: "dashboard / usage",
    mockActive: "● {configured}/{total} providers active",
    mockStats: [
      { v: "1,284", l: "requests · 7 days" },
      { v: "96.4K", l: "tokens" },
      { v: "3", l: "active API keys" },
    ],
    mockActiveLabel: "active",
    mockCaption: "Dashboard illustration. Names and numbers are examples only.",
    whyEyebrow: "Why Hymn Router",
    whyTitle: "Every free model, in one account.",
    whyCards: [
      {
        big: "9",
        title: "providers",
        body: "One endpoint for all of them. Automatic fallback when a provider fails or hits its limit.",
      },
      {
        big: "$0",
        title: "no credit card",
        body: "No balance, no subscription, no surprise bills. Free means free.",
      },
      {
        big: "4",
        title: "keyless",
        body: "Kilo, LLM7, Pollinations, and OVH work right away without any provider API key.",
      },
    ],
    whyPrivacy:
      "On privacy: prompts and responses are never stored on this server. Only request counts, tokens, and providers are recorded — for your own dashboard. Requests are still forwarded to third-party free providers, so never send sensitive data.",
    faqEyebrow: "FAQ",
    faqTitle: "Frequently asked questions.",
    faqSub:
      "Pricing, limits, privacy, and how to use it. More details are in the documentation.",
    faqItems: [
      {
        q: "What is Hymn Router?",
        a: "An OpenAI-compatible AI gateway that routes your requests to free LLM endpoints (Groq, NVIDIA, Gemini, OpenRouter, Mistral, Kilo, LLM7, Pollinations, OVH) through a single endpoint. If one provider fails or hits its limit, the router automatically moves on to the next provider.",
      },
      {
        q: "Is it really free?",
        a: "Yes. Every provider used is on its free tier — no credit card, no balance, no subscription. Limits follow each provider's free limits (e.g. Groq 1,000 req/day, OpenRouter 50 req/day).",
      },
      {
        q: "Do I need a provider API key?",
        a: "No, not to get started. Four providers (Kilo, LLM7, Pollinations, OVH) work without any key at all. All you need is a Hymn Router API key (starting with hr_) created in the dashboard after signing in — that key is for this gateway, not a provider key.",
      },
      {
        q: "How do I use it in code?",
        a: "Point your OpenAI client's base URL to /api/v1, fill in the API key from the dashboard, and use the \"hymn/auto\" model. The OpenAI SDK, cURL, and plain fetch all work — full examples are in the documentation.",
      },
      {
        q: "Are my prompts stored?",
        a: "No. Prompts and response content are never stored on this server. Only request counts, tokens, providers, and latency are recorded — for your usage dashboard. Honest note: requests are still forwarded to third-party free providers, and some providers may log prompts under their own policies. Never send sensitive data.",
      },
      {
        q: "Why is it sometimes slow / failing?",
        a: "Free providers have limits and sometimes get busy. The router automatically tries the next provider when one fails; providers hit by 429/5xx enter a 60-second cooldown. OVH is known to be slow (around 15 seconds). If all providers fail, the response is a 502 with each provider's reason, so it is easy to debug.",
      },
      {
        q: "What are the limits?",
        a: "Anonymous (the playground and /api/ai/chat without a key): 20 requests/minute per IP. With an API key: 60 requests/minute per key. On top of that, each provider's free limits still apply.",
      },
    ],
    ctaTitle: "Start using it today.",
    ctaSub:
      "Sign in, create your first API key, and send your first request in under a minute.",
  },
  providers: {
    loadError: "Failed to load provider status:",
    retry: "Try again",
    loading: "Loading provider status…",
    summary:
      "{configured}/{total} providers active · fallback order follows card order (top-left is tried first) · stats are per server process and reset on restart",
    refresh: "Refresh",
    refreshing: "Loading…",
    badgeNeedsKey: "needs key",
    badgeCooldown: "cooldown",
    badgeActive: "active",
    badgeActiveKeyless: "active · keyless",
    successRate: "{pct}% success",
    neverUsed: "not used yet",
    requestsLabel: "requests:",
    successesLabel: "successes:",
    lastUsed: "last:",
    getKey: "Get a free key ↗",
    optionalToken: "Optional token ↗",
    optional: "(optional)",
    notes: {
      groq: "Free: 30 RPM, 1,000 req/day, 200K tokens/day per model. No card.",
      nvidia:
        "Free: ~40 RPM, 10K req/day per model. Trial/eval only, not for production.",
      gemini:
        "Free: Flash-Lite 500 req/day; Flash 20 req/day. Free-tier prompts may be used by Google to improve its products.",
      openrouter:
        "Free: 20 RPM, 50 req/day (1,000/day after a one-time $10 top-up). :free models can change at any time.",
      mistral: "Free mode: $10 credit/month. No card.",
      kilo: "No key: 200 req/hour per IP. The auto-router may send requests to providers that log prompts.",
      llm7: "Without a key you can call the turbo model. Free tokens at token.llm7.io: 60 RPM, 250 req/hour, 100K tokens/24h.",
      pollinations:
        "Keyless legacy lane, ~1 req/15 seconds. Verified working via node 2026-11-13.",
      ovh: "No key: 2 req/minute per IP per model. Verified working via node 2026-11-13, but slow (~15 seconds).",
    } as Record<string, string>,
  },
  login: {
    badge: "Hymn Router Account",
    title: "Sign in to Hymn Router",
    subtitle: "One account for API keys, the usage dashboard, and the /v1 gateway.",
    errors: {
      github_not_configured:
        "GitHub sign-in has not been configured on the server. Please use Google or email.",
      github_no_email:
        "Your GitHub account does not share an email address (check Settings → Emails on GitHub). Please use Google or email.",
      github_failed:
        "GitHub sign-in failed — please try again, or use Google / email.",
      oauth_only:
        "This account was created with Google/GitHub. Please sign in using the buttons above.",
    } as Record<string, string>,
    googleBtn: "Continue with Google",
    githubBtn: "Continue with GitHub",
    divider: "or continue with email",
    footnote:
      "By signing in, you use this free AI gateway for personal purposes. Passwords are stored as scrypt hashes — the original password is never stored.",
    modeLogin: "Sign in",
    modeSignup: "Create account",
    nameLabel: "Name",
    optional: "(optional)",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "name@email.com",
    passwordLabel: "Password",
    passwordHint: "(at least 8 characters)",
    invalidEmail: "The email format is invalid.",
    passwordShort: "The password must be at least 8 characters.",
    passwordRequired: "The password is required.",
    processing: "Processing…",
    submitLogin: "Sign in",
    submitSignup: "Create account",
    signupNote:
      "There is no email verification yet — your account is active right after signing up.",
    signupNoteVerify:
      "After signing up, a 6-digit verification code is sent to your email — the code is valid for 10 minutes.",
    verifyTitle: "Verify your email",
    verifySubtitle: "A 6-digit code has been sent to {email}. Enter it below.",
    codeLabel: "Verification code",
    codePlaceholder: "123456",
    verifySubmit: "Verify & create account",
    verifying: "Verifying…",
    resendBtn: "Resend code",
    resendCooldown: "Resend in {seconds}s",
    wrongEmail: "Wrong email? Sign up again",
    codeInvalid: "The code must be 6 digits.",
    codeSent: "A new code has been sent to your email.",
    errInvalidCode: "Wrong code — {remaining} attempts left.",
    errExpired: "The code has expired — please sign up again.",
    errTooMany: "Too many attempts — please sign up again.",
    errNotFound: "Verification not found — please sign up again.",
    errResendSoon: "Wait {seconds} seconds before requesting a new code.",
    errSendFailed: "Failed to send the code — please try again.",
    forgotLink: "Forgot your password?",
    forgotTitle: "Reset password",
    forgotSubtitle: "Enter your account email — we will send a 6-digit reset code.",
    forgotSend: "Send code",
    forgotSent: "If that email is registered, a reset code has been sent. Check your inbox (including spam).",
    forgotCodeLabel: "Reset code",
    forgotNewPassword: "New password",
    forgotConfirmPassword: "Confirm new password",
    forgotResetSubmit: "Reset password",
    forgotSuccess: "Your password has been changed — please sign in with your new password.",
    forgotBack: "Back to sign-in",
    forgotPasswordMismatch: "The password confirmation does not match.",
    forgotResend: "Didn't receive the code? Resend",
    errResetNotFound: "Reset not found — please request a new code.",
    errResetExpired: "The code has expired — please request a new code.",
    errResetTooMany: "Too many attempts — please request a new code.",
  },
  authError: {
    badge: "Google Sign-in",
    messages: {
      denied: {
        title: "Sign-in cancelled",
        body: "You declined permission on the Google page. No data was stored — please try again if you want to continue.",
      },
      missing_code: {
        title: "Missing sign-in code",
        body: "Google did not send an authorization code. Please sign in again from the beginning.",
      },
      bad_state: {
        title: "Invalid sign-in session",
        body: "The security state did not match — the sign-in page may have been open for too long. Please try again.",
      },
      not_configured: {
        title: "Google sign-in is not configured",
        body: "The server is missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. The site owner needs to follow docs/setup.md.",
      },
      no_session_secret: {
        title: "SESSION_SECRET is not configured",
        body: "The server is missing SESSION_SECRET (at least 32 random characters). The site owner needs to follow docs/setup.md.",
      },
      no_database: {
        title: "Database is not configured",
        body: "The server is missing DATABASE_URL. Sign-in needs a database to store accounts — the site owner needs to follow docs/setup.md.",
      },
      token_exchange_failed: {
        title: "Failed to exchange the sign-in code",
        body: "Google rejected the authorization code — it may already have been used or expired. Please sign in again.",
      },
      no_id_token: {
        title: "Google did not send an id_token",
        body: "Google's response was incomplete. Please sign in again.",
      },
      tokeninfo_failed: {
        title: "Failed to verify the Google token",
        body: "The token from Google could not be verified. Please sign in again.",
      },
      bad_audience: {
        title: "The Google token is not for this app",
        body: "The id_token audience does not match the server's GOOGLE_CLIENT_ID. Check the OAuth client configuration.",
      },
      bad_token: {
        title: "Incomplete Google token",
        body: "The token does not contain sub/email. Please sign in again.",
      },
      token_expired: {
        title: "Google token has expired",
        body: "Please sign in again.",
      },
      db_error: {
        title: "Failed to save the account",
        body: "The database refused to save your account — the migration may not have been run (npm run migrate). Please try again later.",
      },
      unknown: {
        title: "Sign-in failed",
        body: "An unexpected error occurred during sign-in. Please try again.",
      },
    } as Record<string, { title: string; body: string }>,
    retryBtn: "Try signing in again",
    homeBtn: "Back to home",
  },
  chat: {
    badge: "Playground",
    title: "Try the router live.",
    sub: "No sign-in, no key. Anonymous use is limited to 20 requests/minute per IP — sign in and use an API key for the 60/minute limit.",
    tryLiveNote:
      "Try it right here with no sign-up: write a question, pick a model below, then press Send. The answer streams in word by word.",
    loadingStatus: "loading status…",
    providersActive: "{configured}/{total} providers active",
    providerLabel: "Model / Provider",
    autoOption: "Auto (fallback chain)",
    needsKeySuffix: " (needs key)",
    temperatureLabel: "Temperature · {t}",
    maxTokensLabel: "Max tokens",
    systemShow: "System prompt",
    systemHide: "Hide system prompt",
    clearHistory: "Clear history",
    systemPlaceholder:
      "System prompt (optional), e.g. Answer briefly in English.",
    noProvidersWarning:
      "No provider is configured yet — this should not happen, because keyless Kilo & LLM7 are always active. Check the Provider section on the home page.",
    emptyTitle: "No messages yet.",
    emptyBody:
      "Type a message below to test the router. It works without an API key through Kilo & LLM7 — sign in and use an API key from the dashboard if you want the higher limit (60 req/min).",
    youLabel: "You",
    assistantLabel: "assistant",
    waiting: "waiting for a reply…",
    stopped: "(stopped)",
    streamInterrupted: "(stream interrupted)",
    emptyResponse: "(empty response)",
    composerPlaceholder:
      "Ask anything — e.g. Explain photosynthesis in one sentence. (Enter to send, Shift+Enter for a new line)",
    modelHint:
      "Your message goes to {model}. “Auto” tries every provider until one succeeds.",
    footerStats: "{configured}/{total} providers active · POST /api/ai/chat",
    stopBtn: "Stop",
    sendBtn: "Send",
    historyTitle: "Conversation history",
    newChat: "+ New chat",
    noConversations: "No saved conversations yet.",
    signInToSave: "Sign in to save your conversation history.",
    signInLink: "Sign in →",
    deleteConversation: "Delete",
    loadingConversations: "Loading history…",
    historyError: "History could not be loaded right now.",
    toggleHistory: "History",
    compareToggle: "Compare",
    compareModelA: "Model A",
    compareModelB: "Model B",
    compareQuotaNote:
      "Compare mode sends your prompt to two models at once — it uses 2 quota units per send (for signed-in users).",
    compareNoAnswer: "(no answer)",
    saveFailedNote: "Your message was sent, but it could not be saved to history.",
    errorLabel: "Error",
    sendFailed: "The message could not be sent — please check your connection and try again.",
    rateLimited: "Too many requests — please wait a moment before trying again.",
    invalidKey: "The API key is invalid or has been revoked.",
    serverNotConfigured: "The service is not configured on the server.",
    allProvidersFailed: "All providers failed to respond — please try again in a moment.",
    invalidRequest: "The request is not valid.",
    deleteFailed: "The conversation could not be deleted.",
  },
  images: {
    badge: "Playground",
    title: "Create free images.",
    sub: "Write a prompt, pick a model and size — the image is generated directly (Flux / Turbo), with no sign-in and no API key.",
    promptLabel: "Prompt",
    promptPlaceholder:
      "Describe the image you want, e.g. an orange cat sitting by a window in the rain, watercolor painting style.",
    modelLabel: "Model",
    modelFluxDesc: "Flux — best quality, slightly slower.",
    modelTurboDesc: "Turbo — fastest, good quality.",
    sizeLabel: "Size",
    generate: "Generate image",
    generating: "Generating image…",
    resultTitle: "Result",
    download: "Download image",
    copyUrl: "Copy URL",
    copied: "copied ✓",
    newImage: "New image",
    emptyPrompt: "The prompt is empty — please describe the image you want first.",
    failed:
      "The image could not be generated. The image service may be busy — please try again in a moment.",
    directNote:
      "This playground generates images directly from your browser. To use image generation from code, use the /api/v1/images/generations endpoint with an API key — see the documentation.",
    loadingImage: "Loading image…",
  },
  status: {
    badge: "Status",
    title: "Provider status.",
    sub: "The state of each provider: configured or locked, requests in the last 24 hours, last success, and average latency.",
    dataNote:
      "The data below comes from authenticated (API key) requests in the last 24 hours recorded in the database. Anonymous playground requests are not recorded, so a provider used only anonymously may read “no data yet” even while it is active.",
    configuredBadge: "active",
    lockedBadge: "needs key",
    requests24h: "requests · 24h",
    lastSuccess: "last success",
    avgLatency: "average latency",
    noData: "no data yet",
    neverSucceeded: "no success yet",
    modelLabel: "model",
    freeTierLabel: "free tier",
    updatedNow: "Data is refreshed every time the page loads.",
  },
  docs: {
    badge: "Documentation",
    title: "API Docs",
    introA: "Two ways to use the router: the OpenAI-compatible gateway",
    introB: "(using an API key from the dashboard) and the simple endpoint",
    introC: "(anonymous or with a key).",
    domainNoteA: "Replace",
    domainNoteB: "with your deployment domain, e.g. https://hymn-router.vercel.app",
    quickstartEyebrow: "Quick Start",
    quickstartTitle: "Short guide",
    quickstartSteps: [
      {
        title: "1. Sign in / Create account",
        body: "Create an account at /login with Google, GitHub, or email.",
        cta: "Open /login",
      },
      {
        title: "2. Create an API key",
        body: "In the dashboard, create a new key and copy it — the key is only shown once.",
        cta: "Open dashboard",
      },
      {
        title: "3. Send your first request",
        body: "Call POST /api/v1/chat/completions with the hymn/auto model — or try it without a key in /chat.",
        cta: "Open playground",
      },
    ],
    loginEyebrow: "Account",
    loginTitle: "How to sign in",
    loginCardTitle: "Three ways in, one account",
    loginItems: [
      [
        { t: "Sign in at " },
        { c: "/login" },
        {
          t: " with email + password, Google, or GitHub (GitHub is active if the server has its OAuth App configured).",
        },
      ],
      [
        {
          t: "Sign up with email: passwords must be at least 8 characters and are stored as scrypt hashes — the original password is never stored.",
        },
      ],
      [
        {
          t: "One email = one account: if you sign up with email and then sign in with Google/GitHub using the same email, the accounts are linked automatically — any sign-in method leads to the same account.",
        },
      ],
      [
        {
          t: "Email sign-up uses a 6-digit verification code sent to your email — the code is valid for 10 minutes and can be resent.",
        },
      ],
      [
        {
          t: "Forgot your password: request a 6-digit reset code from the sign-in page — the code is valid for 10 minutes, then set a new password.",
        },
      ],
      [
        {
          t: "Sign-in is limited to 10 attempts per 15 minutes per IP (anti brute force). Sign-in error messages are deliberately generic so registered emails cannot be guessed.",
        },
      ],
    ] as Rich[],
    v1Eyebrow: "Gateway",
    v1Title: "API v1 — OpenAI-compatible",
    v1CardTitle: "How it works",
    v1Items: [
      [
        { t: "A single gateway, " },
        { c: "POST /api/v1/chat/completions" },
        {
          t: ", with the OpenAI request/response format. The OpenAI SDK, cURL, and plain fetch all work right away — just change the base URL.",
        },
      ],
      [
        { t: "The " },
        { c: "Authorization: Bearer hr_..." },
        { t: " header is required, with an API key from the dashboard. No key / invalid key → 401." },
      ],
      [
        { c: "model" },
        { t: " can be " },
        { c: "hymn/auto" },
        { t: " (default, full fallback chain), a provider id (e.g. " },
        { c: "groq" },
        { t: "), a model id (e.g. " },
        { c: "openai/gpt-oss-120b" },
        { t: "), or an OpenRouter model ending in " },
        { c: ":free" },
        { t: " (e.g. " },
        { c: "google/gemma-4-26b-a4b-it:free" },
        {
          t: "). Unknown model → 404. The full list (live, may change) is on the /models page.",
        },
      ],
      [
        { c: "stream: true" },
        { t: " returns OpenAI-compatible SSE (chunks of " },
        { c: "choices[0].delta" },
        { t: ", ending with " },
        { c: "[DONE]" },
        { t: "). See the Streaming section below." },
      ],
      [
        {
          t: "Rate limit: 60 requests/minute per API key (above that → 429). Free plan daily quota: 100 requests/day per user, resetting at 00:00 WIB (exhausted → 429 ",
        },
        { c: "quota_exceeded" },
        { t: "). Remaining quota is visible in the dashboard and in the " },
        { c: "X-Quota-Remaining" },
        { t: " header." },
      ],
      [
        {
          t: "Usage is recorded in the dashboard: requests, tokens, provider, model, a daily chart, and recent requests.",
        },
      ],
      [{ t: "If all providers fail → 502, with each provider's reason." }],
    ] as Rich[],
    v1CodeTitles: [
      "POST /api/v1/chat/completions — cURL",
      "POST /api/v1/chat/completions — Python (OpenAI SDK)",
      "POST /api/v1/chat/completions — success response (200)",
      "GET /api/v1/models — model list (no auth)",
    ],
    streamEyebrow: "Real-time",
    streamTitle: "Streaming (SSE)",
    streamCardTitle: "How it works",
    streamItems: [
      [
        { t: "Send " },
        { c: "stream: true" },
        {
          t: " in the /v1 body (or /api/ai/chat) to receive tokens one by one over Server-Sent Events. The chunk format is the same as OpenAI: text deltas in ",
        },
        { c: "choices[0].delta.content" },
        { t: ", the final chunk carries " },
        { c: "finish_reason" },
        { t: ", then the line " },
        { c: "data: [DONE]" },
        { t: "." },
      ],
      [
        {
          t: "The router waits for the first token from the provider before responding — so if the first provider fails, fallback to the next provider still works before the stream starts.",
        },
      ],
      [
        {
          t: "If a provider does not support streaming, the router uses a non-stream response and sends it as a single delta chunk. Clients never need to handle two formats.",
        },
      ],
      [
        {
          t: "Token usage in the dashboard: if the provider reports usage in the stream, those numbers are used; otherwise tokens are estimated from text length (±4 characters per token). This estimate is only for the dashboard and is not sent to the client.",
        },
      ],
      [
        { t: "The /api/ai/chat endpoint sends one extra event at the start of the stream: " },
        { c: "event: meta" },
        {
          t: " with the provider, model, and providers that failed along the way. The /v1 endpoint sends no meta (strictly OpenAI-compatible).",
        },
      ],
    ] as Rich[],
    streamCodeTitles: [
      "Streaming — cURL (use -N to disable buffering)",
      "Streaming — Python (OpenAI SDK, stream=True)",
    ],
    imagesEyebrow: "Images",
    imagesTitle: "Image generation (/api/v1/images)",
    imagesCardTitle: "How it works",
    imagesItems: [
      [
        { t: "The " },
        { c: "POST /api/v1/images/generations" },
        { t: " endpoint creates images (free, no provider key). Models: " },
        { c: "flux" },
        { t: " (best quality) or " },
        { c: "turbo" },
        { t: " (fastest)." },
      ],
      [
        { t: "Body: " },
        { c: "prompt" },
        { t: " (required, 1–4000 characters), " },
        { c: "model" },
        { t: " (default " },
        { c: "flux" },
        { t: "), " },
        { c: "size" },
        { t: " (\"1024x1024\", \"512x512\", \"1024x1792\", \"1792x1024\"), " },
        { c: "n" },
        { t: " (only 1), " },
        { c: "seed" },
        { t: " (optional, for repeatable results)." },
      ],
      [
        { t: "The " },
        { c: "Authorization: Bearer hr_..." },
        { t: " header is required (API key from the dashboard). The response contains both " },
        { c: "data[0].url" },
        { t: " and " },
        { c: "data[0].b64_json" },
        { t: " — images over ~3 MB return only the url." },
      ],
      [
        { t: "One image = 1 unit of daily quota (100 requests/day) and is recorded in the dashboard. Rate limit: 60 requests/minute per key." },
      ],
      [
        { t: "The /images playground generates images directly from the browser (no key) — for trying prompts without spending quota." },
      ],
    ] as Rich[],
    imagesCodeTitles: ["POST /api/v1/images/generations — cURL"],
    errorsEyebrow: "Reference",
    errorsTitle: "Error codes",
    errors: [
      {
        code: "400",
        name: "invalid_request_error",
        desc: "Invalid body: empty messages / more than 50 messages, unknown role, content over 20,000 characters, temperature outside 0–2, max_tokens outside 1–8192, or stream not a boolean.",
      },
      {
        code: "401",
        name: "invalid_api_key",
        desc: "Missing Authorization header, invalid key, or revoked key. Create a new key in the dashboard.",
      },
      {
        code: "404",
        name: "model_not_found",
        desc: "Unknown model. Use \"hymn/auto\", a provider id, a model id from GET /api/v1/models, or an OpenRouter model ending in \":free\".",
      },
      {
        code: "429",
        name: "rate_limit_exceeded",
        desc: "Above 60 requests/minute per API key (or 20/minute per IP for anonymous /api/ai/chat).",
      },
      {
        code: "429",
        name: "quota_exceeded",
        desc: "The free daily quota (100 requests/day) is exhausted. The response includes retry_after (seconds) and a Retry-After header; reset at 00:00 WIB.",
      },
      {
        code: "502",
        name: "all_providers_failed",
        desc: "All providers failed (429 / 5xx / timeout). The error message contains each provider's reason.",
      },
      {
        code: "503",
        name: "model_unavailable",
        desc: "A :free model was requested but the server has not configured OPENROUTER_API_KEY.",
      },
      {
        code: "503",
        name: "server_not_configured",
        desc: "DATABASE_URL is not set on the server — API keys cannot be validated yet.",
      },
    ],
    chatEyebrow: "Simple",
    chatTitle: "API /api/ai/chat",
    chatCardTitle: "How it works",
    chatItems: [
      [
        { t: "The simple endpoint " },
        { c: "POST /api/ai/chat" },
        {
          t: " calls the free providers (Groq, NVIDIA, Gemini, OpenRouter, Mistral, Kilo, LLM7, Pollinations, OVH) in order until one succeeds.",
        },
      ],
      [
        {
          t: "Anonymous: rate limit of 20 requests/minute per IP, with no daily quota. With the ",
        },
        { c: "Authorization: Bearer hr_..." },
        {
          t: " header: a 60/minute per-key limit, usage recorded in the dashboard, and the 100 requests/day daily quota applies. An invalid Bearer → 401 (no anonymous fallback).",
        },
      ],
      [
        { t: "Add " },
        { c: "stream: true" },
        { t: " to the body for SSE (same format as /v1, plus an " },
        { c: "event: meta" },
        {
          t: " at the start with the provider/model). The /chat playground uses this mode.",
        },
      ],
      [
        {
          t: "A provider hit by 429 / 5xx / timeout enters a 60-second cooldown, then is retried on the next request.",
        },
      ],
      [
        {
          t: "All provider API keys are only read server-side from env. No key is ever sent to the browser.",
        },
      ],
      [
        {
          t: "If all providers fail, the response is a 502 with each provider's reason — so it is easy to debug.",
        },
      ],
    ] as Rich[],
    chatCodeTitles: [
      "POST /api/ai/chat — curl",
      "POST /api/ai/chat — request body",
      "POST /api/ai/chat — success response (200)",
      "GET /api/ai/chat — provider status (no key, safe to open)",
    ],
    limitsEyebrow: "Notes",
    limitsTitle: "Limits & privacy",
    limitsCardTitle: "Things to keep in mind",
    limitsItems: [
      [
        { t: "Free tiers change over time: OpenRouter " },
        { c: ":free" },
        { t: " models can disappear or become paid at any time. Check " },
        { c: "https://openrouter.ai/api/v1/models" },
        { t: " if a model returns 404." },
      ],
      [
        {
          t: "Never send sensitive data through this router — prompts on free tiers may be used by providers to improve their products or recorded in logs. This server itself does not store prompts or responses; only request counts, tokens, providers, and latency are recorded.",
        },
      ],
      [
        {
          t: "Statistics in the Provider section are per server process and reset on restart. Per-user usage history (dashboard) is stored permanently in the database.",
        },
      ],
    ] as Rich[],
  },
  models: {
    badge: "Model Catalog",
    title: "Models",
    introA:
      "Every model usable through Hymn Router — free. Copy the model id into the",
    introB: "field in",
    introC:
      ". Context windows come from OpenRouter data; when there is no data it reads “unknown”.",
    routerTitle: "Router Models",
    routerActive: "{configured}/{total} active",
    routerIntroA: "The default model of each provider. Use",
    routerIntroB: "for automatic fallback, a provider id (e.g.",
    routerIntroC:
      ") to prioritize one provider, or the exact model id below.",
    autoDesc:
      "Automatic router — tries all {total} providers in order until one succeeds. The default choice if you are not sure which model to use.",
    recommended: "recommended",
    statusActive: "active",
    statusNeedsKey: "needs key",
    contextLabel: "context",
    unknownContext: "unknown",
    contextTokens: "{n} tokens",
    accessLabel: "access",
    needsServerKey: "needs a server API key",
    noKey: "keyless",
    freeTitle: "Model :free OpenRouter",
    orConfigured: "configured",
    orNotConfigured: "no key yet",
    freeIntroA:
      "Free models from OpenRouter — send their id exactly as shown below in the",
    freeIntroB:
      "field to /v1 and the router forwards it to OpenRouter. Only models ending in",
    freeIntroC:
      "are allowed. This list is live from OpenRouter (1-hour cache) and can change at any time.",
    freeNotConfiguredA: "The server has not configured",
    freeNotConfiguredB: " yet, so these models cannot be used right now.",
    catalogErrorTitle: "The OpenRouter catalog could not be loaded right now.",
    catalogErrorBody:
      "Please reload the page later. The router models above still work as usual.",
    searchPlaceholder: "Search {n} :free models…",
    searchAria: "Search :free models",
    noMatch: "No models match “{q}”.",
    imageTitle: "Image Models",
    imageIntroA: "Image generation models — used in",
    imageIntroB: "and the /images playground. One image = 1 unit of daily quota.",
    fluxDesc: "Best quality, slightly slower. Good for detailed images.",
    turboDesc: "Fastest, good quality. Good for quick iterations.",
    sizesLabel: "sizes",
    endpointLabel: "endpoint",
  },
  dashboard: {
    dbErrorTitle: "The database is having issues",
    dbErrorBody:
      "The dashboard cannot load your data right now — the database connection may have failed briefly. Please reload this page in a moment; your sign-in session is not lost.",
    greeting: "Hello,",
    nameFallback: "there",
    signedInWith: "Signed in with",
    requestsDays: "requests · last {days} days",
    tokensTotal: "total tokens",
    tokensCount: "{n} tokens",
    tokensPrompt: "prompt tokens",
    tokensCompletion: "completion tokens",
    quotaTitle: "Daily quota · Free plan",
    quotaUsed: "{used}/{limit} requests today",
    quotaRemaining: "{n} requests remaining.",
    quotaExhausted:
      "Today's quota is exhausted — /v1 requests will be rejected with 429 until the reset.",
    quotaReset:
      "Resets {date} WIB · applies to authenticated /v1 requests (including /api/ai/chat with a key).",
    perProvider: "Per provider",
    noRequests:
      "No requests recorded in the last {days} days. Create an API key below and send your first request.",
    noRequestsShort: "No requests recorded in the last {days} days.",
    perModel: "Per model",
    last7days: "Last 7 days",
    noDailyData: "No daily data yet.",
    chartNote:
      "The number above each bar is the request count (WIB). Hover a bar to see tokens.",
    chartTooltip: "{date}: {requests} requests · {tokens} tokens",
    perKey: "Per API key",
    unnamedKey: "unnamed key",
    recentTitle: "Recent requests",
    noRecent: "No requests recorded yet.",
    thTime: "Time",
    thModel: "Model",
    thProvider: "Provider",
    thTokens: "Tokens",
    thLatency: "Latency",
    thKey: "Key",
    keysTitle: "API key",
    keysActive: "{n} active",
    keysLimit: "limit 60 req/min per key",
    keyNamePlaceholder: "Key name, e.g. bot-discord",
    creating: "Creating…",
    createKey: "Create new key",
    copyNewKey: "Copy this key now — it cannot be seen again afterwards.",
    copiedBtn: "copied ✓",
    copyKeyBtn: "Copy key",
    noKeys: "No API keys yet. Create one above to start using the gateway.",
    revoked: "revoked",
    active: "active",
    createdLabel: "Created",
    lastUsedLabel: "Last used",
    neverUsed: "never",
    revokeBtn: "Revoke",
    thName: "Name",
    thCreated: "Created",
    thLastUsed: "Last used",
    thStatus: "Status",
    quickstartTitle: "quickstart — cURL",
    quickstartA:
      "Replace hr_KEY_ANDA with an API key from the table above. The model can also be a provider id (e.g. \"groq\"), a model id from GET ",
    quickstartB:
      "/api/v1/models, or an OpenRouter model ending in \":free\". Streaming is supported: add ",
    quickstartC:
      " and read the SSE. Free plan quota: 100 requests/day, resetting at 00:00 WIB. Full details in /docs.",
    guideTitle: "Next step: create your first API key",
    guideBody:
      "You do not have an API key yet — without one, the /v1 gateway cannot be used from code. Create one below (free, 1 minute), then paste it into your code. Or try the chat playground first without a key.",
    guideCta: "Create API Key",
    guideChatLink: "Try the chat without a key →",
    keyCreateFailed: "The API key could not be created — please try again in a moment.",
    keyRevokeFailed: "The API key could not be revoked — please try again in a moment.",
    keyInvalidName: "The key name is required (1–64 characters).",
    keyNotFound: "The API key was not found or has already been revoked.",
    sessionExpired: "Your session has ended — please sign in again.",
    serverError: "A server error occurred — please try again in a moment.",
  },
  common: {
    copy: "copy",
    copied: "copied ✓",
    copyLabel: "Copy",
    copiedLabel: "Copied!",
    tryAgain: "Try again",
    loading: "Loading…",
  },
};

export const dict: Record<Locale, Dict> = { id, en };
