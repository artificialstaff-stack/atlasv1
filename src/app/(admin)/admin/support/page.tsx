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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import {
  TICKET_STATUS_LABELS,
  type TicketStatus,
  TICKET_PRIORITY_LABELS,
  type TicketPriority,
} from "@/types/enums";
import { formatDate, formatRelativeTime, getStatusVariant } from "@/lib/utils";
import { toast } from "sonner";
import { LifeBuoy, Search, MessageSquare } from "lucide-react";
import type { Tables } from "@/types/database";

type TicketWithUser = Tables<"support_tickets"> & {
  users?: { first_name: string; last_name: string; company_name: string } | null;
};

export default function AdminSupportPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUser | null>(
    null
  );
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  const fetchTickets = useCallback(async () => {
    let query = supabase
      .from("support_tickets")
      .select("*, users(first_name, last_name, company_name)")
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setTickets((data as TicketWithUser[]) ?? []);
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function handleRespond() {
    if (!selectedTicket) return;

    const updateData: {
      admin_response?: string;
      status?: string;
      resolved_at?: string;
    } = {};
    if (response) updateData.admin_response = response;
    if (newStatus) {
      updateData.status = newStatus;
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }
    }

    if (Object.keys(updateData).length === 0) {
      toast.error("Lütfen yanıt yazın veya durum seçin");
      return;
    }

    const { error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", selectedTicket.id);

    if (error) {
      toast.error("Güncelleme başarısız");
      return;
    }

    toast.success("Destek talebi güncellendi");
    setSelectedTicket(null);
    setResponse("");
    setNewStatus("");
    fetchTickets();
  }

  const filteredTickets = tickets.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.subject.toLowerCase().includes(s) ||
      t.users?.company_name?.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Destek Talepleri</h1>
        <p className="text-muted-foreground">
          Müşteri destek taleplerini yönetin ve yanıtlayın.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Konu, şirket veya açıklama ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Durum filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {(
              Object.entries(TICKET_STATUS_LABELS) as [TicketStatus, string][]
            ).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ticket Tablosu */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              Yükleniyor...
            </p>
          ) : filteredTickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Konu</TableHead>
                  <TableHead>Öncelik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <p className="font-medium text-sm">
                        {ticket.users?.company_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.users?.first_name} {ticket.users?.last_name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TICKET_PRIORITY_LABELS[
                          ticket.priority as TicketPriority
                        ] ?? ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {TICKET_STATUS_LABELS[
                          ticket.status as TicketStatus
                        ] ?? ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(ticket.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setResponse(ticket.admin_response ?? "");
                          setNewStatus(ticket.status);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Yanıtla
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={<LifeBuoy className="h-12 w-12" />}
                title="Destek talebi bulunamadı"
                description="Henüz destek talebi yok veya filtrelerinizi değiştirin."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yanıt Modal */}
      <ModalWrapper
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
        title={selectedTicket?.subject ?? "Destek Talebi"}
        description={`${selectedTicket?.users?.company_name ?? ""} — ${
          selectedTicket?.users?.first_name ?? ""
        } ${selectedTicket?.users?.last_name ?? ""}`}
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm font-medium mb-1">Müşteri Mesajı:</p>
              <p className="text-sm text-muted-foreground">
                {selectedTicket.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatDate(selectedTicket.created_at)} · Öncelik:{" "}
                {TICKET_PRIORITY_LABELS[
                  selectedTicket.priority as TicketPriority
                ] ?? selectedTicket.priority}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Durum</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(TICKET_STATUS_LABELS) as [
                      TicketStatus,
                      string,
                    ][]
                  ).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Yanıtı</label>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Müşteriye yanıtınızı yazın..."
                rows={4}
              />
            </div>

            <Button className="w-full" onClick={handleRespond}>
              Gönder & Güncelle
            </Button>
          </div>
        )}
      </ModalWrapper>
    </div>
  );
}
