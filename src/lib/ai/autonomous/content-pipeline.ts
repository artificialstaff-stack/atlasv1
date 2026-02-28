// ─── Atlas Autonomous AI — Content Pipeline ─────────────────────────────────
// End-to-end content generation and management.
//
// Pipeline: Analysis → Strategy → Writing → Design → Quality → Approval → Publish
//
// Supports: Social posts, email campaigns, blog articles, video scripts,
//           image prompts, ad copy, notifications
// ─────────────────────────────────────────────────────────────────────────────
import { streamText } from "ai";
import { chatModel } from "@/lib/ai/client";
import type {
  GeneratedContent,
  ContentType,
  ContentMetadata,
  QualityScore,
  SocialChannel,
} from "./types";

// ─── Content Store (in-memory, production → Supabase) ───────────────────────

const contentStore = new Map<string, GeneratedContent>();

// ─── Content Generation ─────────────────────────────────────────────────────

interface GenerateContentInput {
  type: ContentType;
  topic: string;
  context?: string;          // Additional data/context
  targetAudience?: string;
  tone?: string;
  channel?: SocialChannel;
  customerId?: string;
  customerName?: string;
  language?: string;
}

export async function generateContent(input: GenerateContentInput): Promise<GeneratedContent> {
  const systemPrompts: Record<ContentType, string> = {
    social_post: `Sen uzman bir sosyal medya içerik yazarısın.
Hedef kitle: ABD pazarına giren Türk girişimciler.
Kurallar:
- Dikkat çekici, kısa ve etkili ol (max 280 karakter Twitter, 2200 Instagram)
- Emoji kullan ama profesyonel kal
- Hashtag öner (5-10 arası)
- CTA (eylem çağrısı) ekle
- Ton: ${input.tone ?? "profesyonel ama samimi"}
${input.channel ? `Platform: ${input.channel}` : ""}
${input.targetAudience ? `Hedef kitle: ${input.targetAudience}` : ""}`,

    email: `Sen profesyonel bir e-posta kampanya yazarısın.
Konu, önizleme metni, gövde ve CTA oluştur.
Format:
**Konu:** [konu satırı]
**Önizleme:** [önizleme metni]
**Gövde:** [ana metin]
**CTA:** [eylem düğmesi metni]`,

    blog_post: `Sen deneyimli bir iş blog yazarısın.
SEO uyumlu, bilgilendirici ve ilgi çekici blog yazısı yaz.
H2/H3 başlıklar, bullet points ve sonuç bölümü ekle.`,

    report: `Sen bir iş analisti ve rapor yazarısın.
Profesyonel, veri odaklı rapor yaz. Grafik önerileri ekle.`,

    ad_copy: `Sen bir reklam metni uzmanısın.
AIDA modeli kullan: Attention → Interest → Desire → Action.
Kısa, etkili ve dönüşüm odaklı yaz.`,

    video_script: `Sen profesyonel bir video içerik yapımcısısın.
Kısa form video senaryosu yaz (30-60 saniye).
Sahne sahne yaz: Görsel + Seslendirme + Süre.
Hook ile başla, CTA ile bitir.`,

    image_prompt: `Sen bir AI görsel prompt mühendisisin.
Verilen bağlama uygun, detaylı İngilizce image generation prompt yaz.
Format: "A [style] [composition] of [subject], [details], [lighting], [mood], --ar 16:9"`,

    notification: `Sen kısa bildirim metni yazarısın.
Maksimum 160 karakter. Net, acil ve aksiyona yönlendirici ol.`,
  };

  const system = systemPrompts[input.type] ?? systemPrompts.social_post;
  const contextInfo = input.context ? `\n\nEk bağlam:\n${input.context}` : "";

  const result = streamText({
    model: chatModel,
    system,
    messages: [{
      role: "user",
      content: `${input.topic}${contextInfo}`,
    }],
    temperature: 0.6,
    maxOutputTokens: input.type === "blog_post" ? 2000 : 800,
  });

  let body = "";
  for await (const chunk of result.textStream) {
    body += chunk;
  }

  // Extract hashtags
  const hashtags = body.match(/#[\wığüşöçİĞÜŞÖÇ]+/g) ?? [];

  const content: GeneratedContent = {
    id: `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.topic.slice(0, 100),
    body: body.trim(),
    metadata: {
      language: input.language ?? "tr",
      tone: input.tone ?? "professional",
      targetAudience: input.targetAudience,
      hashtags,
      customerId: input.customerId,
      customerName: input.customerName,
    },
    quality: { overall: 0, dimensions: { relevance: 0, clarity: 0, engagement: 0, brandAlign: 0 }, issues: [], suggestions: [] },
    status: "draft",
    targetChannel: input.channel,
    targetCustomerId: input.customerId,
    createdAt: Date.now(),
  };

  contentStore.set(content.id, content);
  return content;
}

// ─── Quality Scoring ────────────────────────────────────────────────────────

export async function scoreContentQuality(content: GeneratedContent): Promise<QualityScore> {
  const result = streamText({
    model: chatModel,
    system: `Sen bir içerik kalite değerlendirme uzmanısın.
İçeriği 4 boyutta değerlendir (her biri 0-100):
1. relevance: Konuya ve hedefe uygunluk
2. clarity: Anlaşılırlık ve yazım kalitesi
3. engagement: Dikkat çekicilik ve etkileşim potansiyeli
4. brandAlign: Profesyonel iş markasına uygunluk

JSON formatında yanıt ver:
{"relevance": N, "clarity": N, "engagement": N, "brandAlign": N, "issues": ["sorun1"], "suggestions": ["öneri1"]}`,
    messages: [{
      role: "user",
      content: `Tür: ${content.type}\nBaşlık: ${content.title}\n\n${content.body}`,
    }],
    temperature: 0.2,
    maxOutputTokens: 300,
  });

  let text = "";
  for await (const chunk of result.textStream) {
    text += chunk;
  }

  try {
    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const score: QualityScore = {
        overall: Math.round(
          (parsed.relevance + parsed.clarity + parsed.engagement + parsed.brandAlign) / 4,
        ),
        dimensions: {
          relevance: parsed.relevance ?? 70,
          clarity: parsed.clarity ?? 70,
          engagement: parsed.engagement ?? 70,
          brandAlign: parsed.brandAlign ?? 70,
        },
        issues: parsed.issues ?? [],
        suggestions: parsed.suggestions ?? [],
      };

      // Update stored content
      content.quality = score;
      if (score.overall >= 70) {
        content.status = "review";
      }
      contentStore.set(content.id, content);

      return score;
    }
  } catch {
    // Fall through to default
  }

  return {
    overall: 70,
    dimensions: { relevance: 70, clarity: 70, engagement: 70, brandAlign: 70 },
    issues: [],
    suggestions: ["Otomatik değerlendirme başarısız, manuel inceleme önerilir"],
  };
}

// ─── Multi-Channel Content Adaptation ───────────────────────────────────────

export async function adaptContentForChannel(
  content: GeneratedContent,
  channel: SocialChannel,
): Promise<GeneratedContent> {
  const channelLimits: Record<SocialChannel, { maxLength: number; features: string }> = {
    twitter: { maxLength: 280, features: "kısa, thread potansiyeli, mention" },
    instagram: { maxLength: 2200, features: "caption, hashtag yoğun, emoji, hikaye formatı" },
    facebook: { maxLength: 5000, features: "detaylı, link paylaşımı, grup hedefleme" },
    linkedin: { maxLength: 3000, features: "profesyonel ton, insight, iş jargonu" },
    tiktok: { maxLength: 300, features: "viral, trend, genç dil, hook-based" },
    youtube: { maxLength: 5000, features: "SEO başlık, detaylı açıklama, tag" },
  };

  const limit = channelLimits[channel];

  const result = streamText({
    model: chatModel,
    system: `Sen bir sosyal medya uzmanısın. Verilen içeriği ${channel} platformuna uyarla.
Kurallar:
- Maksimum ${limit.maxLength} karakter
- Platform özellikleri: ${limit.features}
- Orijinal mesajı koru ama platformun diline adapte et`,
    messages: [{
      role: "user",
      content: `Bu içeriği ${channel} için uyarla:\n\n${content.body}`,
    }],
    temperature: 0.5,
    maxOutputTokens: 600,
  });

  let adapted = "";
  for await (const chunk of result.textStream) {
    adapted += chunk;
  }

  const hashtags = adapted.match(/#[\wığüşöçİĞÜŞÖÇ]+/g) ?? [];

  const newContent: GeneratedContent = {
    ...content,
    id: `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    body: adapted.trim(),
    targetChannel: channel,
    metadata: { ...content.metadata, hashtags },
    status: "draft",
    createdAt: Date.now(),
  };

  contentStore.set(newContent.id, newContent);
  return newContent;
}

// ─── Content Store Operations ───────────────────────────────────────────────

export function getContent(id: string): GeneratedContent | undefined {
  return contentStore.get(id);
}

export function getAllContent(limit = 50): GeneratedContent[] {
  return Array.from(contentStore.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function getContentByStatus(status: GeneratedContent["status"]): GeneratedContent[] {
  return Array.from(contentStore.values())
    .filter(c => c.status === status)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function updateContentStatus(
  id: string,
  status: GeneratedContent["status"],
): GeneratedContent | null {
  const content = contentStore.get(id);
  if (!content) return null;

  content.status = status;
  if (status === "approved") content.approvedAt = Date.now();
  if (status === "published") content.publishedAt = Date.now();
  contentStore.set(id, content);
  return content;
}

export function getContentStats(): {
  total: number;
  draft: number;
  review: number;
  approved: number;
  published: number;
  rejected: number;
} {
  let draft = 0, review = 0, approved = 0, published = 0, rejected = 0;
  for (const c of contentStore.values()) {
    if (c.status === "draft") draft++;
    else if (c.status === "review") review++;
    else if (c.status === "approved") approved++;
    else if (c.status === "published") published++;
    else if (c.status === "rejected") rejected++;
  }
  return { total: contentStore.size, draft, review, approved, published, rejected };
}
