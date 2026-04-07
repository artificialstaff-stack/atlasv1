"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { CustomerWorkspaceViewModel, CustomerWorkstreamKey } from "@/lib/customer-workspace/types";

type WorkspaceResponse = {
  workspace?: CustomerWorkspaceViewModel;
  error?: string;
};

const WORKSTREAM_OPTIONS: Array<{ value: CustomerWorkstreamKey; label: string }> = [
  { value: "company_setup", label: "Company Setup" },
  { value: "catalog_intake", label: "Catalog Intake" },
  { value: "website", label: "Website" },
  { value: "marketplaces", label: "Marketplaces" },
  { value: "ads", label: "Ads" },
  { value: "social", label: "Social" },
  { value: "seo", label: "SEO" },
  { value: "fulfillment", label: "Fulfillment" },
];

export function CustomerWorkspacePanel({ customerId }: { customerId: string }) {
  const [workspace, setWorkspace] = useState<CustomerWorkspaceViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [artifactLabel, setArtifactLabel] = useState("");
  const [workstreamKey, setWorkstreamKey] = useState<CustomerWorkstreamKey>("catalog_intake");

  async function loadWorkspace() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/workspace`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as WorkspaceResponse | null;

      if (!response.ok || !payload?.workspace) {
        throw new Error(payload?.error ?? "Workspace okunamadi.");
      }

      setWorkspace(payload.workspace);
    } catch (error) {
      toast.error("Workspace yuklenemedi", {
        description: error instanceof Error ? error.message : "Beklenmeyen hata",
      });
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDeliverable() {
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    if (!trimmedTitle || !trimmedSummary) {
      toast.error("Deliverable icin title ve summary zorunlu.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          summary: trimmedSummary,
          workstreamKey,
          artifactUrl: artifactUrl.trim() || null,
          artifactLabel: artifactLabel.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Deliverable olusturulamadi.");
      }

      toast.success("Deliverable eklendi", {
        description: "Musteri portalinda deliverables alanina yansitildi.",
      });
      setTitle("");
      setSummary("");
      setArtifactUrl("");
      setArtifactLabel("");
      await loadWorkspace();
    } catch (error) {
      toast.error("Deliverable eklenemedi", {
        description: error instanceof Error ? error.message : "Beklenmeyen hata",
      });
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [customerId]);

  return (
    <Card className="atlas-workbench-panel-strong rounded-[1.55rem]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Customer Workspace</CardTitle>
            <CardDescription>
              Workstream, request thread ve deliverable akisi artik tek observer modelinden okunuyor.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-2xl"
            onClick={() => void loadWorkspace()}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-6 text-sm text-muted-foreground">
            Workspace yukleniyor...
          </div>
        ) : workspace ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Launch stage</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.launchStageLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Workstream</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.activeWorkstreamCount}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Request thread</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.requestCount}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Deliverable</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.deliverableCount}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Starter payment</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.starterPaymentState}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Management payment</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.managementPaymentState}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Selected channel</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.selectedMarketplace?.title ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pending invoices</p>
                <p className="mt-2 text-lg font-semibold tracking-tight">{workspace.pendingInvoiceCount}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Portal module access</h3>
                  <Badge variant="outline">{workspace.moduleAccess.filter((item) => item.visibility !== "hidden").length}</Badge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {workspace.moduleAccess
                    .filter((item) => item.visibility !== "hidden")
                    .map((item) => (
                      <div key={item.key} className="rounded-2xl border border-white/8 bg-card/80 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.label}</p>
                          <Badge variant="outline">{item.visibility}</Badge>
                          {item.lockedState ? <Badge className="border-0 bg-primary/15 text-primary">{item.lockedState}</Badge> : null}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                        {item.lockedSummary ? (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {item.lockedSummary}
                          </p>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Service catalog preview</h3>
                  <Badge variant="outline">{workspace.serviceCatalog.length}</Badge>
                </div>
                <div className="mt-3 space-y-3">
                  {workspace.serviceCatalog.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/8 bg-card/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{item.title}</p>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.summary}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {item.upfrontPrice > 0 ? <p>${item.upfrontPrice.toFixed(2)}</p> : null}
                          {item.recurringPrice ? <p>${item.recurringPrice.toFixed(2)}/ay</p> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                  <div className="flex flex-wrap gap-2">
                    {workspace.workstreams.map((item) => (
                      <Link
                        key={item.key}
                        href={item.detailHref}
                        className="rounded-full border border-white/8 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/25 hover:text-foreground"
                      >
                        {item.title} · {item.status}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">Aktif request threadleri</h3>
                    <Badge variant="outline">{workspace.requestThreads.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-3">
                    {workspace.requestThreads.slice(0, 4).map((thread) => (
                      <div key={thread.id} className="rounded-2xl border border-white/8 bg-card/80 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{thread.threadType}</Badge>
                          <Badge variant="outline">{thread.status}</Badge>
                        </div>
                        <p className="mt-3 text-sm font-medium">{thread.subject}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{thread.summary}</p>
                        {thread.latestMessage ? (
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Son mesaj: {thread.latestMessage.body}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    {workspace.requestThreads.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-4 text-sm text-muted-foreground">
                        Acik request thread yok.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">Deliverable pipeline</h3>
                    <Badge variant="outline">{workspace.deliverables.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-3">
                    {workspace.deliverables.slice(0, 4).map((deliverable) => (
                      <div key={deliverable.id} className="rounded-2xl border border-white/8 bg-card/80 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{deliverable.title}</p>
                          <Badge variant="outline">{deliverable.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{deliverable.summary}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(deliverable.createdAt)}</p>
                      </div>
                    ))}
                    {workspace.deliverables.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-4 text-sm text-muted-foreground">
                        Henuz deliverable kaydi yok.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                  <h3 className="text-sm font-medium">Yeni deliverable ekle</h3>
                  <div className="mt-3 space-y-3">
                    <Input placeholder="Deliverable basligi" value={title} onChange={(event) => setTitle(event.target.value)} />
                    <Textarea
                      placeholder="Musteriye gidecek deliverable ozeti"
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                    />
                    <div className="rounded-md border border-input bg-transparent px-3 py-2">
                      <select
                        className="w-full bg-transparent text-sm outline-none"
                        value={workstreamKey}
                        onChange={(event) => setWorkstreamKey(event.target.value as CustomerWorkstreamKey)}
                      >
                        {WORKSTREAM_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input placeholder="Artifact URL (opsiyonel)" value={artifactUrl} onChange={(event) => setArtifactUrl(event.target.value)} />
                    <Input placeholder="Artifact label (opsiyonel)" value={artifactLabel} onChange={(event) => setArtifactLabel(event.target.value)} />
                    <Button
                      type="button"
                      className="w-full rounded-2xl"
                      disabled={submitting}
                      onClick={() => void handleCreateDeliverable()}
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Deliverable kaydet
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-6 text-sm text-muted-foreground">
            Workspace verisi okunamadi.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
