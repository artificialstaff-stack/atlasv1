/**
 * Jarvis Agent Tools — Chat → Sweep → Fix conversation loop
 *
 * These tools let the ReAct agent interact with the Jarvis observer system:
 *   - get_jarvis_status:     Read current findings, proposals, brief
 *   - trigger_jarvis_sweep:  Start a route/modal/full sweep from chat
 *   - prepare_jarvis_fix:    Create an autofix branch for a finding
 */
import type { AgentTool } from "@/lib/ai/autonomous/react-engine";
import {
  getJarvisDashboard,
  isJarvisObservationRunning,
  launchJarvisObservation,
  getAtlasJourneyRoutes,
  type AtlasObservationFinding,
} from "@/lib/jarvis";
import { getJarvisRoutingInfo } from "@/lib/ai/client";

function formatSeverityLine(f: AtlasObservationFinding, i: number) {
  return `${i + 1}. [${f.severity.toUpperCase()}] ${f.title}\n   Route: ${f.route} · ${f.kind}\n   ${f.summary}\n   Öneri: ${f.suggestedFix}`;
}

async function loadDashboard() {
  const routing = getJarvisRoutingInfo();
  return getJarvisDashboard({
    lane: routing.provider,
    model: routing.model,
    fallback: routing.fallbackModel,
    hqttEnabled: routing.hqttEnabled,
  });
}

// ─── Tool 1: get_jarvis_status ──────────────────────────────────────────────
export const getJarvisStatusTool: AgentTool = {
  name: "get_jarvis_status",
  description:
    "Atlas Jarvis observer sisteminin güncel durumunu oku: açık bulgular (P0/P1/P2), autofix önerileri, son sweep özeti ve sabah briefing. Kullanıcı 'jarvis', 'bulgu', 'eksik', 'sweep', 'öneri', 'tarama sonucu' gibi kelimeler kullandığında bu aracı çağır.",
  parameters: [
    {
      name: "focus",
      type: "string",
      description:
        "Odak alanı: 'all' (tüm bulgular), 'p0' (sadece kritik), 'proposals' (fix önerileri), 'brief' (sabah özeti). Varsayılan: 'all'.",
      required: false,
    },
  ],
  execute: async (params) => {
    try {
      const dashboard = await loadDashboard();
      const focus = (params.focus as string) || "all";
      const open = dashboard.activeFindings;
      const p0 = open.filter((f) => f.severity === "p0");
      const p1 = open.filter((f) => f.severity === "p1");
      const p2 = open.filter((f) => f.severity === "p2");
      const lastRun = dashboard.recentRuns[0];
      const isRunning = lastRun?.status === "running";

      const sections: string[] = [];

      // Header
      sections.push(
        `Jarvis Durum Raporu\n` +
          `Toplam açık bulgu: ${open.length} (${p0.length} P0, ${p1.length} P1, ${p2.length} P2)\n` +
          `Hazır fix önerisi: ${dashboard.proposals.length}\n` +
          `Taranan yüzey: ${dashboard.surfaces.length} surface, ${getAtlasJourneyRoutes().length} route\n` +
          `Son sweep: ${lastRun ? `${lastRun.status} (${lastRun.source}, ${lastRun.journeys.length} route)` : "henüz yok"}\n` +
          `Aktif sweep: ${isRunning ? "Evet — devam ediyor" : "Hayır"}`,
      );

      // Brief
      if (dashboard.latestBrief && (focus === "all" || focus === "brief")) {
        sections.push(
          `Sabah Briefing:\n${dashboard.latestBrief.headline}\n${dashboard.latestBrief.summary}`,
        );
      }

      // Findings
      if (focus === "all" || focus === "p0") {
        const target = focus === "p0" ? p0 : open;
        const topN = target.slice(0, 8);
        if (topN.length > 0) {
          sections.push(
            `En kritik bulgular:\n${topN.map(formatSeverityLine).join("\n\n")}`,
          );
        } else {
          sections.push("Açık bulgu bulunmuyor.");
        }
      }

      // Proposals
      if (focus === "all" || focus === "proposals") {
        const activeProposals = dashboard.proposals.filter(
          (p) => p.status === "draft" || p.status === "prepared",
        );
        if (activeProposals.length > 0) {
          sections.push(
            `Fix önerileri:\n${activeProposals
              .slice(0, 5)
              .map(
                (p, i) =>
                  `${i + 1}. ${p.summary}\n   Risk: ${p.riskLevel} · Durum: ${p.status} · Branch: ${p.branchName}`,
              )
              .join("\n\n")}`,
          );
        }
      }

      const text = sections.join("\n\n---\n\n");
      return { success: true, data: { findingCount: open.length, p0: p0.length, p1: p1.length, p2: p2.length }, summary: text };
    } catch (err) {
      return { success: false, data: null, summary: `Jarvis durumu okunamadı: ${String(err)}`, error: String(err) };
    }
  },
};

