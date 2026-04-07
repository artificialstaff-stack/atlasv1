import type { Metadata } from "next";
import { AdminSidebar } from "./_components/admin-sidebar";

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
 * Sidebar + Content (AI Copilot has its own dedicated page at /admin/ai)
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex h-screen overflow-hidden bg-[#06080f]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,124,255,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(8,196,174,0.10),transparent_24%)]" />
      <AdminSidebar />
      <main id="main-content" className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1560px] px-4 pb-8 pt-4 lg:px-6 lg:pb-10 lg:pt-6 lg:mt-0 mt-14">
          {children}
        </div>
      </main>
    </div>
  );
}
