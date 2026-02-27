/**
 * ─── Atlas Email Service ───
 * Resend SDK ile transactional e-posta gönderimi.
 * 9 template: welcome, invoice, payment, order, reset, invitation, ticket, subscription, admin_alert
 * API key yoksa geliştirme modunda console'a loglar.
 */
import { Resend } from "resend";

// ─── Config ──────────────────────────────────────────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DEFAULT_FROM = "ATLAS Platform <noreply@atlasplatform.co>";
const SUPPORT_EMAIL = "support@atlasplatform.co";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://atlasplatform.com";

// ─── Types ───────────────────────────────────────────────
export type EmailTemplate =
  | "welcome"
  | "invoice_created"
  | "invoice_paid_confirmation"
  | "payment_confirmed"
  | "order_status_update"
  | "password_reset"
  | "invitation"
  | "ticket_update"
  | "subscription_expiring";

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

// ─── Layout Wrapper ──────────────────────────────────────
function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="tr" dir="ltr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f4f4f5;color:#18181b}
.wrapper{max-width:600px;margin:0 auto;padding:40px 20px}
.card{background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.logo{text-align:center;margin-bottom:24px}
.logo h1{font-size:28px;font-weight:800;background:linear-gradient(135deg,#2563eb,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.content h2{font-size:20px;font-weight:700;margin-bottom:16px;color:#18181b}
.content p{font-size:15px;line-height:1.6;margin-bottom:12px;color:#3f3f46}
.btn{display:inline-block;padding:12px 28px;background:#2563eb;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin:16px 0}
.info-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0}
.info-box p{color:#0c4a6e;margin:4px 0;font-size:14px}
.warning-box{background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0}
.warning-box p{color:#713f12;margin:4px 0;font-size:14px}
.footer{text-align:center;margin-top:24px;padding:16px}
.footer p{font-size:12px;color:#a1a1aa}
.footer a{color:#2563eb;text-decoration:none}
table{width:100%;border-collapse:collapse;margin:16px 0}
table th,table td{padding:10px 12px;text-align:left;border-bottom:1px solid #e4e4e7;font-size:14px}
table th{background:#f4f4f5;font-weight:600}
.badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
.badge-success{background:#dcfce7;color:#166534}
.badge-info{background:#dbeafe;color:#1e40af}
</style></head>
<body><div class="wrapper"><div class="card">
<div class="logo"><h1>ATLAS</h1></div>
<div class="content">${content}</div>
</div>
<div class="footer">
<p>Bu e-posta Atlas Platform tarafından gönderilmiştir.</p>
<p><a href="${APP_URL}">atlasplatform.com</a> · <a href="mailto:${SUPPORT_EMAIL}">Destek</a></p>
<p style="margin-top:8px">© ${new Date().getFullYear()} Atlas Global LLC. Tüm hakları saklıdır.</p>
</div></div></body></html>`;
}

// ─── Core Send ───────────────────────────────────────────
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!resend) {
    console.log("[email:dev]", payload.subject, "→", payload.to);
    return { success: true, id: `dev_${Date.now()}` };
  }

  try {
    const result = await resend.emails.send({
      from: payload.from ?? DEFAULT_FROM,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo || SUPPORT_EMAIL,
      tags: payload.tags,
    });

    if (result.error) {
      console.error("[Email] Send failed:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email] Exception:", msg);
    return { success: false, error: msg };
  }
}

// ─── Template: Welcome ───────────────────────────────────
export function welcomeEmail(name: string, companyName?: string, planTier?: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  const plan = planTier || "starter";
  return {
    subject: `Hoş Geldiniz, ${name}! Atlas Platform'a Başlayın`,
    html: layout("Hoş Geldiniz", `
      <h2>Merhaba ${name}! 👋</h2>
      <p>Atlas Platform'a hoş geldiniz${companyName ? ` — <strong>${companyName}</strong>` : ""}!</p>
      <p>${plan.charAt(0).toUpperCase() + plan.slice(1)} planınız aktive edildi. ABD pazarına açılma yolculuğunuz başlıyor.</p>
      <div class="info-box">
        <p><strong>Sonraki Adımlar:</strong></p>
        <p>1. Panel'e giriş yaparak ürünlerinizi ekleyin</p>
        <p>2. İş süreçlerini kontrol edin</p>
        <p>3. Destek ekibimizle tanışma görüşmesi planlayın</p>
      </div>
      <a href="${APP_URL}/panel/dashboard" class="btn">Panele Git</a>
      <p style="font-size:13px;color:#71717a">Herhangi bir sorunuz varsa <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> adresinden bize ulaşabilirsiniz.</p>
    `),
    text: `Merhaba ${name}!\n\nAtlas Platform'a hoş geldiniz!\n${plan} planınız aktive edildi.\n\nPanel: ${APP_URL}/panel/dashboard\nDestek: ${SUPPORT_EMAIL}`,
  };
}

// ─── Template: Invoice Created ───────────────────────────
export function invoiceCreatedEmail(data: { firstName: string; invoiceNumber: string; amount: number; currency?: string; planTier: string; dueDate: string }): Pick<EmailPayload, "subject" | "html" | "text"> {
  const cur = data.currency || "USD";
  return {
    subject: `Yeni Faturanız: ${data.invoiceNumber}`,
    html: layout("Yeni Fatura", `
      <h2>Yeni Fatura Oluşturuldu</h2>
      <p>Merhaba ${data.firstName}, aşağıdaki fatura hesabınıza tanımlanmıştır:</p>
      <table>
        <tr><th>Fatura No</th><td>${data.invoiceNumber}</td></tr>
        <tr><th>Plan</th><td>${data.planTier}</td></tr>
        <tr><th>Tutar</th><td><strong>${cur} ${data.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</strong></td></tr>
        <tr><th>Son Ödeme</th><td>${data.dueDate}</td></tr>
      </table>
      <div class="info-box">
        <p><strong>Ödeme Bilgileri:</strong></p>
        <p>Banka: JPMorgan Chase Bank</p>
        <p>Hesap Adı: Atlas Global LLC</p>
        <p>Routing: 021000021</p>
        <p>Account: 9876543210</p>
        <p>Açıklama: ${data.invoiceNumber}</p>
      </div>
      <a href="${APP_URL}/panel/billing" class="btn">Faturayı Görüntüle</a>
      <p style="font-size:13px;color:#71717a">Ödemenizi yaptıktan sonra "Ödeme Yaptım" butonuna tıklamayı unutmayın.</p>
    `),
    text: `Yeni fatura: ${data.invoiceNumber}\nTutar: ${cur} ${data.amount}\nSon ödeme: ${data.dueDate}\n\n${APP_URL}/panel/billing`,
  };
}

// ─── Template: Invoice Paid Confirmation ─────────────────
export function invoicePaidConfirmationEmail(invoiceNumber: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: `Ödeme Bildiriminiz Alındı: ${invoiceNumber}`,
    html: layout("Ödeme Bildirimi", `
      <h2>Ödeme Bildiriminiz Alındı ✓</h2>
      <p><strong>${invoiceNumber}</strong> numaralı fatura için ödeme bildiriminiz alınmıştır.</p>
      <p>Ekibimiz ödemenizi kontrol edecek ve onayladıktan sonra bilgi verecektir.</p>
      <div class="info-box"><p><strong>Beklenen Süre:</strong> 1-2 iş günü</p></div>
      <a href="${APP_URL}/panel/billing" class="btn">Fatura Durumunu Kontrol Et</a>
    `),
    text: `Ödeme bildiriminiz alındı: ${invoiceNumber}\n1-2 iş günü içinde onaylanacaktır.\n\n${APP_URL}/panel/billing`,
  };
}

// ─── Template: Payment Confirmed ─────────────────────────
export function paymentConfirmedEmail(data: { firstName: string; invoiceNumber: string; planTier: string }): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: `Ödemeniz Onaylandı! ${data.invoiceNumber}`,
    html: layout("Ödeme Onaylandı", `
      <h2>Ödemeniz Onaylandı! 🎉</h2>
      <p>Merhaba ${data.firstName}, <strong>${data.invoiceNumber}</strong> numaralı faturanızın ödemesi onaylanmıştır.</p>
      <p><span class="badge badge-success">${data.planTier}</span> aboneliğiniz aktif edilmiştir.</p>
      <a href="${APP_URL}/panel/dashboard" class="btn">Panele Git</a>
    `),
    text: `Ödemeniz onaylandı: ${data.invoiceNumber}\nPlan: ${data.planTier} aktif.\n\n${APP_URL}/panel/dashboard`,
  };
}

// ─── Template: Order Status Update ───────────────────────
export function orderStatusEmail(name: string, orderId: string, status: string, trackingRef?: string, carrier?: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  const statusMap: Record<string, string> = {
    received: "Alındı", processing: "İşleniyor", packing: "Paketleniyor",
    shipped: "Kargoya Verildi", delivered: "Teslim Edildi", cancelled: "İptal Edildi", returned: "İade Edildi",
  };
  const label = statusMap[status] ?? status;
  return {
    subject: `Sipariş #${orderId.slice(0, 8)} — ${label}`,
    html: layout("Sipariş Güncelleme", `
      <h2>Sipariş Durumu Güncellendi</h2>
      <p>Merhaba ${name},</p>
      <table>
        <tr><th>Sipariş ID</th><td>${orderId.slice(0, 8)}...</td></tr>
        <tr><th>Yeni Durum</th><td><span class="badge badge-info">${label}</span></td></tr>
        ${trackingRef ? `<tr><th>Takip No</th><td>${trackingRef}</td></tr>` : ""}
        ${carrier ? `<tr><th>Kargo</th><td>${carrier}</td></tr>` : ""}
      </table>
      <a href="${APP_URL}/panel/orders/${orderId}" class="btn">Sipariş Detayı</a>
    `),
    text: `Sipariş #${orderId.slice(0, 8)} durumu: ${label}\n${trackingRef ? `Takip: ${trackingRef}` : ""}\n\n${APP_URL}/panel/orders/${orderId}`,
  };
}

// ─── Template: Password Reset ────────────────────────────
export function passwordResetEmail(resetLink: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: "Şifre Sıfırlama — ATLAS Platform",
    html: layout("Şifre Sıfırlama", `
      <h2>Şifre Sıfırlama</h2>
      <p>Hesabınız için bir şifre sıfırlama talebi aldık.</p>
      <a href="${resetLink}" class="btn">Şifremi Sıfırla</a>
      <div class="warning-box">
        <p>Bu bağlantı <strong>1 saat</strong> boyunca geçerlidir.</p>
        <p>Bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
      </div>
    `),
    text: `Şifrenizi sıfırlamak için: ${resetLink}\n\nBu bağlantı 1 saat boyunca geçerlidir.`,
  };
}

// ─── Template: Invitation ────────────────────────────────
export function invitationEmail(planTier: string, token: string): Pick<EmailPayload, "subject" | "html" | "text"> {
  const registerUrl = `${APP_URL}/register?invitation=${token}`;
  return {
    subject: "Atlas Platform'a Davet Edildiniz!",
    html: layout("Davet", `
      <h2>Atlas Platform'a Davet Edildiniz! 🎉</h2>
      <p>ABD'ye açılma yolculuğunuzda size yardımcı olmak için heyecanlıyız.</p>
      <p>Sizin için <span class="badge badge-info">${planTier}</span> planı hazırlandı.</p>
      <a href="${registerUrl}" class="btn">Hesap Oluştur</a>
      <div class="info-box"><p>Bu davet bağlantısı 7 gün boyunca geçerlidir.</p></div>
    `),
    text: `Atlas Platform'a davet edildiniz!\nPlan: ${planTier}\n\nKayıt: ${registerUrl}\n\nBu davet 7 gün boyunca geçerlidir.`,
  };
}

// ─── Template: Ticket Update ─────────────────────────────
export function ticketUpdateEmail(data: { ticketSubject: string; status: string; adminResponse?: string }): Pick<EmailPayload, "subject" | "html" | "text"> {
  const statusMap: Record<string, string> = {
    open: "Açık", investigating: "İnceleniyor", waiting_customer: "Müşteri Yanıtı Bekleniyor",
    resolved: "Çözüldü", closed: "Kapatıldı",
  };
  return {
    subject: `Destek Talebi Güncellendi: ${data.ticketSubject}`,
    html: layout("Destek Güncelleme", `
      <h2>Destek Talebi Güncellendi</h2>
      <p><strong>Konu:</strong> ${data.ticketSubject}</p>
      <p><strong>Durum:</strong> <span class="badge badge-info">${statusMap[data.status] || data.status}</span></p>
      ${data.adminResponse ? `<div class="info-box"><p><strong>Ekip Yanıtı:</strong></p><p>${data.adminResponse}</p></div>` : ""}
      <a href="${APP_URL}/panel/support" class="btn">Talepleri Görüntüle</a>
    `),
    text: `Destek talebi: ${data.ticketSubject}\nDurum: ${statusMap[data.status] || data.status}\n${data.adminResponse ? `Yanıt: ${data.adminResponse}` : ""}\n\n${APP_URL}/panel/support`,
  };
}

// ─── Template: Subscription Expiring ─────────────────────
export function subscriptionExpiringEmail(data: { firstName: string; planTier: string; expiresAt: string; daysLeft: number }): Pick<EmailPayload, "subject" | "html" | "text"> {
  return {
    subject: `Aboneliğiniz ${data.daysLeft} Gün İçinde Sona Eriyor`,
    html: layout("Abonelik Uyarısı", `
      <h2>Abonelik Yenileme Hatırlatması</h2>
      <p>Merhaba ${data.firstName}, <strong>${data.planTier}</strong> planınız <strong>${data.expiresAt}</strong> tarihinde sona erecektir.</p>
      <div class="warning-box">
        <p><strong>${data.daysLeft} gün</strong> kaldı! Hizmetlerinizin kesintisiz devam etmesi için lütfen ödemenizi yapın.</p>
      </div>
      <a href="${APP_URL}/panel/billing" class="btn">Yenileme İçin Tıklayın</a>
      <p style="font-size:13px;color:#71717a">Sorularınız için <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> adresine yazabilirsiniz.</p>
    `),
    text: `Merhaba ${data.firstName},\n${data.planTier} planınız ${data.expiresAt} tarihinde sona erecek.\n${data.daysLeft} gün kaldı!\n\n${APP_URL}/panel/billing`,
  };
}

// ─── Convenience Send Functions ──────────────────────────
export async function sendWelcomeEmail(to: string, name: string, companyName?: string, planTier?: string) {
  const tpl = welcomeEmail(name, companyName, planTier);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "welcome" }] });
}

export async function sendInvoiceEmail(to: string, data: { firstName: string; invoiceNumber: string; amount: number; currency?: string; planTier: string; dueDate: string }) {
  const tpl = invoiceCreatedEmail(data);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "invoice_created" }] });
}

export async function sendPaymentConfirmedEmail(to: string, data: { firstName: string; invoiceNumber: string; planTier: string }) {
  const tpl = paymentConfirmedEmail(data);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "payment_confirmed" }] });
}

export async function sendOrderUpdateEmail(to: string, name: string, orderId: string, status: string, trackingRef?: string, carrier?: string) {
  const tpl = orderStatusEmail(name, orderId, status, trackingRef, carrier);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "order_status" }] });
}

export async function sendInvitationEmail(to: string, planTier: string, token: string) {
  const tpl = invitationEmail(planTier, token);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "invitation" }] });
}

export async function sendTicketUpdateEmail(to: string, data: { ticketSubject: string; status: string; adminResponse?: string }) {
  const tpl = ticketUpdateEmail(data);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "ticket_update" }] });
}

export async function sendSubscriptionExpiringEmail(to: string, data: { firstName: string; planTier: string; expiresAt: string; daysLeft: number }) {
  const tpl = subscriptionExpiringEmail(data);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "subscription_expiring" }] });
}
