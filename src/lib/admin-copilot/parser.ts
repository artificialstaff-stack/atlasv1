import type { CommandParseResult, CopilotScope } from "./types";

function extractField(input: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(input);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function normalizePlatform(input: string): string | undefined {
  const lower = input.toLowerCase();
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("ebay")) return "ebay";
  if (lower.includes("walmart")) return "walmart";
  if (lower.includes("etsy")) return "etsy";
  if (lower.includes("shopify")) return "shopify";
  if (lower.includes("tiktok")) return "tiktok_shop";
  return undefined;
}

function normalizePlan(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("professional")) return "professional";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("starter")) return "starter";
  return "starter";
}

function isReadOnlyQuery(input: string) {
  return /(ne durumda|durumda|durumu|var mı|hangi adım|hangi aşama|hangi durumda|oku|okur musun|göster|listele|özetle|kaç|son |incele|kontrol et|read|show|list|summary|status)/i.test(input);
}

function hasCreateVerb(input: string) {
  return /(ekle|oluştur|ac|aç|kur|başlat|taslak|draft|create|launch|başvuru yap|hesap aç)/i.test(input);
}

function isReadOnlyExplorationCommand(input: string) {
  return (
    /(schema|şema|veritaban|veri tabanı|database|\bdb\b|tablo|tabloda|tablosu|table|tables|kolon|sütun|column|columns|satır|row|rows)/i.test(input) &&
    /(oku|okur musun|göster|listele|özetle|kaç|incele|kontrol et|ara|search|show|list|summary|read|find)/i.test(input)
  );
}

function isTooVagueConversationalTurn(input: string) {
  const tokens = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@._-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return true;
  }

  const genericTokens = new Set([
    "ne",
    "nedir",
    "kim",
    "hangi",
    "kaç",
    "var",
    "mı",
    "mi",
    "mu",
    "mü",
    "göster",
    "goster",
    "listele",
    "özetle",
    "ozetle",
    "oku",
    "bak",
    "kontrol",
    "et",
    "durum",
    "durumu",
    "durumda",
    "hangisi",
    "olan",
    "olanlar",
  ]);

  const specificTokens = tokens.filter((token) => !genericTokens.has(token));
  return specificTokens.length === 0;
}

function isLikelyFollowUpTurn(input: string) {
  return /(?:^|\s)(devam et|peki|tamam|sonra|detay ver|daha detay|daha kisa|daha kısa|hangisi|ilkini|ikincisini|onu|bunu|bunlari|bunları|gonder|gönder|paylas|paylaş|portala gonder|portala gönder|musteriye gonder|müşteriye gönder|neden|niye)(?:\s|$)/i.test(input.trim());
}

function extractEmail(input: string): string | undefined {
  return extractField(input, [/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i]);
}

function extractName(input: string): { firstName?: string; lastName?: string } {
  const fullName =
    extractField(input, [
      /(?:ad\s*soyad|isim|name)\s*[:=]\s*([^,\n;]+)/i,
      /müşteri\s*(?:adı)?\s*[:=]\s*([^,\n;]+)/i,
    ]) ??
    extractField(input, [/create customer\s+([^,\n;]+)/i]);

  if (!fullName) return {};

  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "Müşteri",
  };
}

function extractCompanyName(input: string): string | undefined {
  return extractField(input, [
    /(?:şirket|firma|company)\s*(?:adı)?\s*[:=]\s*([^,\n;]+)/i,
    /llc\s*(?:adı)?\s*[:=]\s*([^,\n;]+)/i,
    /store\s*(?:name)?\s*[:=]\s*([^,\n;]+)/i,
  ]);
}

function extractCustomerRef(input: string, scope: CopilotScope): string | undefined {
  if (scope.type === "customer" && scope.refId) {
    return scope.refId;
  }
  return extractField(input, [
    /customer[_\s-]?id\s*[:=]\s*([a-f0-9-]{8,})/i,
    /müşteri\s*(?:id)?\s*[:=]\s*([a-f0-9-]{8,})/i,
    /user[_\s-]?id\s*[:=]\s*([a-f0-9-]{8,})/i,
  ]);
}

