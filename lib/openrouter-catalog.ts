/**
 * openrouter-catalog.ts — katalog model live dari OpenRouter (server-side).
 *
 * Dipakai halaman /models untuk:
 *   1. daftar model :free (bisa dipakai lewat /v1 dengan override model),
 *   2. context window model-model router (dicocokkan dari data OpenRouter).
 *
 * Semua angka context window BERASAL dari API OpenRouter — tidak ada angka
 * yang ditulis tangan. Kalau fetch gagal, kembalikan katalog kosong
 * (halaman menampilkan "tidak diketahui" / pesan fallback, bukan angka
 * karangan). Cache 1 jam via Next fetch cache.
 */

export type OpenRouterModelInfo = {
  id: string;
  name: string;
  contextLength: number | null;
  description: string | null;
};

export type OpenRouterCatalog = {
  /** semua model berakhiran :free, diurutkan berdasarkan id */
  freeModels: OpenRouterModelInfo[];
  /** context window berdasarkan id model (semua model, bukan cuma :free) */
  contextById: Map<string, number>;
  /** false kalau fetch gagal — data kosong, bukan kesalahan halaman */
  ok: boolean;
};

const EMPTY: OpenRouterCatalog = { freeModels: [], contextById: new Map(), ok: false };

export async function getOpenRouterCatalog(): Promise<OpenRouterCatalog> {
  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/models", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[openrouter-catalog] fetch gagal:", err);
    return EMPTY;
  }
  if (!res.ok) {
    console.error(`[openrouter-catalog] HTTP ${res.status}`);
    return EMPTY;
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return EMPTY;
  }
  const list = (json as { data?: unknown })?.data;
  if (!Array.isArray(list)) return EMPTY;

  const freeModels: OpenRouterModelInfo[] = [];
  const contextById = new Map<string, number>();
  for (const raw of list) {
    const m = raw as {
      id?: unknown;
      name?: unknown;
      context_length?: unknown;
      description?: unknown;
    };
    if (typeof m.id !== "string" || !m.id) continue;
    if (typeof m.context_length === "number" && m.context_length > 0) {
      contextById.set(m.id, m.context_length);
    }
    if (m.id.endsWith(":free")) {
      freeModels.push({
        id: m.id,
        name: typeof m.name === "string" && m.name ? m.name : m.id,
        contextLength:
          typeof m.context_length === "number" && m.context_length > 0
            ? m.context_length
            : null,
        description: typeof m.description === "string" ? m.description : null,
      });
    }
  }
  freeModels.sort((a, b) => a.id.localeCompare(b.id));
  return { freeModels, contextById, ok: true };
}

/**
 * Cari context window untuk id model router di katalog OpenRouter.
 * Cocok persis dulu; kalau tidak ada, coba cocokan akhiran
 * ("gpt-oss-20b" cocok dengan "openai/gpt-oss-20b"). Mengembalikan null
 * kalau tidak ada yang cocok — caller menampilkan "tidak diketahui".
 */
export function findContextLength(
  catalog: OpenRouterCatalog,
  modelId: string,
): number | null {
  const exact = catalog.contextById.get(modelId);
  if (exact !== undefined) return exact;
  const suffix = `/${modelId}`;
  // Kecocokan akhiran bisa ambigu (dua vendor dengan nama model yang
  // sama) — hanya kembalikan nilai kalau SEMUA yang cocok sepakat;
  // kalau berbeda, kembalikan null ("tidak diketahui") daripada
  // menebak angka yang salah.
  let found: number | null = null;
  for (const [id, len] of catalog.contextById) {
    if (!id.endsWith(suffix)) continue;
    if (found === null) found = len;
    else if (found !== len) return null;
  }
  return found;
}
