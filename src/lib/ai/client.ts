/**
 * ─── Atlas AI Client — Ollama (Local LLM) ───
 *
 * Ollama'nın OpenAI-compatible API'si üzerinden çalışır.
 * Default: http://localhost:11434/v1
 *
 * Ana model: qwen2.5:7b (Alibaba Qwen 2.5 — 7B parametreli)
 * - Türkçe dil desteği mükemmel (multilingual training)
 * - Yapısal çıktı / instruction following güçlü
 * - 4.7GB — RTX 5060 8GB VRAM'e rahat sığar
 *
 * Kullanım:
 *   import { model, chatModel } from "@/lib/ai/client";
 *   const result = await generateText({ model, prompt: "..." });
 *
 * Ollama kurulum:
 *   1. https://ollama.com adresinden indir
 *   2. ollama pull qwen2.5:7b
 *   3. ollama serve (varsayılan port: 11434)
 *
 * Env:
 *   OLLAMA_BASE_URL=http://localhost:11434/v1
 *   OLLAMA_MODEL=qwen2.5:7b
 */

import { createOpenAI } from "@ai-sdk/openai";

// Ollama OpenAI-compatible endpoint
const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama", // Ollama API key gerektirmez, ama SDK zorunlu tutuyor
});

/** Ana model — chat, analiz, rapor, araç kullanımı */
export const model = ollama.chat(process.env.OLLAMA_MODEL ?? "qwen2.5:7b");

/** Chat modeli — hızlı yanıt */
export const chatModel = ollama.chat(process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b");

/** Kod modeli — code generation/review */
export const codeModel = ollama.chat(process.env.OLLAMA_CODE_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b");

/** Ollama provider instance — özel model seçimi için */
export { ollama };
