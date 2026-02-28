/**
 * ─── Atlas AI Client — Ollama (Local LLM) ───
 *
 * Ollama'nın OpenAI-compatible API'si üzerinden çalışır.
 * Default: http://localhost:11434/v1
 *
 * Kullanım:
 *   import { model, chatModel, codeModel } from "@/lib/ai/client";
 *   const result = await generateText({ model, prompt: "..." });
 *
 * Ollama kurulum:
 *   1. https://ollama.com adresinden indir
 *   2. ollama pull llama3.1
 *   3. ollama serve (varsayılan port: 11434)
 *
 * Env:
 *   OLLAMA_BASE_URL=http://localhost:11434/v1  (opsiyonel, varsayılan bu)
 *   OLLAMA_MODEL=llama3.1                       (opsiyonel, varsayılan bu)
 */

import { createOpenAI } from "@ai-sdk/openai";

// Ollama OpenAI-compatible endpoint
const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama", // Ollama API key gerektirmez, ama SDK zorunlu tutuyor
});

/** Genel amaçlı model (chat, analiz, rapor) */
export const model = ollama(process.env.OLLAMA_MODEL ?? "llama3.1");

/** Chat modeli — hızlı yanıt için küçük model */
export const chatModel = ollama(process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.1");

/** Kod modeli — code generation/review */
export const codeModel = ollama(process.env.OLLAMA_CODE_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.1");

/** Ollama provider instance — özel model seçimi için */
export { ollama };