function parseCreateCustomer(input: string): CommandParseResult {
  const email = extractEmail(input);
  const name = extractName(input);
  const companyName = extractCompanyName(input);
  const phone = extractField(input, [/(?:telefon|phone)\s*[:=]\s*([^,\n;]+)/i]);
  const planTier = normalizePlan(input);
  const stateOfFormation =
    extractField(input, [/(?:eyalet|state)\s*[:=]\s*([^,\n;]+)/i]) ?? "Wyoming";

  const missingFields = [
    !email ? "email" : null,
    !name.firstName ? "firstName" : null,
    !name.lastName ? "lastName" : null,
    !companyName ? "companyName" : null,
  ].filter(Boolean) as string[];

  return {
    intent: "customer.create_account",
    input: {
      email,
      firstName: name.firstName,
      lastName: name.lastName,
      companyName,
      phone,
      planTier,
      autoCreateCompany: true,
      stateOfFormation,
    },
    missingFields,
    summary: missingFields.length === 0
      ? `${email} için yeni müşteri hesabı provisioning akışı hazırlanacak.`
      : "Yeni müşteri oluşturmak için ad, soyad, şirket adı ve e-posta gerekli.",
  };
}

function parseCreateCompany(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  const companyName = extractCompanyName(input) ?? extractField(input, [/(?:llc|şirket)\s*(?:ekle|oluştur)\s*([^,\n;]+)/i]);
  const stateOfFormation =
    extractField(input, [/(?:eyalet|state)\s*[:=]\s*([^,\n;]+)/i]) ?? "Wyoming";

  const missingFields = [
    !userId ? "userId" : null,
    !companyName ? "companyName" : null,
  ].filter(Boolean) as string[];

  return {
    intent: "company.create_llc",
    input: {
      userId,
      companyName: companyName ?? "Yeni LLC",
      companyType: "llc",
      stateOfFormation,
      status: "pending",
    },
    missingFields,
    summary: missingFields.length === 0
      ? "Müşteri için LLC kaydı oluşturulacak."
      : "LLC oluşturmak için müşteri scope’u ve şirket adı gerekli.",
  };
}

function parseCreateMarketplace(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  const platform = normalizePlatform(input);
  const storeName =
    extractField(input, [/(?:mağaza|store)\s*(?:adı|name)?\s*[:=]\s*([^,\n;]+)/i]) ??
    extractCompanyName(input);
  const storeUrl = extractField(input, [/(https?:\/\/[^\s,;]+)/i]);
  const sellerId = extractField(input, [/(?:seller\s*id|merchant id)\s*[:=]\s*([^,\n;]+)/i]);

  const missingFields = [
    !userId ? "userId" : null,
    !platform ? "platform" : null,
    !storeName ? "storeName" : null,
  ].filter(Boolean) as string[];

  return {
    intent: "marketplace.create_account",
    input: {
      userId,
      platform,
      storeName,
      storeUrl,
      sellerId,
      status: "pending_setup",
    },
    missingFields,
    summary: missingFields.length === 0
      ? `${platform} pazaryeri hesabı için taslak oluşturulacak.`
      : "Pazaryeri eklemek için müşteri, platform ve mağaza adı gerekli.",
  };
}

function parseCreateOnboardingTasks(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  return {
    intent: "task.create_onboarding_tasks",
    input: { userId },
    missingFields: userId ? [] : ["userId"],
    summary: userId
      ? "Onboarding görev seti hazırlanacak."
      : "Onboarding görevleri için müşteri scope’u gerekli.",
  };
}

function parseGenerateReport(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  const type = input.toLowerCase().includes("stok")
    ? "inventory"
    : input.toLowerCase().includes("uyum") || input.toLowerCase().includes("compliance")
      ? "compliance"
      : input.toLowerCase().includes("performans")
        ? "performance"
        : "sales";

  return {
    intent: "report.generate_customer_report",
    input: {
      userId,
      reportType: type,
      title: `${type === "sales" ? "Aylık Satış" : type === "inventory" ? "Envanter" : type === "performance" ? "Performans" : "Uyum"} Raporu`,
    },
    missingFields: userId ? [] : ["userId"],
    summary: userId
      ? "Müşteri raporu üretilecek ve taslak artifact olarak kaydedilecek."
      : "Rapor üretmek için müşteri scope’u gerekli.",
  };
}

