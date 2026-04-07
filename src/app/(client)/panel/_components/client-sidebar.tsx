"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  Boxes,
  CircleDollarSign,
  FileText,
  Globe,
  LifeBuoy,
  Lock,
  LogOut,
  Menu,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Rocket,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserCog,
  Warehouse,
  Workflow,
} from "lucide-react";
import { motion } from "framer-motion";

import { AtlasBrandShell } from "@/components/brand/atlas-brand";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { NotificationBell } from "@/components/shared/notification-bell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCustomerSidebarModules } from "@/lib/customer-workspace/blueprint";
import { createClient } from "@/lib/supabase/client";
import type { CustomerModuleAccess, CustomerModuleKey } from "@/lib/customer-workspace/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

type SidebarItem = CustomerModuleAccess & {
  icon: typeof Globe;
  compactLabel: string;
};

type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

function getSidebarIcon(key: CustomerModuleKey) {
  switch (key) {
    case "dashboard":
      return BarChart3;
    case "process":
      return Workflow;
    case "services":
      return Rocket;
    case "companies":
      return Building2;
    case "store":
      return Store;
    case "marketplaces":
      return ShoppingBag;
    case "products":
      return Boxes;
    case "warehouse":
      return Warehouse;
    case "social":
      return Globe;
    case "finance":
      return CircleDollarSign;
    case "documents":
      return FileText;
    case "billing":
      return Receipt;
    case "support":
      return LifeBuoy;
    case "orders":
      return ShoppingCart;
    case "reports":
      return BarChart3;
    case "advertising":
      return Megaphone;
    case "settings":
      return UserCog;
    default:
      return Globe;
  }
}

