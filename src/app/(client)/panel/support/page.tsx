"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  type TicketStatus,
  type TicketPriority,
} from "@/types/enums";
import { formatDate, getStatusVariant } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LifeBuoy, Plus, Send, MessageCircle, X } from "lucide-react";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTransition } from "@/components/shared/status-transition";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const ticketSchema = z.object({
  subject: z.string().min(3, "Konu en az 3 karakter olmalıdır"),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalıdır"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type TicketFormData = z.infer<typeof ticketSchema>;
type Ticket = Tables<"support_tickets">;

const mapTicketStatus = (s: string) => {
  if (s === "resolved" || s === "closed") return "approved" as const;
  if (s === "in_progress") return "in_progress" as const;
  return "pending" as const;
};

export default function ClientSupportPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", description: "", priority: "medium" },
  });

  useEffect(() => {
    async function fetchTickets() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setTickets(data ?? []);
      setLoading(false);
    }
    fetchTickets();
  }, [supabase]);

  async function onSubmit(data: TicketFormData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
    });

    if (error) {
      toast.error("Talep oluşturulamadı", { description: error.message });
      return;
    }

    toast.success("Destek talebiniz oluşturuldu!");
    form.reset();
    setDialogOpen(false);

    const { data: refreshed } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(refreshed ?? []);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Destek" description="Destek taleplerini görüntüleyin veya yeni talep oluşturun.">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Talep
        </Button>
      </PageHeader>

      {/* Chat-style layout: Ticket list (narrow) + Detail (wide) */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr] min-h-[500px]">
        {/* Ticket Sidebar */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Taleplerim ({tickets.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Yükleniyor...
              </p>
            ) : tickets.length > 0 ? (
              <div className="divide-y divide-border/50">
                {tickets.map((ticket) => (
                  <motion.button
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelected(ticket)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-muted/50",
                      selected?.id === ticket.id && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium truncate">{ticket.subject}</h4>
                      <StatusTransition
                        status={mapTicketStatus(ticket.status)}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {TICKET_PRIORITY_LABELS[ticket.priority as TicketPriority] ?? ticket.priority}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <LifeBuoy className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Henüz destek talebiniz yok
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">
                      {selected.subject}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusTransition
                        status={mapTicketStatus(selected.status)}
                        label={TICKET_STATUS_LABELS[selected.status as TicketStatus] ?? selected.status}
                        size="sm"
                      />
                      <Badge variant="outline" className="text-[10px]">
                        {TICKET_PRIORITY_LABELS[selected.priority as TicketPriority] ?? selected.priority}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 lg:hidden"
                    onClick={() => setSelected(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* User message */}
                  <div className="flex gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm">{selected.description}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDate(selected.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Admin response */}
                  {selected.admin_response && (
                    <div className="flex gap-3">
                      <div className="h-7 w-7 rounded-full bg-emerald-400/10 flex items-center justify-center shrink-0">
                        <LifeBuoy className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                          <p className="text-xs font-medium text-emerald-400 mb-1">
                            Atlas Destek
                          </p>
                          <p className="text-sm">{selected.admin_response}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center p-8"
              >
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Detayları görmek için bir talep seçin
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Yeni Talep Modal */}
      <ModalWrapper
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Yeni Destek Talebi"
        description="Sorununuzu detaylı şekilde açıklayın."
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konu</FormLabel>
                  <FormControl>
                    <Input placeholder="Sorunun kısa özeti" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Öncelik</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Sorununuzu detaylı açıklayın..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {form.formState.isSubmitting ? "Gönderiliyor..." : "Talep Gönder"}
            </Button>
          </form>
        </Form>
      </ModalWrapper>
    </div>
  );
}
