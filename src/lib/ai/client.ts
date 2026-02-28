/**
 * ─── Atlas AI Client — Ollama (Local LLM) ───
 *
 * Ollama'nın OpenAI-compatible API'si üzerinden çalışır.
 * Default: http://localhost:11434/v1
 *
 * Mevcut model: gemma3:4b
 * İleride Atlas'ın kendi AI modeline geçilecek.
 *
 * Kullanım:
 *   import { model, chatModel } from "@/lib/ai/client";
 *   const result = await generateText({ model, prompt: "..." });
 *
 * Ollama kurulum:
 *   1. https://ollama.com adresinden indir
 *   2. ollama pull gemma3:4b
 *   3. ollama serve (varsayılan port: 11434)
 *
 * Env:
 *   OLLAMA_BASE_URL=http://localhost:11434/v1  (opsiyonel, varsayılan bu)
 *   OLLAMA_MODEL=gemma3:4b                     (opsiyonel, varsayılan bu)
 */

import { createOpenAI } from "@ai-sdk/openai";

// Ollama OpenAI-compatible endpoint
const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama", // Ollama API key gerektirmez, ama SDK zorunlu tutuyor
});

/** Ana model — chat, analiz, rapor (gemma3:4b) */
export const model = ollama.chat(process.env.OLLAMA_MODEL ?? "gemma3:4b");

/** Chat modeli — hızlı yanıt */
export const chatModel = ollama.chat(process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL ?? "gemma3:4b");

/** Kod modeli — code generation/review (ileride codellama/qwen-coder ile değiştirilecek) */
export const codeModel = ollama.chat(process.env.OLLAMA_CODE_MODEL ?? process.env.OLLAMA_MODEL ?? "gemma3:4b");

/** Ollama provider instance — özel model seçimi için */
export { ollama };
