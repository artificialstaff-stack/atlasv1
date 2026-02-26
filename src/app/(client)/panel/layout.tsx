import { ClientSidebar } from "./_components/client-sidebar";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { CopilotActions } from "@/components/ai/copilot-actions";

/**
 * Client Layout — Salt okunur müşteri paneli
 * Sidebar + Content with glass header effect + AI Chat
 */
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 pt-6 lg:p-8 lg:pt-8 mt-14 lg:mt-0 max-w-7xl">
          {children}
        </div>
      </main>
      <CopilotActions />
      <AIChatPanel />
    </div>
  );
}
