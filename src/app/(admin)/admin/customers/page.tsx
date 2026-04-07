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
import { PageHeader } from "@/components/shared/page-header";
import {
  ONBOARDING_STATUS_LABELS,
  type OnboardingStatus,
  getOnboardingStatusLabel,
  getPlanTierLabel,
  type PlanTier,
} from "@/types/enums";
import { formatDate, getStatusVariant } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Eye,
  Rocket,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/types/database";
import { useI18n } from "@/i18n/provider";

type Customer = Tables<"users"> & {
  user_subscriptions: Tables<"user_subscriptions">[] | null;
};

export default function AdminCustomersPage() {
  const supabase = createClient();
  const { t, locale } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer")
        .eq("is_active", true);

      if (cancelled) return;

      if (roleError) {
        console.error("[admin/customers] role fetch error:", roleError);
        toast.error(t("common.error"), { description: roleError.message });
        setLoading(false);
        return;
      }

      const customerIds = [...new Set((roleRows ?? []).map((row) => row.user_id).filter(Boolean))];

      if (customerIds.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("users")
        .select("*, user_subscriptions(*)")
        .in("id", customerIds)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("onboarding_status", statusFilter);
      }

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        console.error("[admin/customers] fetch error:", error);
        toast.error(t("common.error"), { description: error.message });
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

  const onboardingCount = customers.filter((customer) => customer.onboarding_status === "onboarding").length;
  const activeCount = customers.filter((customer) => customer.onboarding_status === "active").length;
  const planCount = customers.filter((customer) => getActiveSub(customer)).length;
  const spotlightCustomers = filteredCustomers.slice(0, 4);
  const latestCustomer = filteredCustomers[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("admin.customers.title")}
        description={t("admin.customers.description")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/admin/forms">{t("admin.customers.formsButton")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/workflows">{t("admin.customers.workflowsButton")}</Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="rounded-2xl border-white/8 bg-card/80">
          <CardContent className="flex items-start justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.customers.totalLabel")}</p>
              <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{customers.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("admin.customers.totalHelper")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/60 p-2.5 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="flex items-start justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.customers.onboardingLabel")}</p>
              <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{onboardingCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("admin.customers.onboardingHelper")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/60 p-2.5 text-primary">
              <Rocket className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-start justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.customers.activeLabel")}</p>
              <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{activeCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("admin.customers.activeHelper")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/60 p-2.5 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/8 bg-card/80">
          <CardContent className="flex items-start justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.customers.planLabel")}</p>
              <p className="mt-1.5 text-[1.85rem] font-semibold tracking-tight">{planCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("admin.customers.planHelper")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/60 p-2.5 text-primary">
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.customers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("admin.customers.statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.customers.all")}</SelectItem>
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border-white/8 bg-card/80 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <p className="py-12 text-center text-muted-foreground">{t("admin.customers.loading")}</p>
            ) : filteredCustomers.length > 0 ? (
              <div className="max-h-[560px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                    <TableRow>
                      <TableHead>{t("admin.customers.customerHeader")}</TableHead>
                      <TableHead>{t("admin.customers.companyHeader")}</TableHead>
                      <TableHead>{t("admin.customers.statusHeader")}</TableHead>
                      <TableHead>{t("admin.customers.planHeader")}</TableHead>
                      <TableHead>{t("admin.customers.recordHeader")}</TableHead>
                      <TableHead className="text-right">{t("admin.customers.actionHeader")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const sub = getActiveSub(customer);
                      return (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">
                                {customer.first_name} {customer.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {customer.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{customer.company_name}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(customer.onboarding_status)}>
                              {getOnboardingStatusLabel(customer.onboarding_status as OnboardingStatus, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub ? (
                              <Badge variant="outline">
                                {getPlanTierLabel(sub.plan_tier as PlanTier, locale)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("admin.customers.noValue")}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(customer.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/customers/${customer.id}`}>
                                <Eye className="mr-1 h-4 w-4" />
                                {t("admin.customers.detailButton")}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12">
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title={t("admin.customers.noCustomersTitle")}
                  description={t("admin.customers.noCustomersDescription")}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-2xl border-white/8 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("admin.customers.focusTitle")}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.customers.focusDescription")}
              </p>
              <div className="mt-4 space-y-2.5">
                {spotlightCustomers.length > 0 ? (
                  spotlightCustomers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/admin/customers/${customer.id}`}
                      className="block rounded-xl border border-white/8 bg-background/45 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-background/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{customer.company_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {customer.first_name} {customer.last_name}
                          </p>
                        </div>
                        <Badge variant={getStatusVariant(customer.onboarding_status)}>
                          {getOnboardingStatusLabel(customer.onboarding_status as OnboardingStatus, locale)}
                        </Badge>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground">
                    {t("admin.customers.focusEmpty")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-white/8 bg-card/80">
            <CardContent className="space-y-2.5 p-4">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("admin.customers.flowSummaryTitle")}</h3>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/45 px-3 py-3">
                <span className="text-sm">{t("admin.customers.onboardingRow")}</span>
                <span className="text-sm font-semibold">{onboardingCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-3">
                <span className="text-sm">{t("admin.customers.activeRow")}</span>
                <span className="text-sm font-semibold">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/45 px-3 py-3">
                <span className="text-sm">{t("admin.customers.planRow")}</span>
                <span className="text-sm font-semibold">{planCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-background/45 px-3 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock3 className="h-4 w-4 text-primary" />
                  {t("admin.customers.latestRecord")}
                </div>
                <span className="text-xs text-muted-foreground">
                  {latestCustomer ? formatDate(latestCustomer.created_at) : t("admin.customers.noLatestRecord")}
                </span>
              </div>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/admin/forms">
                  {t("admin.customers.startButton")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
