import type { ChatStreamResult, StreamUsage } from "./free-ai-router";

/**
 * Membangun respons SSE OpenAI-compatible dari ChatStreamResult.
 *
 * Format per chunk:
 *   data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,
 *          "model":"...","choices":[{"index":0,"delta":{"role":"assistant",
 *          "content":"..."},"finish_reason":null}]}
 * diakhiri:
 *   data: [DONE]
 *
 * Chunk pertama berisi delta role assistant; chunk terakhir berisi
 * finish_reason (dan usage kalau dilaporkan provider). Opsi `meta`
 * mengirim satu `event: meta` di awal — dipakai playground /chat saja;
 * endpoint /v1 TIDAK memakai meta (strict OpenAI compat).
 */

export type SseFinishInfo = {
  usage: StreamUsage;
  finishReason: string | null;
  fullText: string;
  /** true kalau client menutup koneksi sebelum stream selesai */
  aborted: boolean;
};

type BuildSseOptions = {
  meta?: Record<string, unknown>;
  /** Dipanggil tepat sekali setelah stream selesai / dibatalkan. */
  onFinish?: (info: SseFinishInfo) => void;
};

function chunkJson(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function buildSseResponse(
  result: ChatStreamResult,
  opts: BuildSseOptions = {},
): Response {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const created = Math.floor(Date.now() / 1000);
  let finished = false;

  const finish = (aborted: boolean) => {
    if (finished) return;
    finished = true;
    opts.onFinish?.({
      usage: result.getUsage(),
      finishReason: result.getFinishReason(),
      fullText: result.getFullText(),
      aborted,
    });
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (opts.meta) {
          controller.enqueue(
            encoder.encode(`event: meta\ndata: ${JSON.stringify(opts.meta)}\n\n`),
          );
        }
        // Chunk pembuka: role assistant.
        controller.enqueue(
          encoder.encode(
            chunkJson({
              id,
              object: "chat.completion.chunk",
              created,
              model: result.model,
              choices: [
                { index: 0, delta: { role: "assistant", content: "" }, finish_reason: null },
              ],
            }),
          ),
        );

        for (;;) {
          const { done, value } = await result.read();
          if (done) break;
          if (value) {
            controller.enqueue(
              encoder.encode(
                chunkJson({
                  id,
                  object: "chat.completion.chunk",
                  created,
                  model: result.model,
                  choices: [
                    { index: 0, delta: { content: value }, finish_reason: null },
                  ],
                }),
              ),
            );
          }
        }

        // Chunk penutup: finish_reason + usage (kalau dilaporkan provider).
        const usage = result.getUsage();
        const finalChunk: Record<string, unknown> = {
          id,
          object: "chat.completion.chunk",
          created,
          model: result.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: result.getFinishReason() ?? "stop",
            },
          ],
        };
        if (!usage.estimated) {
          finalChunk.usage = {
            prompt_tokens: usage.promptTokens,
            completion_tokens: usage.completionTokens,
            total_tokens: usage.promptTokens + usage.completionTokens,
          };
        }
        controller.enqueue(encoder.encode(chunkJson(finalChunk)));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        finish(false);
        controller.close();
      } catch {
        // Pump tidak seharusnya melempar, tapi kalau terjadi: tutup stream
        // dengan rapi supaya client tidak menggantung.
        try {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch {
          // controller sudah ditutup
        }
        finish(true);
        try {
          controller.close();
        } catch {
          // sudah ditutup
        }
      }
    },
    cancel() {
      result.cancel();
      finish(true);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
