-- Hymn Router — verifikasi email signup + reset password via kode (idempotent).
-- Jalankan: npm run migrate (butuh DATABASE_URL).
--
-- Pendaftaran email memakai kode 6 digit yang dikirim ke inbox pengguna
-- (Resend). Akun baru dibuat HANYA setelah kode benar — sebelum itu data
-- signup menunggu di pending_signups. Kode TIDAK PERNAH disimpan mentah,
-- hanya hash scrypt-nya (format sama seperti password_hash).
--
-- Lupa password memakai pola yang sama di password_resets: kode benar
-- mengizinkan penggantian password_hash user. Kode berlaku 10 menit,
-- maksimal 5 percobaan, kirim ulang minimal 60 detik setelah kirim
-- terakhir. Baris kedaluwarsa / habis percobaan dihapus oleh API saat
-- diakses (tidak ada cron pembersih — satu baris per email, ditimpa
-- oleh pendaftaran/reset berikutnya).

CREATE TABLE IF NOT EXISTS pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