function parsePublishArtifact(input: string, scope: CopilotScope): CommandParseResult {
  const artifactId = extractField(input, [
    /artifact[_\s-]?id\s*[:=]\s*([a-f0-9-]{8,})/i,
    /taslak\s*[:=]\s*([a-f0-9-]{8,})/i,
  ]);
  const customerId = extractCustomerRef(input, scope);
  const channel = input.toLowerCase().includes("email")
    ? "email"
    : input.toLowerCase().includes("bildirim")
      ? "in_app"
      : "portal";

  return {
    intent: "artifact.publish_to_customer_portal",
    input: {
      artifactId,
      customerId,
      channel,
    },
    missingFields: customerId ? [] : ["customerId"],
    summary: "Draft artifact müşteri kanalına publish edilecek.",
  };
}

function parseSendNotification(input: string, scope: CopilotScope): CommandParseResult {
  const customerId = extractCustomerRef(input, scope);
  const message = extractField(input, [
    /(?:mesaj|bildirim|message)\s*[:=]\s*([^]+)$/i,
    /gönder\s+(.+)/i,
  ]);
  return {
    intent: "notification.send_to_customer",
    input: {
      customerId,
      title: "Atlas Yönetim Bildirimi",
      body: message ?? "Yeni bir güncelleme hazır.",
      channel: input.toLowerCase().includes("email") ? "email" : "in_app",
    },
    missingFields: customerId ? [] : ["customerId"],
    summary: "Müşteri için gönderim taslağı hazırlanacak.",
  };
}

function parseTaskUpdate(input: string): CommandParseResult {
  const taskId = extractField(input, [
    /task[_\s-]?id\s*[:=]\s*([a-f0-9-]{8,})/i,
    /görev\s*(?:id)?\s*[:=]\s*([a-f0-9-]{8,})/i,
  ]);
  const status = extractField(input, [/(?:durum|status)\s*[:=]\s*([^,\n;]+)/i]) ?? "completed";
  return {
    intent: "task.update_process_task",
    input: { taskId, status },
    missingFields: taskId ? [] : ["taskId"],
    summary: "Süreç görevi güncellenecek.",
  };
}

function parseOnboardingStatus(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  const status = extractField(input, [/(?:durum|status)\s*[:=]\s*([^,\n;]+)/i]) ?? "active";
  return {
    intent: "customer.change_onboarding_status",
    input: { userId, status },
    missingFields: userId ? [] : ["userId"],
    summary: "Müşteri onboarding durumu güncellenecek.",
  };
}

function parseCompanyStatus(input: string, scope: CopilotScope): CommandParseResult {
  const companyId = scope.type === "company" && scope.refId
    ? scope.refId
    : extractField(input, [/(?:company|şirket)[_\s-]?id\s*[:=]\s*([a-f0-9-]{8,})/i]);
  const status = extractField(input, [/(?:durum|status)\s*[:=]\s*([^,\n;]+)/i]) ?? "active";
  return {
    intent: "company.update_status",
    input: { companyId, status },
    missingFields: companyId ? [] : ["companyId"],
    summary: "Şirket durumu güncellenecek.",
  };
}

function parseMarketplaceUpdate(input: string, scope: CopilotScope): CommandParseResult {
  const marketplaceId = scope.type === "marketplace" && scope.refId
    ? scope.refId
    : extractField(input, [/(?:marketplace|pazaryeri)[_\s-]?id\s*[:=]\s*([a-f0-9-]{8,})/i]);
  const status = extractField(input, [/(?:durum|status)\s*[:=]\s*([^,\n;]+)/i]) ?? "active";
  return {
    intent: "marketplace.update_account",
    input: { marketplaceId, status },
    missingFields: marketplaceId ? [] : ["marketplaceId"],
    summary: "Pazaryeri hesabı güncellenecek.",
  };
}

