-- Hymn Router — riwayat percakapan tersimpan (idempotent).
-- Jalankan: npm run migrate (butuh DATABASE_URL).
--
-- Percakapan playground yang disimpan milik user yang login. User anonim
-- tidak punya baris di sini (riwayat mereka hanya di localStorage browser).
-- Isi pesan disimpan apa adanya — user yang login memilih sendiri untuk
-- menyimpan percakapannya (bukan pencatatan diam-diam: dashboard usage
-- tetap hanya mencatat jumlah request/token, bukan isi pesan).

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Percakapan baru',
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
