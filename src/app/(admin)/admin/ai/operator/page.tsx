import type { Metadata } from "next";
import { OperatorWorkspace } from "@/components/ai/operator-workspace";

export const metadata: Metadata = {
  title: "Atlas Operator Workspace",
  description: "Etkileşimli browser işleri için admin operator çalışma alanı",
};

export default function OperatorPage() {
  return (
    <div className="atlas-workbench-panel-strong atlas-noise min-h-[calc(100vh-3rem)] overflow-hidden rounded-[2rem] bg-[#0a0f1c] p-4 md:p-6">
      <OperatorWorkspace />
    </div>
  );
}
