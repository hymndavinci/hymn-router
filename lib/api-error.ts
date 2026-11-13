/**
 * Error API dengan `code` stabil (mesin).
 *
 * Pesan `error` dari API sengaja tidak diterjemahkan — teksnya campuran
 * Indonesia/Inggris (keputusan lama). UI TIDAK BOLEH menampilkan pesan
 * mentah itu ke pengguna: tangkap `code` dari respons, lalu petakan ke
 * pesan lokal lewat kamus (lib/i18n.ts).
 */

export type CodedError = Error & { code?: string };

/** Buat Error yang membawa `code` stabil dari respons API. */
export function codedError(message: string, code?: string): CodedError {
  const err = new Error(message) as CodedError;
  if (code) err.code = code;
  return err;
}

/** Ambil `code` dari error yang dilempar, bila ada. */
export function errorCode(err: unknown): string | undefined {
  return err instanceof Error ? (err as CodedError).code : undefined;
}
