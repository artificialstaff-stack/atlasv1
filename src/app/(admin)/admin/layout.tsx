import type { Metadata } from "next";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";

export const metadata: Metadata = {
  title: {
    default: "Yönetim Paneli",
    template: "%s | ATLAS Admin",
  },
  description: "Atlas Platform yönetim paneli",
};

/**
 * Admin Layout — Yönetim Paneli
 * RBAC kontrolü middleware tarafında yapılır
 * Sidebar + Content + AI Chat Panel
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex h-screen overflow-hidden bg-background/95">
      <AdminSidebar />
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 pt-6 lg:p-8 lg:pt-8 mt-14 lg:mt-0">
          {children}
        </div>
      </main>
      <AIChatPanel />
    </div>
  );
}
