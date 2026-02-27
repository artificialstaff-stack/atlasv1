/**
 * ─── Atlas Marketplace AI — Ürün Listeleme Asistanı ───
 * Amazon/Etsy/eBay için listing optimizasyonu.
 */

export type Marketplace = "amazon" | "etsy" | "ebay" | "shopify" | "trendyol";

export interface ProductInfo {
  name: string;
  description: string;
  category: string;
  price: number;
  features: string[];
  images?: string[];
}

export interface ListingOptimization {
  marketplace: Marketplace;
  optimizedTitle: string;
  optimizedDescription: string;
  bulletPoints: string[];
  keywords: string[];
  searchTerms: string[];
  priceSuggestion: {
    min: number;
    max: number;
    recommended: number;
  };
  tips: string[];
  seoScore: number;
}

/**
 * Ürün listing'ini marketplace'e göre optimize et.
 * Production'da OpenAI API kullanır, stub olarak rule-based.
 */
export async function optimizeListing(
  product: ProductInfo,
  marketplace: Marketplace
): Promise<ListingOptimization> {
  // Marketplace-specific kurallar
  const rules = getMarketplaceRules(marketplace);

  // Title optimizasyonu
  const optimizedTitle = generateOptimizedTitle(product, rules);

  // Description optimizasyonu
  const optimizedDescription = generateOptimizedDescription(product, rules);

  // Bullet points
  const bulletPoints = generateBulletPoints(product, rules);

  // Keywords
  const keywords = extractKeywords(product);

  // Search terms
  const searchTerms = generateSearchTerms(product, marketplace);

  // Fiyat önerisi
  const priceSuggestion = suggestPrice(product, marketplace);

  // İpuçları
  const tips = generateTips(product, marketplace);

  // SEO skoru
  const seoScore = calculateSeoScore({
    title: optimizedTitle,
    description: optimizedDescription,
    bulletPoints,
    keywords,
  });

  return {
    marketplace,
    optimizedTitle,
    optimizedDescription,
    bulletPoints,
    keywords,
    searchTerms,
    priceSuggestion,
    tips,
    seoScore,
  };
}

/**
 * Birden fazla marketplace için toplu optimize et
 */
export async function optimizeForMultipleMarketplaces(
  product: ProductInfo,
  marketplaces: Marketplace[]
): Promise<ListingOptimization[]> {
  return Promise.all(marketplaces.map((mp) => optimizeListing(product, mp)));
}

// ─── Helper Functions ───

interface MarketplaceRules {
  maxTitleLength: number;
  maxDescriptionLength: number;
  maxBulletPoints: number;
  maxBulletLength: number;
  requiresSKU: boolean;
  titleSeparator: string;
  priceMultiplier: number;
}

function getMarketplaceRules(marketplace: Marketplace): MarketplaceRules {
  const rules: Record<Marketplace, MarketplaceRules> = {
    amazon: {
      maxTitleLength: 200,
      maxDescriptionLength: 2000,
      maxBulletPoints: 5,
      maxBulletLength: 500,
      requiresSKU: true,
      titleSeparator: " - ",
      priceMultiplier: 1.3,
    },
    etsy: {
      maxTitleLength: 140,
      maxDescriptionLength: 5000,
      maxBulletPoints: 0,
      maxBulletLength: 0,
      requiresSKU: false,
      titleSeparator: ", ",
      priceMultiplier: 1.4,
    },
    ebay: {
      maxTitleLength: 80,
      maxDescriptionLength: 4000,
      maxBulletPoints: 6,
      maxBulletLength: 400,
      requiresSKU: false,
      titleSeparator: " | ",
      priceMultiplier: 1.2,
    },
    shopify: {
      maxTitleLength: 255,
      maxDescriptionLength: 5000,
      maxBulletPoints: 10,
      maxBulletLength: 500,
      requiresSKU: true,
      titleSeparator: " - ",
      priceMultiplier: 1.0,
    },
    trendyol: {
      maxTitleLength: 150,
      maxDescriptionLength: 3000,
      maxBulletPoints: 5,
      maxBulletLength: 300,
      requiresSKU: true,
      titleSeparator: " ",
      priceMultiplier: 1.1,
    },
  };
  return rules[marketplace];
}

