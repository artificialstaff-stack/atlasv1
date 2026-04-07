"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AtlasEmptySurface } from "@/components/portal/atlas-widget-kit";
import { PortalPageHero } from "./portal-page-hero";
import type { CustomerRequestThread, CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";
import { formatDate } from "@/lib/utils";
import { useClientGuidance } from "@/app/(client)/panel/_components/client-guidance-provider";

function ThreadCard({ thread }: { thread: CustomerRequestThread }) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-card/85 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{thread.threadType}</Badge>
            <Badge variant="outline">{thread.status}</Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight">{thread.subject}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{thread.summary}</p>
        </div>
      </div>
      {thread.latestMessage ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-background/45 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Son mesaj · {thread.latestMessage.authorLabel}
          </p>
          <p className="mt-2 text-sm leading-6">{thread.latestMessage.body}</p>
          <p className="mt-3 text-[11px] text-muted-foreground">{formatDate(thread.latestMessage.createdAt)}</p>
        </div>
      ) : null}
      {thread.primaryAction ? (
        <div className="mt-4">
          <Button asChild className="rounded-2xl">
            <Link href={thread.primaryAction.href}>{thread.primaryAction.label}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function RequestHubContent({ workspace }: { workspace: CustomerWorkspaceViewModel }) {
  const catalogIntakeEnabled = workspace.allowedFormCodes.includes("ATL-201");
  const pendingThreads = workspace.requestThreads.filter(
    (thread) => thread.status === "waiting_on_customer" || thread.status === "open",
  ).length;

  useClientGuidance(
    useMemo(
      () => ({
        focusLabel: pendingThreads > 0 ? "Atlas sizden bilgi bekliyor" : "Request merkezi sakin",
        summary:
          pendingThreads > 0
            ? "Atanmis request ve form kanallari bu ekranda toplanir."
            : "Su an acik zorunlu talep yok; yine de genel destek veya catalog intake istegi acabilirsiniz.",
        pendingCount: pendingThreads,
        metrics: [
          { label: "Aktif konu", value: `${workspace.requestThreads.length}` },
          { label: "Acik aksiyon", value: `${pendingThreads}` },
          { label: "Form code", value: catalogIntakeEnabled ? "ATL-201" : "ATL-701" },
        ],
      }),
      [catalogIntakeEnabled, pendingThreads, workspace.requestThreads.length],
    ),
  );

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow="Thread + Forms"
        title="Requests & Forms"
        description="Atlas ile aranızdaki tum istek, form ve ek bilgi akisi tek bir merkezde toplanir."
        surfaceVariant="secondary"
        badges={["Thread + forms", `${workspace.requestThreads.length} aktif konu`]}
        metrics={[
          { label: "Aktif konu", value: `${workspace.requestThreads.length}` },
          { label: "Acik aksiyon", value: `${pendingThreads}` },
          { label: "Deliverable", value: `${workspace.deliverableCount}` },
        ]}
        primaryAction={{
          id: "requests:support",
          label: "Destek Merkezi",
          href: "/panel/support",
          description: "Forms-first destek akisini ac.",
          kind: "open_support",
        }}
        secondaryAction={{
          id: "requests:services",
          label: "Hizmetlerim",
          href: "/panel/services",
          description: "Bagli hizmet akisina don.",
          kind: "open_services",
          emphasis: "secondary",
        }}
      >
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          Atlas sizden bilgi istediginde ayni launch omurgasina bagli bir thread acilir; siz de form,
          mesaj veya belge ile ayni yerden yanit verirsiniz.
        </div>
      </PortalPageHero>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[1.55rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Aktif request thread’leri</CardTitle>
            <CardDescription>
              Atlas ekibinin sizden bilgi istediği veya sizin başlattığınız talepler.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.requestThreads.length > 0 ? (
              workspace.requestThreads.map((thread) => <ThreadCard key={thread.id} thread={thread} />)
            ) : (
              <AtlasEmptySurface
                title="Şu an açık request thread yok"
                description="Atlas sizden bilgi istediğinde veya siz yeni bir konu açtığınızda thread akışı burada görünür. Bu sırada destek veya form merkezi üzerinden yeni talep başlatabilirsiniz."
                tone="neutral"
                primaryAction={{ label: "Destek Merkezi", href: "/panel/support" }}
                secondaryAction={{ label: "Hizmetlerim", href: "/panel/services", variant: "outline" }}
                className="!min-h-0 py-6"
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.55rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Form merkezi</CardTitle>
            <CardDescription>
              Atlas sizden istediğinde doldurabileceğiniz aktif form kanalları.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {workspace.allowedFormCodes.map((code) => (
                <Badge key={code} variant="outline" className="font-mono">
                  {code}
                </Badge>
              ))}
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
              <p className="text-sm font-medium">Genel destek veya yeni konu açmak ister misiniz?</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Standart launch akışı dışındaki sorular için genel destek formunu kullanabilirsiniz.
              </p>
              {!catalogIntakeEnabled ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Catalog intake formu Atlas ekibi size atadığında burada açılır. Bu aşamada ürün
                  dosyanızı paylaşmak için yeni bir request thread açabilirsiniz.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="rounded-2xl">
                  <Link href="/panel/support/forms/ATL-701">Genel destek formu</Link>
                </Button>
                {catalogIntakeEnabled ? (
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link href="/panel/support/forms/ATL-201">Catalog intake formu</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link href="/panel/support">Catalog intake istegi ac</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
