/**
 * GET    /api/chat/conversations/[id] — isi percakapan + pesan-pesannya.
 * DELETE /api/chat/conversations/[id] — hapus percakapan (+ pesannya).
 *
 * Hanya pemilik yang bisa mengakses; percakapan orang lain / tidak ada
 * → 404 (tidak membocorkan keberadaannya). 401 kalau belum login.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { deleteConversation, getConversation } from "@/lib/chat-history";
import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

async function requireUser(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    return { user, dbError: false };
  } catch (err) {
    console.error("[chat/conversations/[id]] database error:", err);
    return { user: null, dbError: true };
  }
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user, dbError } = await requireUser(req);
  if (dbError) {
    return NextResponse.json(
      { error: "database_error: gagal mengakses database, silakan coba lagi sebentar" },
      { status: 503 },
    );
  }
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "database_error: DATABASE_URL belum dikonfigurasi di server" },
      { status: 503 },
    );
  }
  try {
    const result = await getConversation(id, user.id);
    if (!result) {
      return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[chat/conversations/[id]] get gagal:", err);
    return NextResponse.json(
      { error: "database_error: gagal memuat percakapan" },
      { status: 503 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user, dbError } = await requireUser(req);
  if (dbError) {
    return NextResponse.json(
      { error: "database_error: gagal mengakses database, silakan coba lagi sebentar" },
      { status: 503 },
    );
  }
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "database_error: DATABASE_URL belum dikonfigurasi di server" },
      { status: 503 },
    );
  }
  try {
    const deleted = await deleteConversation(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat/conversations/[id]] delete gagal:", err);
    return NextResponse.json(
      { error: "database_error: gagal menghapus percakapan" },
      { status: 503 },
    );
  }
}
