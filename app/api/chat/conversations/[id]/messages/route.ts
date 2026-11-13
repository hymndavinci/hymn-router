/**
 * POST /api/chat/conversations/[id]/messages — tambah pesan ke percakapan.
 *
 * Body: { role: "user" | "assistant", content: string (1–20000 karakter) }.
 * Dipakai playground /chat saat user login: pesan user dikirim setelah
 * kirim, pesan asisten setelah stream selesai. Judul percakapan otomatis
 * diisi dari pesan user pertama (maks ~40 karakter) kalau masih default.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { addMessage } from "@/lib/chat-history";
import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let user;
  try {
    user = await getSessionUserFromRequest(req);
  } catch (err) {
    console.error("[chat/messages] database error:", err);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { role, content } = (body ?? {}) as { role?: unknown; content?: unknown };
  if (role !== "user" && role !== "assistant") {
    return NextResponse.json(
      { error: 'role harus "user" atau "assistant"' },
      { status: 400 },
    );
  }
  if (typeof content !== "string" || content.length === 0 || content.length > 20_000) {
    return NextResponse.json(
      { error: "content harus string (1–20000 karakter)" },
      { status: 400 },
    );
  }

  try {
    const result = await addMessage(id, user.id, role, content);
    if (!result) {
      return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[chat/messages] add gagal:", err);
    return NextResponse.json(
      { error: "database_error: gagal menyimpan pesan" },
      { status: 503 },
    );
  }
}
