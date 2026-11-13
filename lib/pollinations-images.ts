/**
 * pollinations-images.ts — image generation gratis via Pollinations.
 *
 * Endpoint publik tanpa key (GET). Dipakai server-side oleh
 * POST /api/v1/images/generations dan langsung dari browser oleh
 * playground /images. Client-safe (tanpa import server).
 *
 * Terverifikasi live 2026-11-14: GET
 * https://image.pollinations.ai/prompt/{prompt}?model=flux&width=512
 * &height=512&nologo=true&seed=42 → 200 image/jpeg, <1 detik.
 */

export const IMAGE_MODELS = ["flux", "turbo"] as const;
export type ImageModel = (typeof IMAGE_MODELS)[number];

export const IMAGE_SIZES = {
  "1024x1024": { width: 1024, height: 1024 },
  "512x512": { width: 512, height: 512 },
  "1024x1792": { width: 1024, height: 1792 },
  "1792x1024": { width: 1792, height: 1024 },
} as const;
export type ImageSize = keyof typeof IMAGE_SIZES;

export function isImageModel(v: unknown): v is ImageModel {
  return v === "flux" || v === "turbo";
}

export function isImageSize(v: unknown): v is ImageSize {
  return (
    typeof v === "string" && (v as string) in IMAGE_SIZES
  );
}

/**
 * URL gambar Pollinations. `private=true` supaya gambar tidak muncul di
 * feed publik Pollinations; `nologo=true` supaya tanpa watermark.
 */
export function buildPollinationsImageUrl(
  prompt: string,
  model: ImageModel,
  size: ImageSize,
  seed: number,
): string {
  const { width, height } = IMAGE_SIZES[size];
  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    nologo: "true",
    private: "true",
    seed: String(seed),
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}
