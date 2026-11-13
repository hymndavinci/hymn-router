/**
 * think-strip.ts — hapus chain-of-thought (reasoning) dari jawaban model.
 *
 * Model reasoning (gpt-oss, Nemotron) kadang membocorkan proses berpikirnya
 * ke teks jawaban — sebagai blok <think>...</think> / <thinking>...</thinking>
 * atau sebagai field reasoning terpisah. File ini berisi pemotong blok
 * think untuk teks utuh (stripThinkBlocks) dan untuk stream per-chunk
 * (ThinkStripper, state machine yang tahan tag terbelah antar chunk).
 *
 * Client-safe: tanpa import server — dipakai lib/free-ai-router.ts dan
 * components/chat-playground.tsx (jaring pengaman kedua).
 */

const OPEN_RE = /<think(ing)?\s*>/i;
const CLOSE_RE = /<\/think(ing)?\s*>/i;

/**
 * Hapus semua blok <think>...</think> dan <thinking>...</thinking> dari
 * teks utuh. Tag pembuka tanpa penutup: semua teks setelahnya dibuang
 * (itu reasoning yang tidak selesai). Hasil di-trim.
 */
export function stripThinkBlocks(text: string): string {
  let out = text;
  // Ulangi: blok bisa bersarang / berurutan.
  for (let i = 0; i < 10; i++) {
    const open = OPEN_RE.exec(out);
    if (!open) break;
    const afterOpen = out.slice(open.index + open[0].length);
    const close = CLOSE_RE.exec(afterOpen);
    if (!close) {
      // Tag pembuka tanpa penutup — buang dari tag sampai akhir.
      out = out.slice(0, open.index);
      break;
    }
    out =
      out.slice(0, open.index) +
      afterOpen.slice(close.index + close[0].length);
  }
  return out.trim();
}

/** Panjang maksimum tag yang mungkin terbelah antar chunk ("</thinking>" = 11). */
const MAX_TAG_LEN = 11;

/** Suffix terpanjang dari `s` yang merupakan prefix dari salah satu tag. */
function heldTagSuffix(s: string, tags: string[]): string {
  const lower = s.toLowerCase();
  for (let len = Math.min(MAX_TAG_LEN, lower.length); len > 0; len--) {
    const suffix = lower.slice(-len);
    if (tags.some((t) => t.startsWith(suffix))) return s.slice(-len);
  }
  return "";
}

/**
 * Pemotong blok think untuk stream: push() menerima satu chunk dan
 * mengembalikan teks bersih yang aman ditampilkan. Tag yang terbelah
 * antar chunk ditahan di buffer sampai lengkap atau terbukti bukan tag.
 * flush() dipanggil di akhir stream untuk mengeluarkan sisa buffer.
 */
export class ThinkStripper {
  private inThink = false;
  private pending = "";

  push(chunk: string): string {
    this.pending += chunk;
    let emitted = "";
    for (;;) {
      if (!this.inThink) {
        const m = OPEN_RE.exec(this.pending);
        if (m) {
          emitted += this.pending.slice(0, m.index);
          this.pending = this.pending.slice(m.index + m[0].length);
          this.inThink = true;
          continue;
        }
        // Tidak ada tag lengkap — tahan suffix yang mungkin awal tag.
        const held = heldTagSuffix(this.pending, ["<think>", "<thinking>"]);
        emitted += this.pending.slice(0, this.pending.length - held.length);
        this.pending = held;
        return emitted;
      }
      // Di dalam blok think: cari tag penutup.
      const m = CLOSE_RE.exec(this.pending);
      if (m) {
        this.pending = this.pending.slice(m.index + m[0].length);
        this.inThink = false;
        continue;
      }
      const held = heldTagSuffix(this.pending, ["</think>", "</thinking>"]);
      this.pending = held;
      return emitted;
    }
  }

  /** Akhir stream: keluarkan sisa buffer kalau tidak sedang di dalam blok think. */
  flush(): string {
    if (this.inThink) {
      this.pending = "";
      return "";
    }
    const rest = this.pending;
    this.pending = "";
    return rest;
  }
}
