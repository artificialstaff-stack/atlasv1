"use client";

import { motion } from "framer-motion";
import { FileText, Download, FileSpreadsheet, FileImage, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

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
  if (lower.includes("llc") || lower.includes("ein") || lower.includes("legal"))
    return "Hukuki";
  if (lower.includes("customs") || lower.includes("gumruk") || lower.includes("gümrük"))
    return "Gümrük";
  if (lower.includes("invoice") || lower.includes("fatura"))
    return "Fatura";
  return "Genel";
}

const categoryColors: Record<string, string> = {
  Hukuki: "text-emerald-400 bg-emerald-400/10",
  Gümrük: "text-amber-400 bg-amber-400/10",
  Fatura: "text-blue-400 bg-blue-400/10",
  Genel: "text-muted-foreground bg-muted",
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

export function DocumentsContent({ files }: { files: DocFile[] }) {
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Belgelerim"
        description="LLC sertifikası, EIN mektubu ve gümrük belgeleri gibi dokümanlarınıza erişin."
      />

      {/* KPI Strip */}
      <BentoGrid cols={3}>
        <StatCard title="Toplam Belge" value={files.length} icon={FileText} />
        <StatCard
          title="Toplam Boyut"
          value={Math.round(totalSize / 1024)}
          format="number"
        />
        <StatCard
          title="Kategoriler"
          value={new Set(files.map((f) => getFileCategory(f.name))).size}
          format="number"
        />
      </BentoGrid>

      {/* Document Cards — Glass Morphism Grid */}
      {files.length > 0 ? (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {files.map((file) => {
            const Icon = getFileIcon(file.name);
            const category = getFileCategory(file.name);
            const colorClass = categoryColors[category] ?? categoryColors.Genel;

            return (
              <motion.div
                key={file.name}
                variants={cardVariant}
                className="group relative rounded-xl border bg-card/80 backdrop-blur-sm p-5 transition-all hover:border-primary/20 hover:shadow-lg"
              >
                {/* Category badge */}
                <span
                  className={cn(
                    "absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    colorClass
                  )}
                >
                  {category}
                </span>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate pr-16">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {file.size > 0 ? `${Math.round(file.size / 1024)} KB` : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      İndir
                    </a>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <BentoCell className="w-full">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Henüz belge yok</p>
            <p className="text-xs text-muted-foreground mt-1">
              Süreçleriniz ilerledikçe belgeleriniz buraya yüklenecektir.
            </p>
          </div>
        </BentoCell>
      )}
    </div>
  );
}
