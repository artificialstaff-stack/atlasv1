"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function PendingInvoiceActions({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"confirm" | "cancel" | null>(null);

  async function run(action: "confirm" | "cancel") {
    setSubmitting(action);
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/${action === "confirm" ? "confirm" : "cancel"}`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Fatura aksiyonu tamamlanamadi.");
      }

      toast.success(action === "confirm" ? "Odeme onaylandi" : "Fatura iptal edildi");
      router.refresh();
    } catch (error) {
      toast.error(action === "confirm" ? "Odeme onayi basarisiz" : "Fatura iptali basarisiz", {
        description: error instanceof Error ? error.message : "Beklenmeyen hata",
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting !== null}
        onClick={() => void run("confirm")}
      >
        {submitting === "confirm" ? "Onaylanıyor..." : "✓ Onayla"}
      </button>
      <button
        type="button"
        className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting !== null}
        onClick={() => void run("cancel")}
      >
        {submitting === "cancel" ? "İptal ediliyor..." : "✕ Reddet"}
      </button>
    </div>
  );
}
