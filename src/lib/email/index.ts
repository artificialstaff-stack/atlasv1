/**
 * ─── Atlas Email Service ───
 * Resend SDK ile transactional e-posta gönderimi.
 * API key yoksa geliştirme modunda console'a loglar.
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM = "ATLAS Platform <noreply@atlasplatform.co>";

/**
 * E-posta gönder — Resend API
 * RESEND_API_KEY ayarlanmamışsa dev modda console'a loglar.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[email:dev]", payload.subject, "→", payload.to);
    return { success: true, id: `dev_${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from ?? DEFAULT_FROM,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
        tags: payload.tags,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }

    const data = (await res.json()) as { id: string };
    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Template Helpers ───

export function welcomeEmail(name: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: "ATLAS'a Hoş Geldiniz! 🚀",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0d1117;color:#e6edf3;border-radius:12px;">
        <h1 style="color:#58a6ff;margin-bottom:8px;">Hoş Geldiniz, ${name}!</h1>
        <p>ATLAS Platform'a başarıyla kayıt oldunuz. ABD pazarına açılma yolculuğunuz başlıyor.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/panel/dashboard" style="display:inline-block;background:#58a6ff;color:#0d1117;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Panele Git →</a>
        <p style="margin-top:24px;font-size:13px;color:#8b949e;">Sorularınız için her zaman <a href="mailto:destek@atlasplatform.co" style="color:#58a6ff;">destek@atlasplatform.co</a> adresinden bize ulaşabilirsiniz.</p>
      </div>
    `,
    text: `Hoş Geldiniz, ${name}! ATLAS Platform'a başarıyla kayıt oldunuz. Panele git: ${process.env.NEXT_PUBLIC_APP_URL}/panel/dashboard`,
  };
}

export function orderStatusEmail(
  name: string,
  orderId: string,
  status: string
): Pick<EmailPayload, "subject" | "html" | "text"> {
  const statusMap: Record<string, string> = {
    preparing: "Hazırlanıyor",
    shipped: "Kargoya Verildi",
    delivered: "Teslim Edildi",
    cancelled: "İptal Edildi",
  };
  const label = statusMap[status] ?? status;
  return {
    subject: `Sipariş #${orderId.slice(0, 8)} — ${label}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0d1117;color:#e6edf3;border-radius:12px;">
        <h2 style="color:#58a6ff;">Sipariş Güncellendi</h2>
        <p>Merhaba ${name},</p>
        <p>Sipariş <strong>#${orderId.slice(0, 8)}</strong> durumu: <strong style="color:#3fb950;">${label}</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/panel/orders" style="display:inline-block;background:#58a6ff;color:#0d1117;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Siparişleri Gör →</a>
      </div>
    `,
    text: `Sipariş #${orderId.slice(0, 8)} durumu: ${label}. Detay: ${process.env.NEXT_PUBLIC_APP_URL}/panel/orders`,
  };
}

export function passwordResetEmail(resetLink: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: "Şifre Sıfırlama — ATLAS Platform",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0d1117;color:#e6edf3;border-radius:12px;">
        <h2 style="color:#58a6ff;">Şifre Sıfırlama</h2>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın. Bu bağlantı 1 saat geçerlidir.</p>
        <a href="${resetLink}" style="display:inline-block;background:#58a6ff;color:#0d1117;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Şifremi Sıfırla →</a>
        <p style="margin-top:24px;font-size:13px;color:#8b949e;">Bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
      </div>
    `,
    text: `Şifrenizi sıfırlamak için: ${resetLink}`,
  };
}
