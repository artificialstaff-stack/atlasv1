import type { Metadata } from "next";
import { AtlasCopilot } from "@/components/ai/atlas-copilot";

export const metadata: Metadata = {
  title: "Atlas AI",
  description:
    "Kalici Atlas sohbeti; baglami, araclari ve operator akisini kendi yoneten agentic AI workspace",
};

/**
 * AI Copilot — Full-page dedicated AI experience
 * Uses fixed positioning to escape the container wrapper from admin layout
 * Sidebar is still visible (lg:left-64); on mobile it takes full screen
 */
export default function AIPage() {
  return (
    <div className="atlas-workbench-panel-strong atlas-noise min-h-[calc(100vh-3rem)] overflow-hidden rounded-[2rem] bg-[#0a0f1c]">
      <AtlasCopilot />
    </div>
  );
}
