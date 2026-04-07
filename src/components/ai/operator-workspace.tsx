"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, Hand, PauseCircle, PlayCircle, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type {
  CopilotOperatorAllowlistRule,
  CopilotOperatorCompanionRecord,
  CopilotOperatorJobRecord,
} from "@/lib/admin-copilot/types";

type OperatorJobsPayload = {
  items: CopilotOperatorJobRecord[];
  companions: CopilotOperatorCompanionRecord[];
  allowlistRules: CopilotOperatorAllowlistRule[];
};

type OperatorAction = "approve" | "pause" | "takeover" | "reject" | "complete" | "fail";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? "İstek başarısız.");
  }
  return json as T;
}

function getStatusVariant(status: CopilotOperatorJobRecord["status"]) {
  if (status === "completed") return "default";
  if (status === "failed" || status === "rejected") return "destructive";
  return "outline";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function resolveTargetHref(target: string) {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  if (target.startsWith("/")) {
    return target;
  }

  return null;
}

export function OperatorWorkspace() {
  const [jobs, setJobs] = useState<CopilotOperatorJobRecord[]>([]);
  const [companions, setCompanions] = useState<CopilotOperatorCompanionRecord[]>([]);
  const [allowlistRules, setAllowlistRules] = useState<CopilotOperatorAllowlistRule[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, startActionTransition] = useTransition();

  const openJobs = useMemo(
    () => jobs.filter((job) => ["pending", "approved", "paused", "taken_over"].includes(job.status)),
    [jobs],
  );

  async function refreshJobs() {
    const payload = await fetchJson<OperatorJobsPayload>("/api/ai/operator-jobs");
    setJobs(payload.items ?? []);
    setCompanions(payload.companions ?? []);
    setAllowlistRules(payload.allowlistRules ?? []);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshJobs().catch((error) => {
        toast.error(error instanceof Error ? error.message : "Operator işleri yüklenemedi.");
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshJobs().catch(() => undefined);
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  function handleAction(jobId: string, action: OperatorAction) {
    startActionTransition(async () => {
      try {
        const note = notes[jobId]?.trim();
        await fetchJson(`/api/ai/operator-jobs/${jobId}/${action}`, {
          method: "POST",
          body: JSON.stringify(note ? { note } : {}),
        });
        setNotes((current) => {
          const next = { ...current };
          delete next[jobId];
          return next;
        });
        await refreshJobs();
        toast.success("Operator işi güncellendi.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Operator işi güncellenemedi.");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="atlas-workbench-panel rounded-[1.75rem]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Operator Workspace</CardTitle>
              <CardDescription className="text-slate-400">
                Etkileşimli browser işleri burada bekler. AI aynı sohbetten devam eder, ama kritik adım insan kararıyla kapanır.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-white/10 text-slate-300">
              {openJobs.length} açık iş
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[72vh] pr-4">
            <div className="space-y-4">
              {openJobs.length > 0 ? openJobs.map((job) => {
                const targetHref = resolveTargetHref(job.target);
                const noteValue = notes[job.id] ?? job.decisionNote ?? "";
                const claimedByCompanion = job.metadata?.claimedBy === "companion";
                const companionLabel = typeof job.metadata?.companionLabel === "string" ? job.metadata.companionLabel : null;
                return (
                  <div key={job.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-100">{job.title}</div>
                          <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                          <Badge variant="outline" className="border-white/10 text-slate-300">{job.workerTarget}</Badge>
                          {claimedByCompanion && companionLabel ? (
                            <Badge variant="outline" className="border-sky-400/20 bg-sky-500/10 text-sky-100">
                              {companionLabel}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-400">{job.description}</div>
                      </div>
                      {targetHref ? (
                        <Button asChild size="sm" variant="outline" className="border-white/10 bg-white/[0.04]">
                          <Link href={targetHref} target="_blank">
                            Hedefi aç
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <span className="text-slate-500">İstek:</span> {job.commandText}
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <span className="text-slate-500">Hedef:</span> {job.target}
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <span className="text-slate-500">Yüzey:</span> {job.surface}
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <span className="text-slate-500">Güncellendi:</span> {formatTime(job.updatedAt)}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Operator note
                      </div>
                      <Textarea
                        value={noteValue}
                        onChange={(event) => setNotes((current) => ({ ...current, [job.id]: event.target.value }))}
                        rows={4}
                        className="border-white/10 bg-slate-950/65 text-sm text-slate-100"
                        placeholder="Bu işi neden devraldığınızı veya sonucu kısa notla yazın..."
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.status === "taken_over" ? (
                        <>
                          <Button size="sm" className="bg-sky-500 text-slate-950 hover:bg-sky-400" onClick={() => handleAction(job.id, "complete")} disabled={acting}>
                            <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                            Tamamlandı
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/10 bg-white/[0.04]" onClick={() => handleAction(job.id, "fail")} disabled={acting}>
                            <XCircle className="mr-2 h-3.5 w-3.5" />
                            Başarısız
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" className="bg-sky-500 text-slate-950 hover:bg-sky-400" onClick={() => handleAction(job.id, "approve")} disabled={acting}>
                            <PlayCircle className="mr-2 h-3.5 w-3.5" />
                            AI devam etsin
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/10 bg-white/[0.04]" onClick={() => handleAction(job.id, "pause")} disabled={acting}>
                            <PauseCircle className="mr-2 h-3.5 w-3.5" />
                            Duraklat
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/10 bg-white/[0.04]" onClick={() => handleAction(job.id, "takeover")} disabled={acting}>
                            <Hand className="mr-2 h-3.5 w-3.5" />
                            Devral
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/10 bg-white/[0.04]" onClick={() => handleAction(job.id, "reject")} disabled={acting}>
                            <XCircle className="mr-2 h-3.5 w-3.5" />
                            Reddet
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-[1.4rem] border border-dashed border-white/10 px-5 py-8 text-center text-sm text-slate-500">
                  {/* i18n-exempt */}
                  Bekleyen operator işi yok. Bu sadece kuyruk boş demektir; sağlık onayı değildir.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="atlas-workbench-panel rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Companion & Allowlist</CardTitle>
          <CardDescription className="text-slate-400">
            Bağlı desktop companion oturumlarını ve operator lane allowlist kurallarını buradan görür.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            {companions.length > 0 ? companions.map((companion) => (
              <div key={companion.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{companion.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {companion.platform ?? "desktop"} · {companion.version ?? "version yok"}
                    </div>
                  </div>
                  <Badge variant={companion.status === "busy" ? "default" : "outline"}>
                    {companion.status}
                  </Badge>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-400">
                  Son heartbeat: {formatTime(companion.lastHeartbeatAt)}
                </div>
                {companion.claimedJobId ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Aktif iş: {companion.claimedJobId}
                  </div>
                ) : null}
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-500">
                Aktif desktop companion heartbeat kaydi yok.
              </div>
            )}
          </div>

          <div className="pt-2" />
          {allowlistRules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
              <div className="text-sm font-medium text-slate-100">{rule.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">{rule.description}</div>
              <div className="mt-2 text-xs text-slate-500">{rule.pattern}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
