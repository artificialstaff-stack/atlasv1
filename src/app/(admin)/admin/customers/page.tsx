"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { EmptyState } from "@/components/shared/empty-state";
import {
  ONBOARDING_STATUS_LABELS,
  type OnboardingStatus,
  PLAN_TIER_LABELS,
  type PlanTier,
} from "@/types/enums";
import { formatDate, getStatusVariant } from "@/lib/utils";
import { toast } from "sonner";
import { Users, Search, Eye } from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/types/database";

type Customer = Tables<"users"> & {
  user_subscriptions: Tables<"user_subscriptions">[] | null;
};

export default function AdminCustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let query = supabase
        .from("users")
        .select("*, user_subscriptions(*)")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("onboarding_status", statusFilter);
      }

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        console.error("[admin/customers] fetch error:", error);
        toast.error("Müşteriler yüklenemedi", { description: error.message });
        setLoading(false);
        return;
      }

      setCustomers((data as Customer[]) ?? []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [supabase, statusFilter]);

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(s) ||
      c.last_name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.company_name.toLowerCase().includes(s)
    );
  });

  function getActiveSub(customer: Customer) {
    if (!customer.user_subscriptions) return null;
    return customer.user_subscriptions[0] ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Müşteriler</h1>
        <p className="text-muted-foreground">
          Aktif müşteri profilleri ve abonelik yönetimi.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İsim, e-posta veya şirket ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Durum filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {(
              Object.entries(ONBOARDING_STATUS_LABELS) as [
                OnboardingStatus,
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              Yükleniyor...
            </p>
          ) : filteredCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Şirket</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Kayıt</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const sub = getActiveSub(customer);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customer.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {customer.company_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(customer.onboarding_status)}
                        >
                          {ONBOARDING_STATUS_LABELS[
                            customer.onboarding_status as OnboardingStatus
                          ] ?? customer.onboarding_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub ? (
                          <Badge variant="outline">
                            {PLAN_TIER_LABELS[sub.plan_tier as PlanTier] ??
                              sub.plan_tier}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(customer.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/customers/${customer.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detay
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="Müşteri bulunamadı"
                description="Filtrelerinizi değiştirmeyi deneyin."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
