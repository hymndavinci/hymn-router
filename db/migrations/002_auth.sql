-- Hymn Router — auth email/password + GitHub OAuth (idempotent).
-- Jalankan: npm run migrate (butuh DATABASE_URL).
--
-- PENTING: google_sub di 001 dibuat NOT NULL karena waktu itu hanya ada
-- login Google. Akun email/password dan GitHub tidak punya google_sub,
-- jadi kolom itu harus boleh NULL mulai migrasi ini. Unique index tetap
-- berlaku untuk nilai non-NULL; banyak NULL diizinkan di Postgres.
ALTER TABLE users ALTER COLUMN google_sub DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- Email unik: membuat pengecekan "email sudah terdaftar" di signup
-- aman dari race, dan membuat penautan akun lewat email (Google/GitHub
-- login ke akun email yang sama) tidak ambigu. Email selalu disimpan
-- lowercase oleh aplikasi.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
