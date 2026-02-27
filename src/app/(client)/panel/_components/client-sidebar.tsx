"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Package,
  ShoppingCart,
  FileText,
  LifeBuoy,
  Globe,
  LogOut,
  Menu,
  BarChart3,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { NotificationBell } from "@/components/shared/notification-bell";

const clientNavItems = [
  { href: "/panel/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/panel/process", label: "Süreç Takibi", icon: ListChecks },
  { href: "/panel/products", label: "Ürünlerim", icon: Package },
  { href: "/panel/orders", label: "Siparişlerim", icon: ShoppingCart },
  { href: "/panel/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/panel/documents", label: "Belgelerim", icon: FileText },
  { href: "/panel/settings", label: "Ayarlar", icon: UserCog },
  { href: "/panel/support", label: "Destek", icon: LifeBuoy },
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
    <div className="flex h-full flex-col bg-card/50 backdrop-blur-sm">
      {/* Logo + Notifications */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">ATLAS</span>
        </div>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {clientNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/15"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  />
                )}
                <item.icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border/50 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}

export function ClientSidebar() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border/50 bg-background">
        <SidebarContent />
      </aside>

      {/* Mobile trigger + sheet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
        <Separator orientation="vertical" className="mx-3 h-6" />
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">ATLAS</span>
        </div>
      </div>
    </>
  );
}
