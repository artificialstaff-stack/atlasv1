// ─── Zod v4 Compatible Tool Definition ──────────────────────────────────────
// AI SDK'nin tool() fonksiyonu dahili olarak Zod v3 tipi bekler.
// Projemiz Zod v4 kullandiginden, tip uyumsuzlugu olusur.
// Bu wrapper, runtime davranisi ayni tutarak tip sorununu cozer.
// ─────────────────────────────────────────────────────────────────────────────
import type { Tool } from "ai";

export function tool<P, R>(config: {
  description: string;
  parameters: P;
  execute: (params: Record<string, unknown>) => Promise<R>;
}): Tool {
  return config as unknown as Tool;
}