function SidebarContent({
  modules,
  onNavigate,
  collapsed,
  onToggleCollapse,
}: {
  modules: CustomerModuleAccess[];
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useI18n();
  const isCollapsed = Boolean(collapsed && !onNavigate);

  const navGroups = useMemo<SidebarGroup[]>(
    () =>
      getCustomerSidebarModules(locale, modules)
        .map((group) => ({
          label: group.label,
          items: group.items
          .map((item) => ({
            ...item,
            icon: getSidebarIcon(item.key),
          })),
        }))
        .filter((group) => group.items.length > 0),
    [locale, modules],
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(7,10,18,0.98),rgba(5,8,14,0.96))]">
        <div className={cn("border-b border-white/6 p-2.5", isCollapsed && "px-2 py-2.5")}>
          <div className="rounded-[1.35rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(79,140,255,0.14),transparent_34%),linear-gradient(180deg,rgba(14,19,33,0.98),rgba(9,13,24,0.96))] p-2.5 shadow-[0_24px_54px_rgba(2,6,23,0.34)]">
            {onToggleCollapse ? (
              <div className={cn("mb-2 flex", isCollapsed ? "justify-center" : "justify-end")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border border-white/8 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      onClick={onToggleCollapse}
                      aria-label={isCollapsed ? "Sidebar genislet" : "Sidebar daralt"}
                    >
                      {isCollapsed ? (
                        <PanelLeftOpen className="h-4 w-4" />
                      ) : (
                        <PanelLeftClose className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {isCollapsed ? "Sidebar genislet" : "Sidebar daralt"}
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : null}

            <AtlasBrandShell
              variant="portal"
              compact
              className={cn(
                "rounded-none border-transparent bg-transparent px-0 py-0 shadow-none hover:bg-transparent [&_p:last-child]:truncate [&_p:last-child]:text-[10px] [&_p:last-child]:leading-5 [&_p:nth-of-type(1)]:tracking-[0.24em] [&_span]:tracking-[0.1em]",
                isCollapsed && "justify-center [&_p]:hidden [&_span]:hidden",
              )}
            />

            <div
              className={cn(
                "mt-2.5 border-t border-white/6 pt-2",
                isCollapsed
                  ? "flex flex-col items-center gap-2"
                  : "flex items-center justify-between gap-2",
              )}
            >
              <div className={cn("scale-[0.96]", isCollapsed ? "origin-center" : "origin-left")}>
                <LanguageSwitcher />
              </div>
              <div className={cn("scale-[0.96]", isCollapsed ? "origin-center" : "origin-right")}>
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 py-2.5">
          <div className={cn("space-y-4", isCollapsed ? "px-2" : "px-2.5")}>
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className={cn("mb-2 flex items-center gap-2 px-1.5", isCollapsed && "justify-center px-0")}>
                {isCollapsed ? (
                  <div className="h-px w-full bg-white/6" aria-hidden="true" />
                ) : (
                  <>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500/88">
                      {group.label}
                    </p>
                    <div className="h-px flex-1 bg-white/6" />
                  </>
                )}
              </div>
              <nav
                className="space-y-1"
                role="navigation"
                aria-label={group.label}
              >
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const isLocked = item.visibility === "locked";

                  const surfaceClass = isActive
                    ? isLocked
                      ? "border-amber-300/26 bg-amber-500/12 text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.08)]"
                      : "border-primary/24 bg-primary/12 text-primary-foreground shadow-[inset_0_0_0_1px_rgba(79,140,255,0.08)]"
                    : isLocked
                      ? "border-amber-300/14 bg-amber-500/[0.05] text-amber-100/90 hover:border-amber-300/20 hover:bg-amber-500/[0.08]"
                      : "border-transparent text-slate-300/90 hover:border-white/8 hover:bg-white/[0.045] hover:text-white";

                  const iconShellClass = isLocked
                    ? "border-amber-300/20 bg-amber-500/10 text-amber-200"
                    : isActive
                      ? "border-primary/22 bg-primary/14 text-primary"
                      : "border-white/8 bg-white/[0.03] text-slate-300";

                  const link = (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      title={item.reason ?? item.label}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-[37px] items-center gap-2.5 overflow-hidden rounded-[1rem] border px-2.5 py-2 text-[11px] font-medium transition-all duration-200",
                        isCollapsed && "justify-center px-2",
                        surfaceClass,
                      )}
                    >
                      {isActive ? (
                        <motion.div
                          layoutId="client-sidebar-active"
                          className={cn(
                            "absolute inset-0 rounded-[1rem]",
                            isLocked
                              ? "bg-[linear-gradient(90deg,rgba(251,191,36,0.14),rgba(251,191,36,0.04))]"
                              : "bg-[linear-gradient(90deg,rgba(79,140,255,0.16),rgba(79,140,255,0.05))]",
                          )}
                          transition={{ type: "spring", stiffness: 360, damping: 30 }}
                        />
                      ) : null}
                      <span
                        className={cn(
                          "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.85rem] border transition-colors duration-200",
                          iconShellClass,
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                      </span>
                      {!isCollapsed ? (
                        <span className="relative z-10 min-w-0 flex-1 truncate text-[11px] leading-none">
                          {item.compactLabel}
                        </span>
                      ) : null}
                      {!isCollapsed && isLocked ? (
                        <span className="relative z-10 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-500/12 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                      ) : null}
                    </Link>
                  );

                  return isCollapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </nav>
            </div>
          ))}
          </div>
        </ScrollArea>

        <div className="border-t border-white/6 p-2.5">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-[1rem] border border-white/8 bg-white/[0.025] text-slate-300 transition-colors hover:border-red-400/18 hover:bg-red-500/[0.05] hover:text-red-100"
                  onClick={handleLogout}
                  aria-label={t("portal.nav.logout")}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {t("portal.nav.logout")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 rounded-[1rem] border border-white/8 bg-white/[0.025] px-2.5 text-[11px] text-slate-300 transition-colors hover:border-red-400/18 hover:bg-red-500/[0.05] hover:text-red-100"
              onClick={handleLogout}
              title={t("portal.nav.logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="truncate font-medium">{t("portal.nav.logout")}</span>
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function ClientSidebar({ modules }: { modules: CustomerModuleAccess[] }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-white/6 bg-background/55 backdrop-blur-sm transition-[width] duration-200 lg:flex",
          collapsed ? "w-[60px]" : "w-[180px]",
        )}
      >
        <SidebarContent
          modules={modules}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </aside>

      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Panel menusu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[286px] p-0">
            <SidebarContent modules={modules} onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
        <Separator orientation="vertical" className="mx-3 h-6" />
        <div className="min-w-0 flex-1">
          <AtlasBrandShell variant="portal" compact className="[&_p:last-child]:hidden" />
        </div>
      </div>
    </>
  );
}
