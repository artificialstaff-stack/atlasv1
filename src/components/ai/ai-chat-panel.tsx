"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Loader2,
  RotateCcw,
  Sparkles,
  Database,
  TrendingUp,
  Users,
  ShoppingCart,
  Headphones,
  BarChart3,
  Store,
  ChevronDown,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Atlas AI Copilot — Tam Kapsamlı Yönetim Asistanı
 *
 * Data-first architecture: veritabanından veri çeker, LLM ile analiz eder.
 * Markdown rendering, kategorize öneriler, profesyonel UI.
 */

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface SuggestionCategory {
  icon: React.ReactNode;
  label: string;
  color: string;
  items: string[];
}

const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    label: "Genel Bakış",
    color: "text-blue-500",
    items: [
      "Şirketin genel durumu nedir?",
      "Bugünkü dashboard özeti",
      "Sistem sağlığı raporu",
    ],
  },
  {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Müşteriler",
    color: "text-green-500",
    items: [
      "Kaç aktif müşterimiz var?",
      "Son kayıt olan müşteriler",
      "Onboarding durumu",
    ],
  },
  {
    icon: <ShoppingCart className="h-3.5 w-3.5" />,
    label: "Siparişler",
    color: "text-orange-500",
    items: [
      "Toplam sipariş sayısı ve gelir",
      "Düşük stok uyarıları",
      "Platform bazlı sipariş dağılımı",
    ],
  },
  {
    icon: <Store className="h-3.5 w-3.5" />,
    label: "Pazaryeri",
    color: "text-purple-500",
    items: [
      "Pazaryeri performans özeti",
      "Reklam kampanya durumu",
      "Sosyal medya istatistikleri",
    ],
  },
  {
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    label: "Finans",
    color: "text-emerald-500",
    items: [
      "Gelir gider analizi",
      "Aylık kâr/zarar",
      "Fatura durumları",
    ],
  },
  {
    icon: <Headphones className="h-3.5 w-3.5" />,
    label: "Destek",
    color: "text-red-500",
    items: [
      "Açık destek talepleri",
      "Bekleyen görevler",
      "Form başvuruları",
    ],
  },
];