function parseCreateSocial(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  const platform = extractField(input, [/(instagram|facebook|tiktok|youtube|linkedin|pinterest|threads|x|twitter)/i])?.toLowerCase();
  const accountName = extractField(input, [/(?:hesap|account)\s*(?:adı|name)?\s*[:=]\s*([^,\n;]+)/i]);
  return {
    intent: "social.create_account",
    input: {
      userId,
      platform,
      accountName,
    },
    missingFields: [
      !userId ? "userId" : null,
      !platform ? "platform" : null,
      !accountName ? "accountName" : null,
    ].filter(Boolean) as string[],
    summary: "Sosyal medya hesabı oluşturulacak.",
  };
}

function parseCreateAdDraft(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  const campaignName = extractField(input, [/(?:kampanya|campaign)\s*(?:adı|name)?\s*[:=]\s*([^,\n;]+)/i]);
  const platform =
    extractField(input, [/(google_ads|facebook_ads|instagram_ads|tiktok_ads|amazon_ppc|walmart_ads|ebay_promoted)/i])?.toLowerCase()
      ?? "google_ads";
  return {
    intent: "advertising.create_campaign_draft",
    input: { userId, campaignName, platform },
    missingFields: [
      !userId ? "userId" : null,
      !campaignName ? "campaignName" : null,
    ].filter(Boolean) as string[],
    summary: "Reklam kampanyası taslağı oluşturulacak.",
  };
}

function parseFinanceDraft(input: string, scope: CopilotScope): CommandParseResult {
  const userId = extractCustomerRef(input, scope);
  const amountRaw = extractField(input, [/(?:tutar|amount)\s*[:=]\s*([0-9.,]+)/i]);
  const amount = amountRaw ? Number(amountRaw.replace(",", ".")) : undefined;
  const recordType = input.toLowerCase().includes("gelir") || input.toLowerCase().includes("income") ? "income" : "expense";
  const description = extractField(input, [/(?:açıklama|description)\s*[:=]\s*([^,\n;]+)/i]) ?? "Copilot finans kaydı";
  const category = extractField(input, [/(?:kategori|category)\s*[:=]\s*([^,\n;]+)/i]) ?? (recordType === "income" ? "other_income" : "other_expense");
  return {
    intent: "finance.create_record_draft",
    input: { userId, amount, recordType, description, category },
    missingFields: [
      !userId ? "userId" : null,
      !amount ? "amount" : null,
    ].filter(Boolean) as string[],
    summary: "Finans kaydı taslağı oluşturulacak.",
  };
}

function parseDocumentRequest(input: string, scope: CopilotScope): CommandParseResult {
  const customerId = extractCustomerRef(input, scope);
  const title = extractField(input, [/(?:başlık|title)\s*[:=]\s*([^,\n;]+)/i]) ?? "Belge Talebi";
  const description = extractField(input, [/(?:açıklama|description)\s*[:=]\s*([^]+)$/i]) ?? "Belge talebi oluştur.";
  return {
    intent: "document.request_or_attach",
    input: { customerId, title, description },
    missingFields: customerId ? [] : ["customerId"],
    summary: "Belge talebi taslağı oluşturulacak.",
  };
}