// ─── Tool 2: trigger_jarvis_sweep ───────────────────────────────────────────
export const triggerJarvisSweepTool: AgentTool = {
  name: "trigger_jarvis_sweep",
  description:
    "Jarvis observer sweep başlat: tüm Atlas yüzeylerini (route + modal) Playwright ile tara. Kullanıcı 'tara', 'sweep', 'kontrol et', 'yeniden tara', 'tam tarama' gibi komutlar verdiğinde bu aracı çağır.",
  parameters: [
    {
      name: "scope",
      type: "string",
      description: "'full' (tüm route + modal), 'quick' (sadece P0 rotaları). Varsayılan: 'full'.",
      required: false,
    },
  ],
  execute: async () => {
    try {
      if (isJarvisObservationRunning()) {
        const dashboard = await loadDashboard();
        const activeRun = dashboard.recentRuns.find((r) => r.status === "running");
        return {
          success: true,
          data: { alreadyRunning: true },
          summary: `Jarvis zaten bir sweep çalıştırıyor (${activeRun?.journeys.length ?? "?"} route). Tamamlanınca bulgular otomatik güncellenecek.`,
        };
      }

      await launchJarvisObservation("manual");
      return {
        success: true,
        data: { started: true },
        summary:
          "Jarvis sweep başlatıldı. Tüm Atlas yüzeyleri (route + modal) taranıyor. " +
          "Bulgular tamamlandıkça dashboard'a yansıyacak. Tarama bitince sonuçları sorabilirsin.",
      };
    } catch (err) {
      return { success: false, data: null, summary: `Sweep başlatılamadı: ${String(err)}`, error: String(err) };
    }
  },
};

// ─── Tool 3: prepare_jarvis_fix ─────────────────────────────────────────────
export const prepareJarvisFixTool: AgentTool = {
  name: "prepare_jarvis_fix",
  description:
    "Jarvis bulgusu için autofix branch hazırla. Kullanıcı 'düzelt', 'fix', 'branch hazırla', 'çöz' gibi komutlar verdiğinde bu aracı çağır. Bulgu ID'si yoksa önce get_jarvis_status ile bulguları listele.",
  parameters: [
    {
      name: "finding_id",
      type: "string",
      description: "Düzeltilecek bulgunun ID'si. get_jarvis_status çıktısından alınabilir.",
      required: true,
    },
  ],
  execute: async (params) => {
    try {
      const findingId = params.finding_id as string;
      if (!findingId) {
        return {
          success: false,
          data: null,
          summary: "Bulgu ID'si gerekli. Önce get_jarvis_status ile açık bulguları listele ve bir ID seç.",
        };
      }

      const dashboard = await loadDashboard();
      const finding = dashboard.activeFindings.find((f) => f.id === findingId);
      if (!finding) {
        const top3 = dashboard.activeFindings.slice(0, 3);
        return {
          success: false,
          data: null,
          summary:
            `"${findingId}" ID'li bulgu bulunamadı. Mevcut açık bulgular:\n` +
            top3.map((f, i) => `${i + 1}. ${f.id} — ${f.title} [${f.severity.toUpperCase()}]`).join("\n"),
        };
      }

      // Check existing proposal
      const existingProposal = dashboard.proposals.find((p) => p.findingId === findingId);
      if (existingProposal && (existingProposal.status === "prepared" || existingProposal.status === "verified")) {
        return {
          success: true,
          data: { proposalId: existingProposal.id, branch: existingProposal.branchName },
          summary:
            `Bu bulgu için zaten branch hazır:\n` +
            `Branch: ${existingProposal.branchName}\n` +
            `Durum: ${existingProposal.status}\n` +
            `Özet: ${existingProposal.summary}`,
        };
      }

      const { prepareJarvisAutofixProposal } = await import("@/lib/jarvis/autofix");
      const proposal = await prepareJarvisAutofixProposal(findingId);
      return {
        success: true,
        data: { proposalId: proposal.id, branch: proposal.branchName },
        summary:
          `Autofix branch hazırlandı:\n` +
          `Bulgu: ${finding.title} [${finding.severity.toUpperCase()}]\n` +
          `Branch: ${proposal.branchName}\n` +
          `Risk: ${proposal.riskLevel}\n` +
          `Özet: ${proposal.summary}\n` +
          `Hedef dosyalar: ${proposal.targetFiles.join(", ")}`,
      };
    } catch (err) {
      return { success: false, data: null, summary: `Fix hazırlanamadı: ${String(err)}`, error: String(err) };
    }
  },
};

/** All Jarvis-specific agent tools */
export function getJarvisAgentTools(): AgentTool[] {
  return [getJarvisStatusTool, triggerJarvisSweepTool, prepareJarvisFixTool];
}
