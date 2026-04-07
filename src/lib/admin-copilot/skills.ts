import { listDynamicCopilotSkills, saveDynamicCopilotSkill } from "./resource-store";
import type { CopilotProjectContext, CopilotScope, CopilotSkillResource } from "./types";

const BUILT_IN_SKILLS: CopilotSkillResource[] = [
  {
    id: "customer-intake-review",
    name: "Customer Intake Review",
    domain: "customer",
    description: "Yeni form, onboarding ve eksik bilgi taleplerini admin tarafında net aksiyonlarla özetler.",
    starter: "Bekleyen intake'leri önceliğe göre sırala.",
    instructions:
      "Müşteri intake, form ve onboarding isteklerinde önce en kritik açıkları, sonra müşteriye görünür sonraki adımı açıkla.",
    toolHints: ["query_database", "get_user_360", "list_user_notifications"],
  },
  {
    id: "marketplace-launch-readiness",
    name: "Marketplace Launch Readiness",
    domain: "catalog",
    description: "Marketplace paketleri, mağaza aktivasyonu ve launch readiness durumunu değerlendirir.",
    starter: "Marketplace launch readiness özetini çıkar.",
    instructions:
      "Pazaryeri, mağaza ve launch isteklerinde önce aktivasyon durumu, sonra eksik operasyon blokajlarını listele.",
    toolHints: ["query_database", "list_marketplace_accounts", "list_orders"],
  },
  {
    id: "finance-risk-brief",
    name: "Finance Risk Brief",
    domain: "finance",
    description: "Tahsilat, faturalandırma ve finansal riskleri özetler.",
    starter: "Tahsilat riski olan müşterileri özetle.",
    instructions:
      "Finans isteklerinde riskli müşterileri, bekleyen faturaları ve kısa aksiyon önerilerini önceliklendir.",
    toolHints: ["query_database", "count_records", "get_financial_summary"],
  },
  {
    id: "operations-queue-brief",
    name: "Operations Queue Brief",
    domain: "operations",
    description: "Açık görev, form ve süreç kuyruğunu öncelik sırasıyla özetler.",
    starter: "Bugün öncelikli operasyon işlerini sırala.",
    instructions:
      "Operasyon isteklerinde açık süreç görevlerini, onay bekleyen formları ve blokajları kısa queue formatında ver.",
    toolHints: ["query_database", "get_open_tickets", "get_table_row_counts"],
  },
  {
    id: "frontier-benchmark-audit",
    name: "Frontier Benchmark Audit",
    domain: "research",
    description: "Benchmark geçmişini, zayıf alanları ve frontier parity risklerini özetler.",
    starter: "AtlasOps benchmark geçmişini özetle.",
    instructions:
      "Benchmark isteklerinde en yeni suite sonuçlarını, pass rate düşüşlerini ve en zayıf alanları raporla.",
    toolHints: ["query_database", "get_table_row_counts"],
  },
  {
    id: "lead-research",
    name: "Lead Research",
    domain: "research",
    description: "Web araştırması, lead listesi ve kaynak özetlerini üretir.",
    starter: "Türkiye'den 10 üretici toptancı mail indexi topla ve kaynaklarını ver.",
    instructions:
      "Araştırma isteklerinde web search, fetch ve crawl araçlarını kullan; doğrulanamayan bilgiyi açıkça belirt.",
    toolHints: ["web_search", "fetch_webpage", "crawl_markdown"],
  },
];

export function getBuiltInCopilotSkills() {
  return BUILT_IN_SKILLS;
}

function mergeSkills(baseSkills: CopilotSkillResource[], dynamicSkills: CopilotSkillResource[]) {
  const byId = new Map<string, CopilotSkillResource>();

  for (const skill of baseSkills) {
    byId.set(skill.id, skill);
  }

  for (const skill of dynamicSkills) {
    byId.set(skill.id, skill);
  }

  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name, "tr"));
}

export async function getCopilotSkills() {
  const dynamicSkills = await listDynamicCopilotSkills();
  return mergeSkills(BUILT_IN_SKILLS, dynamicSkills);
}

export async function getCopilotSkillsByIds(skillIds: string[] | null | undefined) {
  if (!skillIds || skillIds.length === 0) {
    return [];
  }

  const wanted = new Set(skillIds);
  const skills = await getCopilotSkills();
  return skills.filter((skill) => wanted.has(skill.id));
}

function normalizeSkillCommandText(commandText: string | null | undefined) {
  return (commandText ?? "").toLowerCase();
}

function inferSkillIds(commandText: string | null | undefined, scope?: CopilotScope) {
  const normalized = normalizeSkillCommandText(commandText);
  const inferred = new Set<string>();

  if (scope?.type === "customer") {
    inferred.add("customer-intake-review");
  }

  if (/(form|submission|onboarding|eksik|bekliyor|bekleyen|musteri|müşteri|evrak|belge|llc|sirket|şirket)/i.test(normalized)) {
    inferred.add("customer-intake-review");
  }

  if (/(amazon|walmart|ebay|etsy|shopify|pazaryeri|marketplace|launch|magaza|mağaza)/i.test(normalized)) {
    inferred.add("marketplace-launch-readiness");
  }

  if (/(fatura|invoice|finans|tahsilat|odeme|ödeme|borc|borç|risk)/i.test(normalized)) {
    inferred.add("finance-risk-brief");
  }

  if (/(benchmark|frontier|atlasops|gaia|webarena|workarena|tau|degerlendirme|değerlendirme)/i.test(normalized)) {
    inferred.add("frontier-benchmark-audit");
  }

  if (/(arastirma|araştırma|lead|mail|email|kaynak|uretici|üretici|tedarikci|tedarikçi|topla|listele|web search|web)/i.test(normalized)) {
    inferred.add("lead-research");
  }

  if (/(approval|gorev|görev|queue|surec|süreç|oncelik|öncelik|operasyon)/i.test(normalized)) {
    inferred.add("operations-queue-brief");
  }

  return Array.from(inferred);
}

export async function selectCopilotSkills(input: {
  skillIds?: string[] | null;
  project?: CopilotProjectContext | null;
  scope?: CopilotScope;
  commandText?: string | null;
}) {
  const explicitSkills = await getCopilotSkillsByIds(input.skillIds);
  if (explicitSkills.length > 0) {
    return explicitSkills;
  }

  const inferredSkillIds = inferSkillIds(input.commandText, input.scope);
  if (inferredSkillIds.length > 0) {
    return getCopilotSkillsByIds(inferredSkillIds);
  }

  if (input.project?.defaultSkillIds?.length) {
    return getCopilotSkillsByIds(input.project.defaultSkillIds);
  }

  return [];
}

export async function upsertCopilotSkill(skill: CopilotSkillResource) {
  return saveDynamicCopilotSkill(skill);
}
