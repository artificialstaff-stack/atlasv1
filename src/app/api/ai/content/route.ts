// ─── Atlas Autonomous AI API — Content Management ────────────────────────────
// GET    /api/ai/content            — List content
// POST   /api/ai/content            — Generate new content
// PATCH  /api/ai/content            — Update content status
// ─────────────────────────────────────────────────────────────────────────────
import { requireAdmin } from "@/features/auth/guards";
import {
  getAllContent,
  getContentByStatus,
  generateContent,
  scoreContentQuality,
  adaptContentForChannel,
  updateContentStatus,
  getContent,
  getContentStats,
} from "@/lib/ai/autonomous";
import type { ContentType, SocialChannel } from "@/lib/ai/autonomous";

export async function GET(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  return Response.json({
    content: status ? getContentByStatus(status as "draft" | "review" | "approved" | "published" | "rejected") : getAllContent(),
    stats: getContentStats(),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      const { type, topic, context, tone, channel, customerId, customerName } = body;
      if (!topic) return Response.json({ error: "topic gerekli." }, { status: 400 });

      const content = await generateContent({
        type: (type ?? "social_post") as ContentType,
        topic,
        context,
        tone,
        channel: channel as SocialChannel | undefined,
        customerId,
        customerName,
      });

      // Auto-score quality
      const quality = await scoreContentQuality(content);
      content.quality = quality;

      return Response.json({ success: true, content });
    }

    if (action === "adapt") {
      const { contentId, channel } = body;
      if (!contentId || !channel) return Response.json({ error: "contentId ve channel gerekli." }, { status: 400 });

      const original = getContent(contentId);
      if (!original) return Response.json({ error: "İçerik bulunamadı." }, { status: 404 });

      const adapted = await adaptContentForChannel(original, channel as SocialChannel);
      return Response.json({ success: true, content: adapted });
    }

    if (action === "score") {
      const { contentId } = body;
      if (!contentId) return Response.json({ error: "contentId gerekli." }, { status: 400 });

      const content = getContent(contentId);
      if (!content) return Response.json({ error: "İçerik bulunamadı." }, { status: 404 });

      const quality = await scoreContentQuality(content);
      return Response.json({ success: true, quality });
    }

    return Response.json({ error: "Geçersiz action. (generate/adapt/score)" }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: "İçerik hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return Response.json({ error: "Yetkiniz yok." }, { status: 401 });
  }

  try {
    const { contentId, status } = await req.json();
    if (!contentId || !status) {
      return Response.json({ error: "contentId ve status gerekli." }, { status: 400 });
    }

    const result = updateContentStatus(contentId, status);
    if (!result) return Response.json({ error: "İçerik bulunamadı." }, { status: 404 });

    return Response.json({ success: true, content: result });
  } catch (err) {
    return Response.json(
      { error: "İçerik güncelleme hatası: " + (err instanceof Error ? err.message : "Bilinmeyen") },
      { status: 500 },
    );
  }
}
