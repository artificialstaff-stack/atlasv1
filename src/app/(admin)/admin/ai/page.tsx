import type { Metadata } from "next";
import { AtlasCopilot } from "@/components/ai/atlas-copilot";

export const metadata: Metadata = {
  title: "Atlas AI Copilot",
  description:
    "Agentic AI asistan — tüm departmanları analiz eder, aksiyon yürütür, rapor üretir",
};

/**
 * AI Copilot — Full-page dedicated AI experience
 * Uses fixed positioning to escape the container wrapper from admin layout
 * Sidebar is still visible (lg:left-64); on mobile it takes full screen
 */
export default function AIPage() {
  return (
    <div className="fixed inset-0 z-40 lg:left-64 bg-[#0a0e1a]">
      <AtlasCopilot />
    </div>
  );
}
