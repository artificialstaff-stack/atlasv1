"use client";

import { Building2, Calendar, CreditCard, FileText, Landmark, MapPin, ShieldCheck } from "lucide-react";
import {
  AtlasEmptySurface,
  AtlasHeroBoard,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTimelineRail,
} from "@/components/portal/atlas-widget-kit";

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  state_of_formation: string;
  ein_number: string | null;
  formation_date: string | null;
  status: string;
  registered_agent_name: string | null;
  bank_name: string | null;
  bank_account_status: string | null;
  business_city: string | null;
  business_state: string | null;
  company_email: string | null;
  company_phone: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  formation_in_progress: "Kuruluyor",
  active: "Aktif",
  suspended: "Askıda",
  dissolved: "Kapatıldı",
};

const COMPANY_TYPES: Record<string, string> = {
  llc: "LLC",
  corporation: "Corporation",
  sole_proprietorship: "Sole Proprietorship",
  partnership: "Partnership",
  other: "Diğer",
};

const BANK_STATUS: Record<string, string> = {
  not_opened: "Açılmadı",
  pending: "Beklemede",
  active: "Aktif",
  closed: "Kapatıldı",
};

function companyTone(status: string) {
  if (status === "active") return "success" as const;
  if (status === "formation_in_progress") return "warning" as const;
  if (status === "suspended" || status === "dissolved") return "danger" as const;
  return "primary" as const;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("tr-TR") : "Hazır değil";
}

export function CompaniesContent({ companies }: { companies: Company[] }) {
  const activeCount = companies.filter((company) => company.status === "active").length;
  const einCount = companies.filter((company) => Boolean(company.ein_number)).length;
  const bankReadyCount = companies.filter((company) => company.bank_account_status === "active").length;

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow="Company Control"
        title="Şirketlerim"
        description="LLC kuruluşu, EIN hazırlığı, registered agent ve banka readiness bilgileri bu modülde tek yerde tutulur."
        tone="cobalt"
        surface="secondary"
        metrics={[
          { label: "Şirket", value: `${companies.length}`, tone: "primary" },
          { label: "Aktif", value: `${activeCount}`, tone: "success" },
          { label: "EIN hazır", value: `${einCount}`, tone: "cobalt" },
          { label: "Banka ready", value: `${bankReadyCount}`, tone: "warning" },
        ]}
        primaryAction={{ label: "Hizmetler", href: "/panel/services" }}
        secondaryAction={{ label: "Belgeler", href: "/panel/documents", variant: "outline" }}
      >
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/85">
          LLC modülü açıldığında ilerleme artık sidebar rozetlerinde değil, bu ekran içindeki kayıt kartları ve readiness sinyalleri üzerinden görünür.
        </div>
      </AtlasHeroBoard>

      {companies.length === 0 ? (
        <AtlasEmptySurface
          title="Henüz şirket kaydı yok"
          description="LLC kuruluş paketi işlendiğinde burada şirket kimliği, EIN ve bankacılık readiness detayları görünür."
          tone="cobalt"
          primaryAction={{ label: "Hizmet paketlerini aç", href: "/panel/services" }}
          secondaryAction={{ label: "Destek merkezi", href: "/panel/support", variant: "outline" }}
        />
      ) : (
        <>
          <AtlasSectionPanel
            eyebrow="Entity Registry"
            title="Şirket kayıtları"
            description="Her şirket kartı operasyonda hangi seviyede olduğunuzu ve hangi varlıkların hazır olduğunu gösterir."
            badge={`${companies.length} kayıt`}
          >
            <AtlasStackGrid columns="two">
              {companies.map((company) => {
                const location = company.business_state
                  ? company.business_city
                    ? `${company.business_city}, ${company.business_state}`
                    : company.business_state
                  : "Henüz girilmedi";
                const timelineItems = [
                  {
                    id: `${company.id}-formation`,
                    title: "Kuruluş",
                    description: company.state_of_formation
                      ? `${company.state_of_formation} üzerinden kayıt açıldı.`
                      : "Kuruluş eyaleti henüz işlenmedi.",
                    badge: formatDate(company.formation_date),
                    tone: company.formation_date ? ("success" as const) : ("warning" as const),
                    icon: Building2,
                  },
                  {
                    id: `${company.id}-ein`,
                    title: "EIN",
                    description: company.ein_number
                      ? `EIN numarası sisteme işlendi: ${company.ein_number}`
                      : "EIN numarası henüz tamamlanmadı.",
                    badge: company.ein_number ? "Hazır" : "Bekliyor",
                    tone: company.ein_number ? ("success" as const) : ("warning" as const),
                    icon: FileText,
                  },
                  {
                    id: `${company.id}-bank`,
                    title: "Banka readiness",
                    description: company.bank_name
                      ? `${company.bank_name} · ${BANK_STATUS[company.bank_account_status ?? "not_opened"] ?? company.bank_account_status}`
                      : "Banka lane'i henüz açılmadı.",
                    badge: company.bank_name ? "Bağlı" : "Hazır değil",
                    tone: company.bank_name ? ("cobalt" as const) : ("neutral" as const),
                    icon: CreditCard,
                  },
                ];

                return (
                  <AtlasInsightCard
                    key={company.id}
                    eyebrow={COMPANY_TYPES[company.company_type] || company.company_type}
                    title={company.company_name}
                    description={`${STATUS_LABELS[company.status] || company.status} durumda. Lokasyon: ${location}. Registered agent ve banka readiness aynı kartta tutulur.`}
                    badge={STATUS_LABELS[company.status] || company.status}
                    tone={companyTone(company.status)}
                    icon={Landmark}
                  >
                    <AtlasStackGrid columns="two">
                      <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                        <p className="atlas-kicker">Şirket bilgileri</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-300/82">
                          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-slate-500" />{location}</p>
                          <p className="flex items-start gap-2"><Calendar className="mt-0.5 h-4 w-4 text-slate-500" />Kuruluş: {formatDate(company.formation_date)}</p>
                          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-slate-500" />Registered agent: {company.registered_agent_name ?? "Atlas tarafından atanacak"}</p>
                        </div>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/8 bg-black/20 p-4">
                        <p className="atlas-kicker">Operasyon readiness</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-300/82">
                          <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 text-slate-500" />EIN: {company.ein_number ?? "Bekleniyor"}</p>
                          <p className="flex items-start gap-2"><CreditCard className="mt-0.5 h-4 w-4 text-slate-500" />Banka: {company.bank_name ?? "Hazır değil"}</p>
                          <p className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 text-slate-500" />Durum: {STATUS_LABELS[company.status] || company.status}</p>
                        </div>
                      </div>
                    </AtlasStackGrid>

                    <AtlasTimelineRail items={timelineItems} className="mt-5" />

                    {company.notes ? (
                      <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/20 p-4 text-sm leading-6 text-slate-300/82">
                        {company.notes}
                      </div>
                    ) : null}
                  </AtlasInsightCard>
                );
              })}
            </AtlasStackGrid>
          </AtlasSectionPanel>
        </>
      )}
    </div>
  );
}
