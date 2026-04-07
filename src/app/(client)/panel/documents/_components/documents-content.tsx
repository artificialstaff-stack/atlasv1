"use client";

import { useMemo } from "react";
import { Download, File, FileImage, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClientGuidance } from "../../_components/client-guidance-provider";
import { useI18n } from "@/i18n/provider";
import {
  AtlasEmptySurface,
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
} from "@/components/portal/atlas-widget-kit";

interface DocFile {
  name: string;
  size: number;
  createdAt: string;
  url: string;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return FileText;
  if (["xlsx", "xls", "csv"].includes(ext ?? "")) return FileSpreadsheet;
  if (["jpg", "jpeg", "png", "webp"].includes(ext ?? "")) return FileImage;
  return File;
}

function getFileCategory(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("llc") || lower.includes("ein") || lower.includes("legal")) return "legal";
  if (lower.includes("customs") || lower.includes("gumruk") || lower.includes("gümrük")) return "customs";
  if (lower.includes("invoice") || lower.includes("fatura")) return "invoice";
  return "general";
}

const categoryColors: Record<string, string> = {
  legal: "text-emerald-400 bg-emerald-400/10",
  customs: "text-amber-400 bg-amber-400/10",
  invoice: "text-blue-400 bg-blue-400/10",
  general: "text-muted-foreground bg-muted",
};

export function DocumentsContent({ files }: { files: DocFile[] }) {
  const { t } = useI18n();
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const categories = new Set(files.map((file) => getFileCategory(file.name))).size;

  const copy = useMemo(
    () => ({
      title: t("portal.documents.title"),
      intro: t("portal.documents.intro"),
      pageBadge: t("portal.documents.pageBadge"),
      viewBadge: t("portal.documents.viewBadge"),
      sectionTitle: t("portal.documents.sectionTitle"),
      sectionDescription: t("portal.documents.sectionDescription"),
      metrics: {
        total: t("portal.documents.metrics.total"),
        category: t("portal.documents.metrics.category"),
        size: t("portal.documents.metrics.size"),
      },
      ctaProcess: t("portal.documents.ctaProcess"),
      ctaSupport: t("portal.documents.ctaSupport"),
      principlesTitle: t("portal.documents.principlesTitle"),
      principles: [
        t("portal.documents.principles.first"),
        t("portal.documents.principles.second"),
        t("portal.documents.principles.third"),
      ],
      emptyTitle: t("portal.documents.emptyTitle"),
      emptyDescription: t("portal.documents.empty"),
      download: t("portal.documents.download"),
      categoryLabels: {
        legal: t("portal.documents.categories.legal"),
        customs: t("portal.documents.categories.customs"),
        invoice: t("portal.documents.categories.invoice"),
        general: t("portal.documents.categories.general"),
      },
    }),
    [t],
  );

  useClientGuidance({
    focusLabel: files.length > 0 ? copy.sectionTitle : copy.emptyTitle,
    summary: files.length > 0 ? copy.sectionDescription : copy.emptyDescription,
    metrics: [
      { label: copy.metrics.total, value: `${files.length}` },
      { label: copy.metrics.category, value: `${categories}` },
      { label: copy.metrics.size, value: `${Math.round(totalSize / 1024)} KB` },
    ],
  });

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow={copy.pageBadge}
        title={copy.title}
        description={copy.intro}
        badges={[copy.viewBadge]}
        tone="cobalt"
        surface="secondary"
        metrics={[
          { label: copy.metrics.total, value: `${files.length}`, tone: "primary" },
          { label: copy.metrics.category, value: `${categories}`, tone: "cobalt" },
          { label: copy.metrics.size, value: `${Math.round(totalSize / 1024)} KB`, tone: "warning" },
        ]}
        primaryAction={{ label: copy.ctaProcess, href: "/panel/process" }}
        secondaryAction={{ label: copy.ctaSupport, href: "/panel/support", variant: "outline" }}
      >
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/85">
          Belge modülü artık pasif liste değil; önce resmi evrak snapshot’ını, sonra indirilebilir dosya kartlarını gösteriyor.
        </div>
      </AtlasHeroBoard>

      <AtlasStackGrid columns="split">
        <AtlasSectionPanel
          eyebrow="Document Readiness"
          title={copy.sectionTitle}
          description={copy.sectionDescription}
          badge={`${files.length} belge`}
        >
          <AtlasStackGrid columns="three">
            {[
              { label: copy.metrics.total, value: `${files.length}`, tone: "primary" as const },
              { label: copy.metrics.category, value: `${categories}`, tone: "cobalt" as const },
              { label: copy.metrics.size, value: `${Math.round(totalSize / 1024)} KB`, tone: "warning" as const },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                <p className="atlas-kicker">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </AtlasStackGrid>
        </AtlasSectionPanel>

        <AtlasSectionPanel
          eyebrow="Document Rules"
          title={copy.principlesTitle}
          description="Atlas’ın belge lane’i açık olduğunda bu alan resmi dokümanların hangi düzende tutulduğunu açıklar."
          badge="Utility lane"
        >
          <div className="space-y-3">
            {copy.principles.map((item) => (
              <div key={item} className="rounded-[1.15rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/82">
                {item}
              </div>
            ))}
          </div>
        </AtlasSectionPanel>
      </AtlasStackGrid>

      {files.length > 0 ? (
        <AtlasSectionPanel
          eyebrow="Document Library"
          title="İndirilebilir belgeler"
          description="EIN, LLC, invoice ve customs belgeleri kategori bazında renklenmiş kartlarla açılır."
          badge={`${files.length} dosya`}
        >
          <AtlasStackGrid columns="three">
            {files.map((file) => {
              const Icon = getFileIcon(file.name);
              const category = getFileCategory(file.name);
              const colorClass = categoryColors[category] ?? categoryColors.general;

              return (
                <AtlasInsightCard
                  key={file.name}
                  eyebrow={copy.categoryLabels[category] ?? copy.categoryLabels.general}
                  title={file.name}
                  description={`${file.size > 0 ? `${Math.round(file.size / 1024)} KB` : "Boyut yok"} · ${new Date(file.createdAt).toLocaleDateString("tr-TR")}`}
                  tone={category === "legal" ? "success" : category === "customs" ? "warning" : category === "invoice" ? "cobalt" : "neutral"}
                  icon={Icon}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", colorClass)}>
                      {copy.categoryLabels[category] ?? copy.categoryLabels.general}
                    </span>
                  </div>
                  <div className="mt-5">
                    <Button variant="outline" size="sm" className="w-full rounded-2xl border-white/10 bg-white/[0.03]" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        {copy.download}
                      </a>
                    </Button>
                  </div>
                </AtlasInsightCard>
              );
            })}
          </AtlasStackGrid>
        </AtlasSectionPanel>
      ) : (
        <AtlasEmptySurface
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          tone="cobalt"
          primaryAction={{ label: copy.ctaProcess, href: "/panel/process" }}
          secondaryAction={{ label: copy.ctaSupport, href: "/panel/support", variant: "outline" }}
        />
      )}
    </div>
  );
}
