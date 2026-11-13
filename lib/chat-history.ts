/**
 * chat-history.ts — CRUD riwayat percakapan tersimpan (server-side only).
 *
 * Semua query memfilter user_id: percakapan hanya bisa diakses pemiliknya.
 * Fungsi-fungsi ini MELEMPAR kalau query DB gagal (caller membalas 503);
 * mengembalikan null/[] hanya kalau DB tidak terkonfigurasi.
 */

import { getDb } from "./db";

export type Conversation = {
  id: string;
  title: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

/** Judul otomatis: pesan pertama user, dipotong ~40 karakter.
 * Nilai default "Percakapan baru" adalah SENTINEL yang disimpan di DB
 * (juga DEFAULT di migrasi 003): addMessage memakai kecocokan persis
 * dengannya untuk mengenali judul yang belum diganti dan memberi judul
 * otomatis dari pesan pertama. Lapisan tampilan (chat-playground)
 * menerjemahkan sentinel ini ke bahasa aktif — jangan ganti nilai
 * simpanannya tanpa migrasi. */
export function titleFromMessage(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 40) return oneLine || "Percakapan baru";
  return `${oneLine.slice(0, 40).trimEnd()}…`;
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const db = getDb();
  if (!db) return [];
  const rows = (await db`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 50
  `) as {
    id: string;
    title: string;
    model: string | null;
    created_at: string;
    updated_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    model: r.model,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createConversation(
  userId: string,
  title: string | null,
  model: string | null,
): Promise<Conversation | null> {
  const db = getDb();
  if (!db) return null;
  const rows = (await db`
    INSERT INTO conversations (user_id, title, model)
    VALUES (${userId}, ${title ?? "Percakapan baru"}, ${model})
    RETURNING id, title, model, created_at, updated_at
  `) as {
    id: string;
    title: string;
    model: string | null;
    created_at: string;
    updated_at: string;
  }[];
  const r = rows[0];
  return {
    id: r.id,
    title: r.title,
    model: r.model,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getConversation(
  conversationId: string,
  userId: string,
): Promise<{ conversation: Conversation; messages: SavedMessage[] } | null> {
  const db = getDb();
  if (!db) return null;
  const conv = (await db`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    WHERE id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `) as {
    id: string;
    title: string;
    model: string | null;
    created_at: string;
    updated_at: string;
  }[];
  if (conv.length === 0) return null;
  const rows = (await db`
    SELECT id, role, content, created_at
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT 200
  `) as { id: string; role: string; content: string; created_at: string }[];
  const c = conv[0];
  return {
    conversation: {
      id: c.id,
      title: c.title,
      model: c.model,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    },
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      createdAt: r.created_at,
    })),
  };
}

export async function deleteConversation(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const rows = (await db`
    DELETE FROM conversations
    WHERE id = ${conversationId} AND user_id = ${userId}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

/**
 * Tambah pesan ke percakapan milik user. Mengembalikan pesan + judul
 * terbaru (judul otomatis diisi dari pesan user pertama kalau judul
 * masih default). Null kalau percakapan tidak ada / bukan milik user.
 */
export async function addMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<{ message: SavedMessage; title: string } | null> {
  const db = getDb();
  if (!db) return null;
  const conv = (await db`
    SELECT id, title FROM conversations
    WHERE id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  `) as { id: string; title: string }[];
  if (conv.length === 0) return null;

  const rows = (await db`
    INSERT INTO messages (conversation_id, role, content)
    VALUES (${conversationId}, ${role}, ${content})
    RETURNING id, role, content, created_at
  `) as { id: string; role: string; content: string; created_at: string }[];

  let title = conv[0].title;
  // Judul otomatis: pesan user pertama + judul masih default.
  if (role === "user" && title === "Percakapan baru") {
    const count = (await db`
      SELECT COUNT(*)::int AS n FROM messages
      WHERE conversation_id = ${conversationId} AND role = 'user'
    `) as { n: number }[];
    if ((count[0]?.n ?? 0) <= 1) {
      title = titleFromMessage(content);
    }
  }
  await db`
    UPDATE conversations
    SET updated_at = now(), title = ${title}
    WHERE id = ${conversationId}
  `;
  const r = rows[0];
  return {
    message: { id: r.id, role: r.role, content: r.content, createdAt: r.created_at },
    title,
  };
}
