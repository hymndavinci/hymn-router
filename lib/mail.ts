/**
 * mail.ts — kirim email lewat Resend REST API (fetch bawaan, tanpa
 * dependensi baru).
 *
 * Env:
 * - RESEND_API_KEY: kunci API Resend (wajib; tanpa ini pengiriman
 *   email tidak aktif — signup memakai fallback langsung-aktif, reset
 *   password mengembalikan 503).
 * - RESEND_FROM_EMAIL: alamat pengirim (default
 *   "noreply@hymnrouter.my.id"). Domain pengirim harus terverifikasi
 *   di Resend sebelum dipakai mengirim ke email sembarang.
 *
 * Server-side only. API key dan kode verifikasi TIDAK PERNAH di-log.
 */

import type { Locale } from "./i18n";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "noreply@hymnrouter.my.id";

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

function getFrom(): string {
  const v = process.env.RESEND_FROM_EMAIL?.trim();
  return v && v !== "" ? v : DEFAULT_FROM;
}

type MailCopy = {
  subject: string;
  heading: string;
  intro: string;
  expiry: string;
  footer: string;
};

const VERIFY_COPY: Record<Locale, MailCopy> = {
  id: {
    subject: "Kode verifikasi Hymn Router Anda",
    heading: "Kode verifikasi Anda",
    intro: "Masukkan kode berikut untuk menyelesaikan pendaftaran akun Hymn Router Anda.",
    expiry: "Kode ini berlaku selama 10 menit.",
    footer: "Jika Anda tidak meminta kode ini, abaikan email ini.",
  },
  en: {
    subject: "Your Hymn Router verification code",
    heading: "Your verification code",
    intro: "Enter the code below to finish creating your Hymn Router account.",
    expiry: "This code is valid for 10 minutes.",
    footer: "If you did not request this code, ignore this email.",
  },
};

const RESET_COPY: Record<Locale, MailCopy> = {
  id: {
    subject: "Kode reset password Hymn Router Anda",
    heading: "Kode reset password Anda",
    intro: "Masukkan kode berikut untuk mengatur ulang password akun Hymn Router Anda.",
    expiry: "Kode ini berlaku selama 10 menit.",
    footer: "Jika Anda tidak meminta reset password, abaikan email ini — password Anda tidak berubah.",
  },
  en: {
    subject: "Your Hymn Router password reset code",
    heading: "Your password reset code",
    intro: "Enter the code below to reset the password of your Hymn Router account.",
    expiry: "This code is valid for 10 minutes.",
    footer: "If you did not request a password reset, ignore this email — your password will not change.",
  },
};

function buildHtml(copy: MailCopy, code: string): string {
  return [
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0c0c0c;">`,
    `<h1 style="font-size:20px;margin:0 0 8px;">Hymn Router</h1>`,
    `<h2 style="font-size:16px;margin:0 0 12px;">${copy.heading}</h2>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 16px;">${copy.intro}</p>`,
    `<div style="border:2px solid #0c0c0c;background:#ffdc00;text-align:center;padding:16px 8px;font-size:32px;font-weight:700;letter-spacing:8px;">${code}</div>`,
    `<p style="font-size:13px;line-height:1.6;margin:16px 0 0;color:#555;">${copy.expiry}</p>`,
    `<p style="font-size:13px;line-height:1.6;margin:8px 0 0;color:#555;">${copy.footer}</p>`,
    `</div>`,
  ].join("");
}

function buildText(copy: MailCopy, code: string): string {
  return [
    "Hymn Router",
    "",
    copy.heading,
    "",
    copy.intro,
    "",
    code,
    "",
    copy.expiry,
    copy.footer,
  ].join("\n");
}

async function sendMail(to: string, copy: MailCopy, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum dikonfigurasi");
  }
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFrom(),
      to: [to],
      subject: copy.subject,
      html: buildHtml(copy, code),
      text: buildText(copy, code),
    }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: unknown };
      if (typeof data.message === "string" && data.message) detail = data.message;
    } catch {
      // biarkan detail HTTP
    }
    throw new Error(`Resend menolak pengiriman email: ${detail}`);
  }
}

/** Kirim kode verifikasi pendaftaran ke email pengguna. */
export async function sendVerificationCode(
  email: string,
  code: string,
  locale: Locale,
): Promise<void> {
  await sendMail(email, VERIFY_COPY[locale], code);
}

/** Kirim kode reset password ke email pengguna. */
export async function sendPasswordResetCode(
  email: string,
  code: string,
  locale: Locale,
): Promise<void> {
  await sendMail(email, RESET_COPY[locale], code);
}