export function parseCommand(input: string, scope: CopilotScope): CommandParseResult {
  const lower = input.toLowerCase();
  const readOnlyQuery = isReadOnlyQuery(lower);
  const createVerb = hasCreateVerb(lower);
  const readOnlyExploration = isReadOnlyExplorationCommand(lower);

  if (
    lower.includes("yeni müşteri") ||
    lower.includes("müşteri ekle") ||
    lower.includes("create customer")
  ) {
    return parseCreateCustomer(input);
  }

  if ((lower.includes("llc") || lower.includes("şirket ekle") || lower.includes("company create")) && !readOnlyQuery) {
    return parseCreateCompany(input, scope);
  }

  if (lower.includes("onboarding durumu") || lower.includes("activate customer")) {
    return parseOnboardingStatus(input, scope);
  }

  if (scope.type === "company" && (lower.includes("durum") || lower.includes("status"))) {
    return parseCompanyStatus(input, scope);
  }

  if (
    createVerb &&
    (
      lower.includes("amazon") ||
      lower.includes("ebay") ||
      lower.includes("walmart") ||
      lower.includes("etsy") ||
      lower.includes("shopify") ||
      lower.includes("pazaryeri")
    )
  ) {
    return parseCreateMarketplace(input, scope);
  }

  if (scope.type === "marketplace" && (lower.includes("durum") || lower.includes("status"))) {
    return parseMarketplaceUpdate(input, scope);
  }

  if (createVerb && (lower.includes("sosyal medya") || lower.includes("instagram") || lower.includes("tiktok") || lower.includes("linkedin"))) {
    return parseCreateSocial(input, scope);
  }

  if (createVerb && (lower.includes("kampanya") || lower.includes("reklam"))) {
    return parseCreateAdDraft(input, scope);
  }

  if (createVerb && (lower.includes("gelir") || lower.includes("gider") || lower.includes("finans"))) {
    return parseFinanceDraft(input, scope);
  }

  if ((lower.includes("onboarding") && createVerb) || lower.includes("görevleri başlat") || lower.includes("task create")) {
    return parseCreateOnboardingTasks(input, scope);
  }

  if (/(rapor\s+(üret|uret|hazırla|hazirla|oluştur|olustur)|generate report|report generate)/i.test(lower)) {
    return parseGenerateReport(input, scope);
  }

  if (lower.includes("portala gönder") || lower.includes("müşteri hesabına gönder")) {
    return parsePublishArtifact(input, scope);
  }

  if (lower.includes("bildirim gönder") || lower.includes("mesaj gönder")) {
    return parseSendNotification(input, scope);
  }

  if (lower.includes("task update") || lower.includes("görev güncelle")) {
    return parseTaskUpdate(input);
  }

  if ((lower.includes("belge") || lower.includes("doküman") || lower.includes("dokuman")) && (createVerb || /(talep|iste|request|attach|yükle|yukle)/i.test(lower))) {
    return parseDocumentRequest(input, scope);
  }

  if (scope.type === "global" && !createVerb && readOnlyExploration) {
    return {
      intent: "system.agent_task",
      input: {
        rawCommand: input,
        readOnlyExploration: true,
      },
      missingFields: [],
      summary: "Read-only veri keşfi orchestrator üzerinden çalıştırılacak.",
    };
  }

  if (
    scope.type === "customer" &&
    (
      lower.includes("360") ||
      lower.includes("özet") ||
      lower.includes("hesap") ||
      lower.includes("durum") ||
      lower.includes("llc") ||
      lower.includes("şirket") ||
      lower.includes("form") ||
      lower.includes("göndermiş") ||
      lower.includes("submission") ||
      lower.includes("shopify") ||
      lower.includes("amazon") ||
      lower.includes("walmart") ||
      lower.includes("ebay") ||
      lower.includes("etsy") ||
      lower.includes("hangi adım") ||
      lower.includes("onboarding")
    )
  ) {
    return {
      intent: "customer.get_360",
      input: { userId: scope.refId },
      missingFields: scope.refId ? [] : ["userId"],
      summary: "Seçili müşteri için 360 görünüm getirilecek.",
    };
  }

  if (
    lower.includes("genel durum") ||
    lower.includes("kaç müşteri") ||
    lower.includes("kritik müşteri") ||
    lower.includes("toplam müşteri")
  ) {
    return {
      intent: "system.global_summary",
      input: {},
      missingFields: [],
      summary: "Global operasyon özeti üretilecek.",
    };
  }

  if (isLikelyFollowUpTurn(input)) {
    return {
      intent: "system.agent_task",
      input: {
        rawCommand: input,
        conversationTurn: true,
        followUpTurn: true,
      },
      missingFields: [],
      summary: "Takip mesajı aynı sohbet bağlamında orchestrator üzerinden çözülecek.",
    };
  }

  if (input.trim().length > 0) {
    return {
      intent: "system.agent_task",
      input: {
        rawCommand: input,
        conversationTurn: true,
        vagueConversationalTurn: isTooVagueConversationalTurn(input),
      },
      missingFields: [],
      summary: "Mesaj aynı sohbet içinde orchestrator üzerinden çözülecek.",
    };
  }

  return {
    intent: "system.unsupported",
    input: {},
    missingFields: [],
    summary: "Mesaj daha net bağlam istiyor.",
  };
}