function generateOptimizedTitle(product: ProductInfo, rules: MarketplaceRules): string {
  const parts = [product.name, product.category, ...product.features.slice(0, 2)];
  const title = parts.join(rules.titleSeparator);
  return title.slice(0, rules.maxTitleLength);
}

function generateOptimizedDescription(product: ProductInfo, rules: MarketplaceRules): string {
  const sections = [
    product.description,
    "",
    "Özellikler:",
    ...product.features.map((f) => `• ${f}`),
    "",
    `Kategori: ${product.category}`,
  ];
  const description = sections.join("\n");
  return description.slice(0, rules.maxDescriptionLength);
}

function generateBulletPoints(product: ProductInfo, rules: MarketplaceRules): string[] {
  if (rules.maxBulletPoints === 0) return [];

  return product.features
    .slice(0, rules.maxBulletPoints)
    .map((f) => f.slice(0, rules.maxBulletLength));
}

function extractKeywords(product: ProductInfo): string[] {
  const text = `${product.name} ${product.description} ${product.category} ${product.features.join(" ")}`;
  const words = text
    .toLowerCase()
    .replace(/[^a-zçğıöşü0-9\s]/gi, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Unique sözcükler
  return [...new Set(words)].slice(0, 25);
}

function generateSearchTerms(product: ProductInfo, marketplace: Marketplace): string[] {
  const base = extractKeywords(product).slice(0, 10);
  // Marketplace-specific terimler ekle
  const marketplaceTerms: Record<Marketplace, string[]> = {
    amazon: ["buy online", "free shipping", "prime"],
    etsy: ["handmade", "unique", "gift"],
    ebay: ["new", "best price", "fast shipping"],
    shopify: ["shop", "store", "collection"],
    trendyol: ["hızlı kargo", "indirim", "kampanya"],
  };

  return [...base, ...(marketplaceTerms[marketplace] ?? [])].slice(0, 15);
}

function suggestPrice(product: ProductInfo, marketplace: Marketplace) {
  const rules = getMarketplaceRules(marketplace);
  const base = product.price * rules.priceMultiplier;

  return {
    min: Math.round(base * 0.85 * 100) / 100,
    max: Math.round(base * 1.15 * 100) / 100,
    recommended: Math.round(base * 100) / 100,
  };
}

function generateTips(product: ProductInfo, marketplace: Marketplace): string[] {
  const tips: string[] = [];

  if (product.name.length < 20) {
    tips.push("Ürün başlığını daha açıklayıcı hale getirin (en az 40 karakter)");
  }
  if (product.features.length < 3) {
    tips.push("En az 5 özellik ekleyin — liste optimizasyonu için kritik");
  }
  if (!product.description || product.description.length < 100) {
    tips.push("Ürün açıklamasını en az 200 karakter yapın");
  }
  if (marketplace === "amazon" && !product.images?.length) {
    tips.push("Amazon için en az 7 yüksek kaliteli görsel ekleyin (ana görsel beyaz arka planlı)");
  }
  if (marketplace === "etsy") {
    tips.push("Etsy için benzersiz, el yapımı özelliklerini vurgulayın");
    tips.push("Tags bölümüne en az 13 tag ekleyin");
  }

  return tips;
}

function calculateSeoScore(params: {
  title: string;
  description: string;
  bulletPoints: string[];
  keywords: string[];
}): number {
  let score = 0;

  // Title length (max 25)
  if (params.title.length >= 40) score += 15;
  if (params.title.length >= 80) score += 10;

  // Description (max 25)
  if (params.description.length >= 100) score += 10;
  if (params.description.length >= 300) score += 10;
  if (params.description.length >= 500) score += 5;

  // Bullet points (max 25)
  score += Math.min(params.bulletPoints.length * 5, 25);

  // Keywords (max 25)
  score += Math.min(params.keywords.length * 1.5, 25);

  return Math.min(Math.round(score), 100);
}
