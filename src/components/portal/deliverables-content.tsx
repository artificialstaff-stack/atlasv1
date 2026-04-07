"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageHero } from "./portal-page-hero";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";
import { formatDate } from "@/lib/utils";
import { useClientGuidance } from "@/app/(client)/panel/_components/client-guidance-provider";

export function DeliverablesContent({ workspace }: { workspace: CustomerWorkspaceViewModel }) {
  useClientGuidance(
    useMemo(
      () => ({
        focusLabel: workspace.deliverableCount > 0 ? "Hazir deliverable'lar var" : "Deliverable bekleniyor",
        summary:
          workspace.deliverableCount > 0
            ? "Atlas ekibinin hazirladigi gorunur ciktıları bu ekrandan acabilirsiniz."
            : "Atlas ekibi ciktıları hazirladikca bu ekran kendiliginden dolacak.",
        metrics: [
          { label: "Toplam", value: `${workspace.deliverableCount}` },
          { label: "Request", value: `${workspace.requestCount}` },
          { label: "Asama", value: workspace.launchStageLabel },
        ],
      }),
      [workspace.deliverableCount, workspace.launchStageLabel, workspace.requestCount],
    ),
  );

  return (
    <div className="space-y-6">
      <PortalPageHero
        eyebrow="Gorunur Ciktilar"
        title="Deliverables"
        description="Atlas ekibinin hazirladigi gorunur ciktilar ve onay bekleyen materyaller burada yer alir."
        surfaceVariant="secondary"
        badges={["Atlas hazirlar", `${workspace.deliverableCount} deliverable`]}
        metrics={[
          { label: "Toplam", value: `${workspace.deliverableCount}` },
          { label: "Request", value: `${workspace.requestCount}` },
          { label: "Asama", value: workspace.launchStageLabel },
        ]}
        primaryAction={{
          id: "deliverables:services",
          label: "Hizmetlerim",
          href: "/panel/services",
          description: "Bagli hizmet akisina don.",
          kind: "open_services",
        }}
        secondaryAction={{
          id: "deliverables:requests",
          label: "Requests & Forms",
          href: "/panel/requests",
          description: "Ayni ciktinin request baglamini gor.",
          kind: "open_support",
          emphasis: "secondary",
        }}
      >
        <div className="rounded-2xl border border-white/8 bg-background/35 px-4 py-3 text-sm leading-6 text-slate-200/90">
          Publish, ready veya onay bekleyen ciktılar ayni launch omurgasina bagli kalir; ayrica operator ekranina gitmeniz gerekmez.
        </div>
      </PortalPageHero>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspace.deliverables.length > 0 ? (
          workspace.deliverables.map((deliverable) => (
            <Card key={deliverable.id} className="rounded-[1.45rem] border-white/8 bg-card/85">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{deliverable.title}</CardTitle>
                  <Badge variant="outline">{deliverable.status}</Badge>
                </div>
                <CardDescription>{deliverable.deliverableType}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{deliverable.summary}</p>
                <div className="text-[11px] text-muted-foreground">
                  {formatDate(deliverable.createdAt)}
                </div>
                {deliverable.artifactUrl ? (
                  <Button asChild variant="outline" className="w-full rounded-2xl">
                    <Link href={deliverable.artifactUrl}>
                      {deliverable.artifactLabel ?? "Çıktıyı aç"}
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full rounded-[1.55rem] border border-dashed border-white/10 bg-card/80 p-10 text-center text-sm text-muted-foreground">
            Atlas ekibi çıktıları hazırladıkça burada görünecek.
          </div>
        )}
      </div>
    </div>
  );
}