// ── Simple Markdown-like renderer ──
function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = "";
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${codeKey++}`}
            className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-xs overflow-x-auto my-2 font-mono"
          >
            {codeContent.trimEnd()}
          </pre>,
        );
        codeContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {processInline(line.slice(4))}
        </h4>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="font-bold text-sm mt-3 mb-1">
          {processInline(line.slice(3))}
        </h3>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="font-bold text-base mt-3 mb-1">
          {processInline(line.slice(2))}
        </h2>,
      );
    }
    // Table row
    else if (line.startsWith("|")) {
      const cells = line
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      const isSep = cells.every((c) => /^[-:]+$/.test(c));
      if (!isSep) {
        const isHeader =
          i + 1 < lines.length &&
          lines[i + 1].startsWith("|") &&
          lines[i + 1].includes("---");
        elements.push(
          <div key={i} className="flex gap-0 text-xs">
            {cells.map((cell, ci) => (
              <span
                key={ci}
                className={cn(
                  "flex-1 px-2 py-1 border-b border-border/30",
                  isHeader && "font-semibold bg-muted/50",
                )}
              >
                {processInline(cell)}
              </span>
            ))}
          </div>,
        );
      }
    }
    // Bullet
    else if (line.match(/^[\s]*[-*•]\s/)) {
      const indent = line.search(/[-*•]/);
      elements.push(
        <div
          key={i}
          className="flex gap-1.5 text-sm"
          style={{ paddingLeft: `${indent * 8 + 4}px` }}
        >
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{processInline(line.replace(/^[\s]*[-*•]\s/, ""))}</span>
        </div>,
      );
    }
    // Numbered
    else if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-1.5 text-sm pl-1">
            <span className="text-muted-foreground shrink-0 font-medium">
              {match[1]}.
            </span>
            <span>{processInline(match[2])}</span>
          </div>,
        );
      }
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(
        <hr key={i} className="my-2 border-border/30" />,
      );
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {processInline(line)}
        </p>,
      );
    }
  }

  // Close unclosed code block
  if (inCodeBlock && codeContent) {
    elements.push(
      <pre
        key={`code-${codeKey}`}
        className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-xs overflow-x-auto my-2 font-mono"
      >
        {codeContent.trimEnd()}
      </pre>,
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function processInline(text: string): React.ReactNode {
  // Bold + Italic + Code inline processing
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={key++} className="italic font-bold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[3]}
        </strong>,
      );
    } else if (match[4]) {
      parts.push(
        <em key={key++} className="italic">
          {match[4]}
        </em>,
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={key++}
          className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono"
        >
          {match[5]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const panelSize = useMemo(
    () =>
      expanded
        ? "w-[680px] h-[85vh] max-h-[900px]"
        : "w-[440px] h-[620px]",
    [expanded],
  );

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = text ?? input.trim();
      if (!content || isLoading) return;

      setInput("");
      setError(null);
      setActiveCategory(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setIsLoading(true);
      setIsFetching(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        setIsFetching(false);

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("Yanıt gövdesi yok");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        const assistantId = crypto.randomUUID();

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: assistantContent }
                : m,
            ),
          );
        }

        if (!assistantContent.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      "Verileri işledim ancak bir yanıt oluşturulamadı. Lütfen sorunuzu farklı şekilde sorun.",
                  }
                : m,
            ),
          );
        }
      } catch (err) {
        setIsFetching(false);
        const msg =
          err instanceof Error ? err.message : "Bilinmeyen hata";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages],
  );

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setActiveCategory(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg glow-brand relative"
            >
              <Bot className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copilot Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              panelSize,
              "rounded-2xl border bg-card shadow-2xl overflow-hidden flex flex-col",
              "transition-all duration-300",
            )}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-card to-card/80 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">Atlas AI</p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <p className="text-[10px] text-muted-foreground">
                      Aktif · gemma3:4b · Veri-tabanlı
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setExpanded(!expanded)}
                  title={expanded ? "Küçült" : "Büyüt"}
                >
                  {expanded ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={clearChat}
                  title="Sohbeti temizle"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {/* Welcome Screen */}
              {messages.length === 0 && (
                <div className="flex flex-col gap-4 h-full">
                  {/* Hero */}
                  <div className="flex flex-col items-center text-center gap-3 pt-4 pb-2">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">
                        Atlas AI Copilot
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-[320px] mt-1 leading-relaxed">
                        Tüm şirket verilerine erişimim var. Her
                        sorunuzda veritabanından gerçek zamanlı veri
                        çekerek yanıt veririm.
                      </p>
                    </div>
                  </div>

                  {/* Category Grid */}
                  <div className="grid grid-cols-3 gap-2 px-1">
                    {SUGGESTION_CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat.label}
                        onClick={() =>
                          setActiveCategory(
                            activeCategory === idx ? null : idx,
                          )
                        }
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                          activeCategory === idx
                            ? "bg-accent border-primary/30 shadow-sm"
                            : "bg-background hover:bg-accent/50 border-transparent",
                        )}
                      >
                        <div className={cn("opacity-80", cat.color)}>
                          {cat.icon}
                        </div>
                        <span className="text-[10px] font-medium">
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Suggestion Items */}
                  <AnimatePresence mode="wait">
                    {activeCategory !== null && (
                      <motion.div
                        key={activeCategory}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1 px-1 overflow-hidden"
                      >
                        {SUGGESTION_CATEGORIES[
                          activeCategory
                        ].items.map((item) => (
                          <button
                            key={item}
                            onClick={() => sendMessage(item)}
                            className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-background hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground shrink-0" />
                            {item}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quick tip when no category selected */}
                  {activeCategory === null && (
                    <div className="text-center px-4 mt-auto pb-2">
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Database className="h-3 w-3" />
                        Yukarıdan bir kategori seçin veya direkt soru
                        yazın
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Message History */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2.5",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md text-sm"
                        : "bg-muted/60 rounded-bl-md border border-border/30",
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <RenderMarkdown content={msg.content || "..."} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading &&
                messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted/60 rounded-2xl rounded-bl-md border border-border/30 px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isFetching ? (
                          <>
                            <Database className="h-3.5 w-3.5 animate-pulse" />
                            <span>Veritabanından veri çekiliyor...</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Analiz ediliyor...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <span className="shrink-0">⚠</span>
                <span className="break-all">{error}</span>
              </div>
            )}

            {/* ── Input ── */}
            <div className="border-t p-3 shrink-0 bg-card/50">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Şirket hakkında bir şey sor..."
                  rows={1}
                  className={cn(
                    "flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    "max-h-[100px] min-h-[40px] placeholder:text-muted-foreground/60",
                  )}
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl shrink-0"
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
