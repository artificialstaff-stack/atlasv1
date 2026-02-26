"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import {
  CONTACT_STATUS,
  CONTACT_STATUS_LABELS,
  type ContactStatus,
  PLAN_TIER_LABELS,
  type PlanTier,
} from "@/types/enums";
import { formatRelativeTime, getStatusVariant } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables } from "@/types/database";
import {
  UserPlus,
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
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePlan, setInvitePlan] = useState<string>("starter");
  const [inviting, setInviting] = useState(false);

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  async function updateLeadStatus(leadId: string, newStatus: ContactStatus) {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      toast.error("Durum güncellenemedi", { description: error.message });
      return;
    }

    toast.success(`Lead durumu "${CONTACT_STATUS_LABELS[newStatus]}" olarak güncellendi`);
    fetchLeads();
  }

  async function updateAdminNotes(leadId: string, notes: string) {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ admin_notes: notes })
      .eq("id", leadId);

    if (error) {
      toast.error("Notlar kaydedilemedi");
      return;
    }
    toast.success("Notlar kaydedildi");
    fetchLeads();
  }

  async function handleInvite() {
    if (!selectedLead) return;
    setInviting(true);

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 gün geçerli

    const { error } = await supabase.from("invitations").insert({
      email: inviteEmail || selectedLead.email,
      token,
      plan_tier: invitePlan,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast.error("Davet oluşturulamadı", { description: error.message });
      setInviting(false);
      return;
    }

    // Lead durumunu converted yap
    await updateLeadStatus(selectedLead.id, "converted");

    const inviteUrl = `${window.location.origin}/register?token=${token}`;
    await navigator.clipboard.writeText(inviteUrl);

    toast.success("Davet linki oluşturuldu ve kopyalandı!", {
      description: inviteUrl,
    });

    setInviting(false);
    setInviteModalOpen(false);
    setSelectedLead(null);
    setInviteEmail("");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM & Leads</h1>
        <p className="text-muted-foreground">
          Başvuruları yönetin ve uygun adayları müşteriye dönüştürün.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Yükleniyor...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {KANBAN_COLUMNS.map((col) => {
            const colLeads = getLeadsByStatus(col.status);
            return (
              <div key={col.status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <Badge variant={getStatusVariant(col.status)}>
                    {colLeads.length}
                  </Badge>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {colLeads.map((lead) => {
                    const next = getNextStatus(lead.status as ContactStatus);
                    return (
                      <Card
                        key={lead.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div>
                            <p className="text-sm font-semibold truncate">
                              {lead.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </p>
                            {lead.phone && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </p>
                            )}
                            {lead.company_name && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {lead.company_name}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {lead.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(lead.created_at)}
                          </p>

                          <div className="flex gap-1 flex-wrap">
                            {next && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() =>
                                  updateLeadStatus(lead.id, next)
                                }
                              >
                                <MoveRight className="h-3 w-3 mr-1" />
                                {CONTACT_STATUS_LABELS[next]}
                              </Button>
                            )}
                            {lead.status === "qualified" && (
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setInviteEmail(lead.email);
                                  setInviteModalOpen(true);
                                }}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Davet
                              </Button>
                            )}
                            {lead.status !== "rejected" &&
                              lead.status !== "converted" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    updateLeadStatus(lead.id, "rejected")
                                  }
                                >
                                  Reddet
                                </Button>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {colLeads.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed p-4 text-center">
                      <p className="text-xs text-muted-foreground">Boş</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
            disabled={inviting}
          >
            <Send className="mr-2 h-4 w-4" />
            {inviting ? "Oluşturuluyor..." : "Davet Linki Oluştur & Kopyala"}
          </Button>
        </div>
      </ModalWrapper>
    </div>
  );
}
