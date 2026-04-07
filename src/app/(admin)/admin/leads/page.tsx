"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { PageHeader } from "@/components/shared/page-header";
import {
  AtlasEmptySurface,
  AtlasInsightCard,
  AtlasSectionPanel,
  AtlasStackGrid,
} from "@/components/portal/atlas-widget-kit";
import {
  CONTACT_STATUS_LABELS,
  type ContactStatus,
  PLAN_TIER_LABELS,
  type PlanTier,
} from "@/types/enums";
import { formatRelativeTime, getStatusVariant } from "@/lib/utils";
import { useLeads } from "@/features/queries";
import { useUpdateLeadStatus, useCreateInvitation } from "@/features/mutations";
import { useLeadsRealtime } from "@/lib/hooks";
import type { Tables } from "@/types/database";
import {
  Mail,
  Phone,
  Building2,
  MoveRight,
  Send,
} from "lucide-react";

type Lead = Tables<"contact_submissions">;

const KANBAN_COLUMNS: { status: ContactStatus; label: string }[] = [
  { status: "new", label: "Yeni" },
  { status: "contacted", label: "İletişime Geçildi" },
  { status: "qualified", label: "Uygun" },
  { status: "converted", label: "Dönüştürüldü" },
  { status: "rejected", label: "Reddedildi" },
];

export default function AdminLeadsPage() {
  useLeadsRealtime();
  const { data: leads = [], isLoading: loading } = useLeads();
  const updateStatusMutation = useUpdateLeadStatus();
  const createInvitationMutation = useCreateInvitation();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePlan, setInvitePlan] = useState<string>("starter");

  function handleUpdateStatus(leadId: string, newStatus: ContactStatus) {
    updateStatusMutation.mutate({ leadId, status: newStatus });
  }

  async function handleInvite() {
    if (!selectedLead) return;

    createInvitationMutation.mutate(
      { email: inviteEmail || selectedLead.email, planTier: invitePlan },
      {
        onSuccess: () => {
          // Lead durumunu converted yap
          handleUpdateStatus(selectedLead.id, "converted");

          setInviteModalOpen(false);
          setSelectedLead(null);
          setInviteEmail("");
        },
      },
    );
  }

  function getLeadsByStatus(status: ContactStatus) {
    return leads.filter((l) => l.status === status);
  }

  function getNextStatus(current: ContactStatus): ContactStatus | null {
    const order: ContactStatus[] = ["new", "contacted", "qualified", "converted"];
    const idx = order.indexOf(current);
    if (idx < 0 || idx >= order.length - 1) return null;
    return order[idx + 1];
  }

  const metricCards = [
    {
      title: "Yeni başvuru",
      value: `${getLeadsByStatus("new").length}`,
      description: "Henüz ilk temas yapılmamış başvurular.",
      tone: "copper" as const,
    },
    {
      title: "Uygun aday",
      value: `${getLeadsByStatus("qualified").length}`,
      description: "Davet göndermeye hazır nitelikli adaylar.",
      tone: "cobalt" as const,
    },
    {
      title: "Dönüşen lead",
      value: `${getLeadsByStatus("converted").length}`,
      description: "Müşteriye çevrilmiş ve invite akışına giren kayıtlar.",
      tone: "success" as const,
    },
    {
      title: "Reddedilen",
      value: `${getLeadsByStatus("rejected").length}`,
      description: "Şu an için ilerlemeyen veya uygun olmayan kayıtlar.",
      tone: "warning" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM & Leads"
        description="Başvuru hunisini kanban yoğunluğunda yönetin, nitelikli lead’leri invite akışına taşıyın."
      />

      <AtlasStackGrid columns="four">
        {metricCards.map((metric) => (
          <AtlasInsightCard
            key={metric.title}
            eyebrow="Lead Signal"
            title={metric.value}
            description={metric.description}
            badge={metric.title}
            tone={metric.tone}
            className="min-h-[190px]"
          />
        ))}
      </AtlasStackGrid>

      {loading ? (
        <AtlasEmptySurface
          title="Lead board yukleniyor"
          description="Basvurular ve asama metrikleri operator workbench icin hazirlaniyor."
          tone="cobalt"
        />
      ) : (
        <AtlasSectionPanel
          eyebrow="Lead Pipeline"
          title="Kanban operator workbench"
          description="Her kolon tek bir lead durumunu temsil eder. Hareket, davet ve red aksiyonlari kart seviyesinde yapilir."
          badge={`${leads.length} toplam lead`}
        >
          <div className="grid gap-4 xl:grid-cols-5">
            {KANBAN_COLUMNS.map((col) => {
              const colLeads = getLeadsByStatus(col.status);
              return (
                <section key={col.status} className="portal-surface-list rounded-[1.35rem] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Funnel Lane
                      </p>
                      <h2 className="mt-2 text-sm font-semibold text-white">{col.label}</h2>
                    </div>
                    <Badge variant={getStatusVariant(col.status)}>{colLeads.length}</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {colLeads.map((lead) => {
                      const next = getNextStatus(lead.status as ContactStatus);
                      return (
                        <article
                          key={lead.id}
                          className="rounded-[1.1rem] border border-white/8 bg-background/40 p-3 transition hover:border-primary/20 hover:bg-background/55"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </p>
                            {lead.phone ? (
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </p>
                            ) : null}
                            {lead.company_name ? (
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <Building2 className="h-3 w-3" />
                                {lead.company_name}
                              </p>
                            ) : null}
                          </div>

                          <p className="mt-3 text-xs leading-6 text-muted-foreground line-clamp-3">
                            {lead.message}
                          </p>
                          <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            {formatRelativeTime(lead.created_at)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {next ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-xl border-white/10 bg-white/[0.03] text-xs"
                                onClick={() => handleUpdateStatus(lead.id, next)}
                              >
                                <MoveRight className="mr-1 h-3 w-3" />
                                {CONTACT_STATUS_LABELS[next]}
                              </Button>
                            ) : null}
                            {lead.status === "qualified" ? (
                              <Button
                                size="sm"
                                className="h-7 rounded-xl text-xs"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setInviteEmail(lead.email);
                                  setInviteModalOpen(true);
                                }}
                              >
                                <Send className="mr-1 h-3 w-3" />
                                Davet
                              </Button>
                            ) : null}
                            {lead.status !== "rejected" && lead.status !== "converted" ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 rounded-xl text-xs"
                                onClick={() => handleUpdateStatus(lead.id, "rejected")}
                              >
                                Reddet
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}

                    {colLeads.length === 0 ? (
                      <AtlasEmptySurface
                        title="Bu lane bos"
                        description="Bu asamada bekleyen basvuru yok. Yeni kayit geldiginde burada gorunecek."
                        tone="neutral"
                        className="px-4 py-8"
                      />
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </AtlasSectionPanel>
      )}

      {/* Davet Modal */}
      <ModalWrapper
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        title="Müşteri Davet Et"
        description={`"${selectedLead?.name}" için davet linki oluşturun.`}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">E-posta</label>
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Davet e-postası"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Plan</label>
            <Select value={invitePlan} onValueChange={setInvitePlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(PLAN_TIER_LABELS) as [PlanTier, string][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={handleInvite}
            disabled={createInvitationMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {createInvitationMutation.isPending ? "Oluşturuluyor..." : "Davet Linki Oluştur & Kopyala"}
          </Button>
        </div>
      </ModalWrapper>
    </div>
  );
}
