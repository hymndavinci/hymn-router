/**
 * GET  /api/chat/conversations — daftar percakapan milik user (login wajib).
 * POST /api/chat/conversations — buat percakapan baru { title?, model? }.
 *
 * 401 kalau belum login, 503 kalau DB bermasalah.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { createConversation, listConversations } from "@/lib/chat-history";
import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

async function requireUser(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    return { user, dbError: false };
  } catch (err) {
    console.error("[chat/conversations] database error:", err);
    return { user: null, dbError: true };
  }
}

export async function GET(req: NextRequest) {
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
    const conversations = await listConversations(user.id);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[chat/conversations] list gagal:", err);
    return NextResponse.json(
      { error: "database_error: gagal memuat percakapan" },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { title, model } = (body ?? {}) as { title?: unknown; model?: unknown };
  if (title !== undefined && (typeof title !== "string" || title.length > 200)) {
    return NextResponse.json(
      { error: "title harus string (maks 200 karakter)" },
      { status: 400 },
    );
  }
  if (model !== undefined && (typeof model !== "string" || model.length > 200)) {
    return NextResponse.json(
      { error: "model harus string (maks 200 karakter)" },
      { status: 400 },
    );
  }

  try {
    const conversation = await createConversation(
      user.id,
      typeof title === "string" && title.trim() !== "" ? title.trim() : null,
      typeof model === "string" ? model : null,
    );
    if (!conversation) {
      return NextResponse.json(
        { error: "database_error: gagal membuat percakapan" },
        { status: 503 },
      );
    }
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    console.error("[chat/conversations] create gagal:", err);
    return NextResponse.json(
      { error: "database_error: gagal membuat percakapan" },
      { status: 503 },
    );
  }
}
