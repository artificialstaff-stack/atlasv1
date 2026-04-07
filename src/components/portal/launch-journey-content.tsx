"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";

export function LaunchJourneyContent({ workspace }: { workspace: CustomerWorkspaceViewModel }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Launch Journey"
        description="Şirket kuruluşundan ilk satışa kadar Atlas operasyonunun ilerlediği ana plan burada görünür."
      />

      <div className="grid gap-4">
        {workspace.launchJourney.map((stage, index) => (
          <Card key={stage.key} className="rounded-[1.5rem] border-white/8 bg-card/85">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    {index + 1}. {stage.title}
                  </CardTitle>
                  <CardDescription>{stage.expectedDeliverable}</CardDescription>
                </div>
                <Badge variant="outline">{stage.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Atlas aksiyonu</p>
                <p className="mt-2 text-sm leading-6">{stage.atlasAction}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Müşteri aksiyonu</p>
                <p className="mt-2 text-sm leading-6">{stage.customerAction}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Gerekli girdiler</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {stage.requiredInputs.map((item) => (
                    <Badge key={item} variant="outline" className="text-[11px]">
                      {item}
                    </Badge>
                  ))}
                </div>
                {stage.blockerReason ? (
                  <p className="mt-3 text-xs leading-5 text-amber-300">{stage.blockerReason}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
