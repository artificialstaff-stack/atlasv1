import type { Metadata } from "next";
import { JarvisBrainDashboard } from "@/components/ai/jarvis-brain-dashboard";

export const metadata: Metadata = {
  title: "Jarvis Brain",
  description: "Jarvis Living Brain — self-report, gap report, background loop, and HQTT physiology dashboard",
};

export default function JarvisBrainPage() {
  return (
    <div className="atlas-workbench-panel-strong atlas-noise min-h-[calc(100vh-3rem)] overflow-hidden rounded-[2rem] bg-[#0a0f1c] p-6">
      <JarvisBrainDashboard />
    </div>
  );
}
