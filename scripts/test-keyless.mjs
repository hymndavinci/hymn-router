// Test provider keyless (tanpa API key) dari mesin lu sendiri.
// Jalankan: node scripts/test-keyless.mjs
// Berguna untuk cek Pollinations & OVH yang gagal dari VM gue —
// dari laptop/server lu kemungkinan jalan.
const providers = [
  { id: "kilo", baseUrl: "https://api.kilo.ai/api/gateway", model: "kilo-auto/free" },
  { id: "llm7", baseUrl: "https://api.llm7.io/v1", model: "gpt-oss:20b" },
  { id: "pollinations", baseUrl: "https://text.pollinations.ai/openai", model: "gpt-oss-20b" },
  { id: "ovh", baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", model: "gpt-oss-20b" },
];

for (const p of providers) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: p.model,
        messages: [{ role: "user", content: "jawab satu kata: halo" }],
        max_tokens: 60,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    const ms = Date.now() - start;
    if (!res.ok) {
      console.log(`[FAIL] ${p.id}: HTTP ${res.status} (${ms}ms) ${text.slice(0, 120)}`);
      continue;
    }
    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content
      ?? data.choices?.[0]?.message?.reasoning ?? "(kosong)";
    console.log(`[ OK ] ${p.id}: ${content.slice(0, 80).replace(/\n/g, " ")} (${ms}ms, model: ${data.model})`);
  } catch (err) {
    console.log(`[FAIL] ${p.id}: ${err.message} (${Date.now() - start}ms)`);
  }
}
