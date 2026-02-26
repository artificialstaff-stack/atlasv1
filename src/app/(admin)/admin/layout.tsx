import { AdminSidebar } from "./_components/admin-sidebar";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { CopilotActions } from "@/components/ai/copilot-actions";

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
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 pt-6 lg:p-8 lg:pt-8 mt-14 lg:mt-0">
          {children}
        </div>
      </main>
      <CopilotActions />
      <AIChatPanel />
    </div>
  );
}
