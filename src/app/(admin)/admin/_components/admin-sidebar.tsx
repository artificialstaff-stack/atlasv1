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
  Globe,
  LogOut,
  Menu,
  Shield,
  ChevronRight,
  Building2,
  ShoppingBag,
  Share2,
  Megaphone,
  DollarSign,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";

const navGroups = [
  {
    label: "Genel",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Müşteri Yönetimi",
    items: [
      { href: "/admin/leads", label: "CRM & Leads", icon: UserPlus },
      { href: "/admin/customers", label: "Müşteriler", icon: Users },
      { href: "/admin/companies", label: "LLC / Şirketler", icon: Building2 },
    ],
  },
  {
    label: "Pazaryeri & Pazarlama",
    items: [
      { href: "/admin/marketplaces", label: "Pazaryerleri", icon: ShoppingBag },
      { href: "/admin/social-media", label: "Sosyal Medya", icon: Share2 },
      { href: "/admin/advertising", label: "Reklamlar", icon: Megaphone },
    ],
  },
  {
    label: "Operasyon",
    items: [
      { href: "/admin/workflows", label: "Süreçler", icon: ListChecks },
      { href: "/admin/inventory", label: "Envanter", icon: Package },
      { href: "/admin/warehouse", label: "Depo", icon: Warehouse },
      { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart },
      { href: "/admin/documents", label: "Belgeler", icon: FileText },
      { href: "/admin/forms", label: "Formlar", icon: ClipboardList },
    ],
  },
  {
    label: "Finans & Destek",
    items: [
      { href: "/admin/finance", label: "Gelir/Gider", icon: DollarSign },
      { href: "/admin/billing", label: "Faturalandırma", icon: FileText },
      { href: "/admin/support", label: "Destek", icon: LifeBuoy },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-border/50">
        <div className="relative">
          <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
          <Shield className="relative h-6 w-6 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none tracking-tight">ATLAS</span>
          <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wider uppercase">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <div className="space-y-6 px-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
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
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
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
                      <item.icon className="relative z-10 h-4 w-4" />
                      <span className="relative z-10">{item.label}</span>
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
      <div className="border-t border-border/50 p-3 space-y-0.5">
        <Link
          href="/panel/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <Globe className="h-4 w-4" />
          Müşteri Paneli
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border/50 bg-background/50 backdrop-blur-sm">
        <SidebarContent />
      </aside>

      {/* Mobile trigger + sheet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/80 backdrop-blur-xl px-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
        <Separator orientation="vertical" className="mx-3 h-6" />
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">ATLAS Admin</span>
        </div>
      </div>
    </>
  );
}
