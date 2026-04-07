"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ListChecks,
  Package,
  ShoppingCart,
  FileText,
  ClipboardList,
  LifeBuoy,
  LogOut,
  Menu,
  ChevronRight,
  Building2,
  ShoppingBag,
  Share2,
  Megaphone,
  DollarSign,
  Warehouse,
  Brain,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";
import { AtlasBrandShell } from "@/components/brand/atlas-brand";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useI18n } from "@/i18n/provider";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

  const navGroups = [
    {
      label: t("admin.nav.groups.ai"),
      items: [
        { href: "/admin/ai", label: t("admin.nav.atlasAi"), icon: Brain },
        { href: "/admin/ai/operator", label: t("admin.nav.operatorWorkspace"), icon: Brain },
        { href: "/admin/ai/brain", label: "Jarvis Brain", icon: Activity },
      ],
    },
    {
      label: t("admin.nav.groups.general"),
      items: [{ href: "/admin/dashboard", label: t("admin.nav.dashboard"), icon: LayoutDashboard }],
    },
    {
      label: t("admin.nav.groups.customers"),
      items: [
        { href: "/admin/leads", label: t("admin.nav.leads"), icon: UserPlus },
        { href: "/admin/customers", label: t("admin.nav.customers"), icon: Users },
        { href: "/admin/companies", label: t("admin.nav.companies"), icon: Building2 },
      ],
    },
    {
      label: t("admin.nav.groups.marketing"),
      items: [
        { href: "/admin/marketplaces", label: t("admin.nav.marketplaces"), icon: ShoppingBag },
        { href: "/admin/social-media", label: t("admin.nav.socialMedia"), icon: Share2 },
        { href: "/admin/advertising", label: t("admin.nav.advertising"), icon: Megaphone },
      ],
    },
    {
      label: t("admin.nav.groups.operations"),
      items: [
        { href: "/admin/workflows", label: t("admin.nav.workflows"), icon: ListChecks },
        { href: "/admin/inventory", label: t("admin.nav.inventory"), icon: Package },
        { href: "/admin/warehouse", label: t("admin.nav.warehouse"), icon: Warehouse },
        { href: "/admin/orders", label: t("admin.nav.orders"), icon: ShoppingCart },
        { href: "/admin/documents", label: t("admin.nav.documents"), icon: FileText },
        { href: "/admin/forms", label: t("admin.nav.forms"), icon: ClipboardList },
      ],
    },
    {
      label: t("admin.nav.groups.finance"),
      items: [
        { href: "/admin/finance", label: t("admin.nav.finance"), icon: DollarSign },
        { href: "/admin/billing", label: t("admin.nav.billing"), icon: FileText },
        { href: "/admin/support", label: t("admin.nav.support"), icon: LifeBuoy },
      ],
    },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b border-border/50 px-2.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <AtlasBrandShell variant="admin" compact />
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <div className="space-y-4 px-2.5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/45">
                {group.label}
              </p>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      title={item.label}
                      className={cn(
                        "relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all duration-200",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="admin-sidebar-active"
                          className="absolute inset-0 rounded-lg bg-primary"
                          transition={{
                            type: "spring",
                            bounce: 0.15,
                            duration: 0.5,
                          }}
                        />
                      )}
                      <item.icon className="relative z-10 h-4 w-4 shrink-0" />
                      <span className="relative z-10 min-w-0 flex-1 truncate">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="relative z-10 ml-auto h-3.5 w-3.5 opacity-60" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="space-y-1 border-t border-border/50 p-2.5">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">
          {t("admin.nav.footerNote")}
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2.5 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t("admin.nav.logout")}
        </Button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-40 shrink-0 border-r border-border/50 bg-background/50 backdrop-blur-sm lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile trigger + sheet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/80 backdrop-blur-xl px-4">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label={t("admin.nav.mobileOpen")}
                aria-expanded={sheetOpen}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[18rem] p-0" aria-label={t("admin.nav.mobilePanel")}>
              <SidebarContent onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
        <Separator orientation="vertical" className="mx-3 h-6" />
        <div className="min-w-0 flex-1">
          <AtlasBrandShell variant="admin" compact />
        </div>
      </div>
    </>
  );
}
