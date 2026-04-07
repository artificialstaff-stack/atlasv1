import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCustomerWorkspaceView } from "@/lib/customer-workspace";
import { ClientSidebar } from "./_components/client-sidebar";
import { ClientGuidanceProvider } from "./_components/client-guidance-provider";
import { PortalAssistantDock } from "@/components/ai/portal-assistant-dock";

export const metadata: Metadata = {
  title: {
    default: "Müşteri Paneli",
    template: "%s | ATLAS Panel",
  },
  description: "Atlas Platform müşteri paneli",
};

/**
 * Client Layout — Salt okunur müşteri paneli
 * Sidebar + Content with glass header effect + AI Chat
 */
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const workspace = user ? await getCustomerWorkspaceView(user.id) : null;

  return (
    <div className="portal-shell relative min-h-screen overflow-hidden bg-background">
      <div className="portal-canvas" />
      <div className="portal-ambient-orb left-[10%] top-[10%] h-56 w-56 bg-primary/30" />
      <div className="portal-ambient-orb bottom-[18%] right-[8%] h-64 w-64 bg-cyan-400/25" />

      <div className="relative z-10 flex h-screen overflow-hidden">
        <ClientSidebar modules={workspace?.moduleAccess ?? []} />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="container mx-auto mt-14 max-w-7xl p-5 pb-10 lg:mt-0 lg:p-8 lg:pb-12">
            <ClientGuidanceProvider>{children}</ClientGuidanceProvider>
          </div>
        </main>
        <PortalAssistantDock />
      </div>
    </div>
  );
}
