"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { PortalAssistantResponse } from "@/lib/customer-portal/types";

const SUPPORTED_PREFIXES = ["/panel/dashboard", "/panel/services", "/panel/support"];

const PAGE_PROMPTS: Record<string, string[]> = {
  "/panel/dashboard": [
    "Bugun oncelikli olarak neye bakmaliyim?",
    "Destek merkezine gitmem gerekiyor mu?",
    "Surecimde blocker var mi?",
    "Belgelerime hangi asamada ihtiyac duyacagim?",
  ],
  "/panel/services": [
    "Hangi hizmetim su an aktif gorunuyor?",
    "Atlas su an benden ne bekliyor?",
    "Bu hizmetler surecte nereye bagli?",
    "Tamamlanan hizmetlerimi nasil gorebilirim?",
  ],
  "/panel/support": [
    "Benden beklenen form var mi?",
    "Genel destek formunu ne zaman kullanmaliyim?",
    "Gonderdigim formun durumu nasil ilerler?",
    "Surec takibine nereden donebilirim?",
  ],
};

export function PortalAssistantDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PortalAssistantResponse | null>(null);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  const shouldRender = useMemo(
    () => SUPPORTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
    [pathname]
  );

  const starterPrompts = useMemo(() => {
    const matchedPrefix = SUPPORTED_PREFIXES.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    return PAGE_PROMPTS[matchedPrefix ?? "/panel/dashboard"] ?? PAGE_PROMPTS["/panel/dashboard"];
  }, [pathname]);

  async function askAssistant(prompt: string) {
    setLoading(true);
    try {
      const result = await fetch("/api/portal/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: prompt }),
      });

      if (!result.ok) {
        throw new Error("Portal assistant yanit veremedi.");
      }

      const payload = (await result.json()) as PortalAssistantResponse;
      setResponse(payload);
    } catch {
      setResponse({
        answer:
          "Su an yardimci asistan yanit uretemedi. Destek merkezine giderek aktif isteklerinizi veya genel destek formunu acabilirsiniz.",
        confidence: "low",
        suggestedAction: {
          id: "assistant:error",
          kind: "open_support",
          label: "Destek Merkezine Git",
          description: "Bekleyen istekleri ve destek akisni manuel olarak goruntuleyin.",
          href: "/panel/support",
          emphasis: "primary",
          formCode: null,
          reason: "Asistan yanit veremedigi icin destek merkezi en guvenli yoldur.",
        },
        suggestedFormCode: null,
        deepLink: "/panel/support",
        fallbackReason: "Istek sirasinda beklenmedik bir hata olustu.",
        suggestions: [],
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || hasBootstrapped) return;
    setHasBootstrapped(true);
    void askAssistant("");
  }, [hasBootstrapped, open]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-40 h-14 rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(79,124,255,0.95),rgba(32,93,255,0.92))] px-5 shadow-[0_20px_60px_rgba(37,99,235,0.38)]"
        >
          <Bot className="mr-2 h-5 w-5" />
          Atlas Yardimci
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md border-white/8 bg-[rgba(9,12,24,0.96)] p-0 sm:max-w-md">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/8 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle>Atlas Yardimci</SheetTitle>
                <SheetDescription>
                  Read-only destek asistani. Surec, form, siparis ve fatura sorularinda sizi dogru ekrana yonlendirir.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/10 bg-background/35"
                    onClick={() => {
                      setQuestion(prompt);
                      void askAssistant(prompt);
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>

              <div className="rounded-[1.35rem] border border-white/8 bg-background/45 p-4">
                {loading ? (
                  <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atlas yardimci dusunuyor...
                  </div>
                ) : response ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={response.answer}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2">
                        <Badge className="border-0 bg-primary/15 text-primary">
                          {response.confidence === "high"
                            ? "Yuksek guven"
                            : response.confidence === "medium"
                              ? "Orta guven"
                              : "Dusuk guven"}
                        </Badge>
                        {response.suggestedFormCode ? (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {response.suggestedFormCode}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-card/75 p-4">
                        <p className="text-sm leading-6 text-foreground">{response.answer}</p>
                        {response.fallbackReason ? (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Not: {response.fallbackReason}
                          </p>
                        ) : null}
                      </div>

                      {response.suggestedAction ? (
                        <div className="rounded-2xl border border-white/8 bg-background/35 p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Onerilen sonraki adim
                          </p>
                          <p className="mt-2 text-sm font-medium">{response.suggestedAction.label}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {response.suggestedAction.description}
                          </p>
                          <Button asChild className="mt-4 rounded-2xl">
                            <Link href={response.suggestedAction.href}>{response.suggestedAction.label}</Link>
                          </Button>
                        </div>
                      ) : null}

                      {response.suggestions.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Hizli gecisler
                          </p>
                          <div className="space-y-2">
                            {response.suggestions.slice(0, 4).map((suggestion) => (
                              <Link
                                key={suggestion.id}
                                href={suggestion.href}
                                className="block rounded-2xl border border-white/8 bg-background/35 px-4 py-3 transition hover:border-primary/25"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium">{suggestion.label}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {suggestion.reason ?? suggestion.description}
                                    </p>
                                  </div>
                                  <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="min-h-[180px] space-y-3">
                    <Badge className="border-0 bg-primary/15 text-primary">Hazir</Badge>
                    <h3 className="text-lg font-semibold">Atlas yardimci burada</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Surecte siradaki adimi, eksik formu, siparis veya fatura ekranini sormaniz yeterli.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 px-5 py-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void askAssistant(question);
              }}
            >
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Orn: Su an benden hangi form bekleniyor?"
                className="min-h-[110px] rounded-2xl border-white/10 bg-background/45"
              />
              <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Soruyu Gonder
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
