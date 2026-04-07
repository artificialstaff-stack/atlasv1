/**
 * ─── Atlas Email Service ───
 * Resend SDK ile transactional e-posta gönderimi.
 * Template'ler TR/EN locale-aware çalışır.
 */
import { Resend } from "resend";

import { emailLang, escapeHtml, formatEmailCurrency, formatEmailDate, formatEmailNumber, type EmailLocale } from "./localization";

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

type TemplateLocale = EmailLocale;

function planLabel(planTier?: string) {
  if (!planTier) return "Starter";
  return planTier.charAt(0).toUpperCase() + planTier.slice(1);
}

function safeText(value: string) {
  return escapeHtml(value);
}

function layout(title: string, content: string, locale: TemplateLocale = "tr"): string {
  const lang = emailLang(locale);
  const isTr = lang === "tr";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${safeText(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#e2e8f0}
.wrapper{max-width:640px;margin:0 auto;padding:40px 20px}
.card{background:#111827;border:1px solid rgba(148,163,184,.18);border-radius:20px;padding:32px;box-shadow:0 24px 60px rgba(15,23,42,.35)}
.logo{text-align:center;margin-bottom:24px}
.logo h1{font-size:28px;font-weight:800;letter-spacing:.08em;color:#f8fafc}
.logo p{margin-top:8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#94a3b8}
.content h2{font-size:24px;font-weight:800;margin-bottom:16px;color:#f8fafc;line-height:1.2}
.content p{font-size:15px;line-height:1.7;margin-bottom:12px;color:#cbd5e1}
.btn{display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff!important;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;margin:18px 0}
.info-box{background:rgba(37,99,235,.08);border:1px solid rgba(59,130,246,.22);border-radius:16px;padding:16px;margin:18px 0}
.warning-box{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:16px;padding:16px;margin:18px 0}
.info-box p,.warning-box p{color:#e5e7eb;margin:4px 0;font-size:14px}
table{width:100%;border-collapse:collapse;margin:18px 0;overflow:hidden;border-radius:16px}
table th,table td{padding:12px 14px;text-align:left;border-bottom:1px solid rgba(148,163,184,.12);font-size:14px;vertical-align:top}
table th{background:rgba(148,163,184,.08);font-weight:700;color:#e2e8f0;width:38%}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
.badge-success{background:rgba(34,197,94,.16);color:#86efac}
.badge-info{background:rgba(59,130,246,.16);color:#93c5fd}
.footer{text-align:center;margin-top:24px;padding:16px 8px}
.footer p{font-size:12px;color:#94a3b8;line-height:1.7}
.footer a{color:#93c5fd;text-decoration:none}
</style></head>
<body><div class="wrapper"><div class="card">
<div class="logo"><h1>ATLAS</h1><p>${isTr ? "Transactional email" : "Transactional email"}</p></div>
<div class="content">${content}</div>
</div>
<div class="footer">
<p>${isTr ? "Bu e-posta Atlas Platform tarafından gönderilmiştir." : "This email was sent by Atlas Platform."}</p>
<p><a href="${APP_URL}">${safeText(APP_URL.replace(/^https?:\/\//, ""))}</a> · <a href="mailto:${SUPPORT_EMAIL}">${isTr ? "Destek" : "Support"}</a></p>
<p style="margin-top:8px">© ${new Date().getFullYear()} Atlas Global LLC. ${isTr ? "Tüm hakları saklıdır." : "All rights reserved."}</p>
</div></div></body></html>`;
}

function plainFooter(locale: TemplateLocale) {
  return locale === "tr" ? `Atlas Platform` : "Atlas Platform";
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
export function welcomeEmail(
  name: string,
  companyName?: string,
  planTier?: string,
  locale: TemplateLocale = "tr"
): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  const plan = planLabel(planTier);
  const company = companyName ? ` — <strong>${safeText(companyName)}</strong>` : "";

  return {
    subject: isTr ? `Hoş geldiniz, ${name}! Atlas Platform'a başlayın` : `Welcome, ${name}! Get started with Atlas Platform`,
    html: layout(
      isTr ? "Hoş Geldiniz" : "Welcome",
      `
      <h2>${isTr ? "Merhaba" : "Hello"} ${safeText(name)}! 👋</h2>
      <p>${isTr ? "Atlas Platform'a hoş geldiniz" : "Welcome to Atlas Platform"}${company}</p>
      <p>${isTr ? "Planınız aktive edildi." : "Your plan is now active."} ${plan} ${isTr ? "planınızla başladınız." : "plan is ready to go."}</p>
      <div class="info-box">
        <p><strong>${isTr ? "Sonraki Adımlar" : "Next Steps"}:</strong></p>
        <p>1. ${isTr ? "Panele giriş yaparak ürünlerinizi ekleyin" : "Log in and add your products"}</p>
        <p>2. ${isTr ? "İş süreçlerini kontrol edin" : "Review your workstreams"}</p>
        <p>3. ${isTr ? "Destek ekibimizle tanışma görüşmesi planlayın" : "Schedule an intro call with our support team"}</p>
      </div>
      <a href="${APP_URL}/panel/dashboard" class="btn">${isTr ? "Panele Git" : "Go to Dashboard"}</a>
      <p style="font-size:13px;color:#94a3b8">${isTr ? "Herhangi bir sorunuz varsa" : "If you have any questions"} <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> ${isTr ? "adresinden bize ulaşabilirsiniz." : "you can reach us anytime."}</p>
    `,
      locale
    ),
    text: isTr
      ? `Merhaba ${name}!\n\nAtlas Platform'a hoş geldiniz!\n${plan} planınız aktive edildi.\n\n${plainFooter(locale)}: ${APP_URL}/panel/dashboard\nDestek: ${SUPPORT_EMAIL}`
      : `Hello ${name}!\n\nWelcome to Atlas Platform!\nYour ${plan} plan is active.\n\n${plainFooter(locale)}: ${APP_URL}/panel/dashboard\nSupport: ${SUPPORT_EMAIL}`,
  };
}

// ─── Template: Invoice Created ───────────────────────────
export function invoiceCreatedEmail(
  data: { firstName: string; invoiceNumber: string; amount: number; currency?: string; planTier: string; dueDate: string },
  locale: TemplateLocale = "tr"
): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  const cur = data.currency || "USD";
  const amountLabel = formatEmailCurrency(locale, data.amount, cur);
  const dueDateLabel = formatEmailDate(locale, data.dueDate);

  return {
    subject: isTr ? `Yeni faturanız: ${data.invoiceNumber}` : `Your new invoice: ${data.invoiceNumber}`,
    html: layout(
      isTr ? "Yeni Fatura" : "New Invoice",
      `
      <h2>${isTr ? "Yeni Fatura Oluşturuldu" : "A new invoice has been created"}</h2>
      <p>${isTr ? "Merhaba" : "Hello"} ${safeText(data.firstName)}, ${isTr ? "aşağıdaki fatura hesabınıza tanımlanmıştır:" : "the following invoice has been issued to your account:"}</p>
      <table>
        <tr><th>${isTr ? "Fatura No" : "Invoice No"}</th><td>${safeText(data.invoiceNumber)}</td></tr>
        <tr><th>${isTr ? "Plan" : "Plan"}</th><td>${safeText(data.planTier)}</td></tr>
        <tr><th>${isTr ? "Tutar" : "Amount"}</th><td><strong>${amountLabel}</strong></td></tr>
        <tr><th>${isTr ? "Son Ödeme" : "Due Date"}</th><td>${safeText(dueDateLabel)}</td></tr>
      </table>
      <div class="info-box">
        <p><strong>${isTr ? "Ödeme Bilgileri" : "Payment Details"}:</strong></p>
        <p>${isTr ? "Banka" : "Bank"}: JPMorgan Chase Bank</p>
        <p>${isTr ? "Hesap Adı" : "Account Name"}: Atlas Global LLC</p>
        <p>Routing: 021000021</p>
        <p>Account: 9876543210</p>
        <p>${isTr ? "Açıklama" : "Reference"}: ${safeText(data.invoiceNumber)}</p>
      </div>
      <a href="${APP_URL}/panel/billing" class="btn">${isTr ? "Faturayı Görüntüle" : "View Invoice"}</a>
      <p style="font-size:13px;color:#94a3b8">${isTr ? 'Ödemenizi yaptıktan sonra "Ödeme Yaptım" butonuna tıklamayı unutmayın.' : 'After payment, remember to click "I Paid".'}</p>
    `,
      locale
    ),
    text: isTr
      ? `Yeni fatura: ${data.invoiceNumber}\nTutar: ${amountLabel}\nSon ödeme: ${dueDateLabel}\n\n${APP_URL}/panel/billing`
      : `New invoice: ${data.invoiceNumber}\nAmount: ${amountLabel}\nDue date: ${dueDateLabel}\n\n${APP_URL}/panel/billing`,
  };
}

// ─── Template: Invoice Paid Confirmation ─────────────────
export function invoicePaidConfirmationEmail(invoiceNumber: string, locale: TemplateLocale = "tr"): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  return {
    subject: isTr ? `Ödeme bildiriminiz alındı: ${invoiceNumber}` : `Your payment notice was received: ${invoiceNumber}`,
    html: layout(
      isTr ? "Ödeme Bildirimi" : "Payment Notice",
      `
      <h2>${isTr ? "Ödeme Bildiriminiz Alındı" : "Your payment notice has been received"} ✓</h2>
      <p><strong>${safeText(invoiceNumber)}</strong> ${isTr ? "numaralı fatura için ödeme bildiriminiz alınmıştır." : "payment notice for invoice has been received."}</p>
      <p>${isTr ? "Ekibimiz ödemenizi kontrol edecek ve onayladıktan sonra bilgi verecektir." : "Our team will verify the payment and notify you once it is confirmed."}</p>
      <div class="info-box"><p><strong>${isTr ? "Beklenen Süre" : "Expected Time"}:</strong> 1-2 ${isTr ? "iş günü" : "business days"}</p></div>
      <a href="${APP_URL}/panel/billing" class="btn">${isTr ? "Fatura Durumunu Kontrol Et" : "Check Invoice Status"}</a>
    `,
      locale
    ),
    text: isTr
      ? `Ödeme bildiriminiz alındı: ${invoiceNumber}\n1-2 iş günü içinde onaylanacaktır.\n\n${APP_URL}/panel/billing`
      : `Your payment notice was received: ${invoiceNumber}\nIt will be confirmed within 1-2 business days.\n\n${APP_URL}/panel/billing`,
  };
}

// ─── Template: Payment Confirmed ─────────────────────────
export function paymentConfirmedEmail(
  data: { firstName: string; invoiceNumber: string; planTier: string },
  locale: TemplateLocale = "tr"
): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  return {
    subject: isTr ? `Ödemeniz onaylandı! ${data.invoiceNumber}` : `Your payment is confirmed! ${data.invoiceNumber}`,
    html: layout(
      isTr ? "Ödeme Onaylandı" : "Payment Confirmed",
      `
      <h2>${isTr ? "Ödemeniz Onaylandı" : "Your payment is confirmed"} 🎉</h2>
      <p>${isTr ? "Merhaba" : "Hello"} ${safeText(data.firstName)}, <strong>${safeText(data.invoiceNumber)}</strong> ${isTr ? "numaralı faturanızın ödemesi onaylanmıştır." : "payment for your invoice has been confirmed."}</p>
      <p><span class="badge badge-success">${safeText(data.planTier)}</span> ${isTr ? "aboneliğiniz aktif edilmiştir." : "subscription has been activated."}</p>
      <a href="${APP_URL}/panel/dashboard" class="btn">${isTr ? "Panele Git" : "Go to Dashboard"}</a>
    `,
      locale
    ),
    text: isTr
      ? `Ödemeniz onaylandı: ${data.invoiceNumber}\nPlan: ${data.planTier} aktif.\n\n${APP_URL}/panel/dashboard`
      : `Your payment is confirmed: ${data.invoiceNumber}\nPlan: ${data.planTier} is active.\n\n${APP_URL}/panel/dashboard`,
  };
}

// ─── Template: Order Status Update ───────────────────────
export function orderStatusEmail(
  name: string,
  orderId: string,
  status: string,
  trackingRef?: string,
  carrier?: string,
  locale: TemplateLocale = "tr"
): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  const statusMap: Record<string, string> = isTr
    ? {
        received: "Alındı",
        processing: "İşleniyor",
        packing: "Paketleniyor",
        shipped: "Kargoya Verildi",
        delivered: "Teslim Edildi",
        cancelled: "İptal Edildi",
        returned: "İade Edildi",
      }
    : {
        received: "Received",
        processing: "Processing",
        packing: "Packing",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Cancelled",
        returned: "Returned",
      };
  const label = statusMap[status] ?? status;
  return {
    subject: isTr ? `Sipariş #${orderId.slice(0, 8)} — ${label}` : `Order #${orderId.slice(0, 8)} — ${label}`,
    html: layout(
      isTr ? "Sipariş Güncelleme" : "Order Update",
      `
      <h2>${isTr ? "Sipariş Durumu Güncellendi" : "Order status updated"}</h2>
      <p>${isTr ? "Merhaba" : "Hello"} ${safeText(name)},</p>
      <table>
        <tr><th>${isTr ? "Sipariş ID" : "Order ID"}</th><td>${safeText(orderId.slice(0, 8))}...</td></tr>
        <tr><th>${isTr ? "Yeni Durum" : "New Status"}</th><td><span class="badge badge-info">${safeText(label)}</span></td></tr>
        ${trackingRef ? `<tr><th>${isTr ? "Takip No" : "Tracking No"}</th><td>${safeText(trackingRef)}</td></tr>` : ""}
        ${carrier ? `<tr><th>${isTr ? "Kargo" : "Carrier"}</th><td>${safeText(carrier)}</td></tr>` : ""}
      </table>
      <a href="${APP_URL}/panel/orders/${orderId}" class="btn">${isTr ? "Sipariş Detayı" : "View Order"}</a>
    `,
      locale
    ),
    text: isTr
      ? `Sipariş #${orderId.slice(0, 8)} durumu: ${label}\n${trackingRef ? `Takip: ${trackingRef}` : ""}\n\n${APP_URL}/panel/orders/${orderId}`
      : `Order #${orderId.slice(0, 8)} status: ${label}\n${trackingRef ? `Tracking: ${trackingRef}` : ""}\n\n${APP_URL}/panel/orders/${orderId}`,
  };
}

// ─── Template: Password Reset ────────────────────────────
export function passwordResetEmail(resetLink: string, locale: TemplateLocale = "tr"): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  return {
    subject: isTr ? "Şifre Sıfırlama — ATLAS Platform" : "Password Reset — ATLAS Platform",
    html: layout(
      isTr ? "Şifre Sıfırlama" : "Password Reset",
      `
      <h2>${isTr ? "Şifre Sıfırlama" : "Password Reset"}</h2>
      <p>${isTr ? "Hesabınız için bir şifre sıfırlama talebi aldık." : "We received a password reset request for your account."}</p>
      <a href="${resetLink}" class="btn">${isTr ? "Şifremi Sıfırla" : "Reset My Password"}</a>
      <div class="warning-box">
        <p>${isTr ? "Bu bağlantı" : "This link is valid for"} <strong>1 ${isTr ? "saat" : "hour"}</strong> ${isTr ? "boyunca geçerlidir." : "."}</p>
        <p>${isTr ? "Bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz." : "If you didn't request this, you can ignore this email."}</p>
      </div>
    `,
      locale
    ),
    text: isTr
      ? `Şifrenizi sıfırlamak için: ${resetLink}\n\nBu bağlantı 1 saat boyunca geçerlidir.`
      : `Reset your password: ${resetLink}\n\nThis link is valid for 1 hour.`,
  };
}

// ─── Template: Invitation ────────────────────────────────
export function invitationEmail(planTier: string, token: string, locale: TemplateLocale = "tr"): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  const registerUrl = `${APP_URL}/register?invitation=${token}`;
  return {
    subject: isTr ? "Atlas Platform'a davet edildiniz!" : "You are invited to Atlas Platform!",
    html: layout(
      isTr ? "Davet" : "Invitation",
      `
      <h2>${isTr ? "Atlas Platform'a Davet Edildiniz!" : "You are invited to Atlas Platform!"} 🎉</h2>
      <p>${isTr ? "ABD'ye açılma yolculuğunuzda size yardımcı olmak için heyecanlıyız." : "We're excited to help with your US expansion journey."}</p>
      <p>${isTr ? "Sizin için" : "A"} <span class="badge badge-info">${safeText(planTier)}</span> ${isTr ? "planı hazırlandı." : "plan has been prepared for you."}</p>
      <a href="${registerUrl}" class="btn">${isTr ? "Hesap Oluştur" : "Create Account"}</a>
      <div class="info-box"><p>${isTr ? "Bu davet bağlantısı 7 gün boyunca geçerlidir." : "This invitation link is valid for 7 days."}</p></div>
    `,
      locale
    ),
    text: isTr
      ? `Atlas Platform'a davet edildiniz!\nPlan: ${planTier}\n\nKayıt: ${registerUrl}\n\nBu davet 7 gün boyunca geçerlidir.`
      : `You are invited to Atlas Platform!\nPlan: ${planTier}\n\nRegister: ${registerUrl}\n\nThis invitation is valid for 7 days.`,
  };
}

// ─── Template: Ticket Update ─────────────────────────────
export function ticketUpdateEmail(
  data: { ticketSubject: string; status: string; adminResponse?: string },
  locale: TemplateLocale = "tr"
): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  const statusMap: Record<string, string> = isTr
    ? { open: "Açık", investigating: "İnceleniyor", waiting_customer: "Müşteri Yanıtı Bekleniyor", resolved: "Çözüldü", closed: "Kapatıldı" }
    : { open: "Open", investigating: "Investigating", waiting_customer: "Waiting on Customer", resolved: "Resolved", closed: "Closed" };
  const statusLabel = statusMap[data.status] || data.status;
  return {
    subject: isTr ? `Destek talebi güncellendi: ${data.ticketSubject}` : `Support request updated: ${data.ticketSubject}`,
    html: layout(
      isTr ? "Destek Güncelleme" : "Support Update",
      `
      <h2>${isTr ? "Destek Talebi Güncellendi" : "Support request updated"}</h2>
      <p><strong>${isTr ? "Konu" : "Subject"}:</strong> ${safeText(data.ticketSubject)}</p>
      <p><strong>${isTr ? "Durum" : "Status"}:</strong> <span class="badge badge-info">${safeText(statusLabel)}</span></p>
      ${data.adminResponse ? `<div class="info-box"><p><strong>${isTr ? "Ekip Yanıtı" : "Team response"}:</strong></p><p>${safeText(data.adminResponse)}</p></div>` : ""}
      <a href="${APP_URL}/panel/support" class="btn">${isTr ? "Talepleri Görüntüle" : "View Requests"}</a>
    `,
      locale
    ),
    text: isTr
      ? `Destek talebi: ${data.ticketSubject}\nDurum: ${statusLabel}\n${data.adminResponse ? `Yanıt: ${data.adminResponse}` : ""}\n\n${APP_URL}/panel/support`
      : `Support request: ${data.ticketSubject}\nStatus: ${statusLabel}\n${data.adminResponse ? `Response: ${data.adminResponse}` : ""}\n\n${APP_URL}/panel/support`,
  };
}

// ─── Template: Subscription Expiring ─────────────────────
export function subscriptionExpiringEmail(
  data: { firstName: string; planTier: string; expiresAt: string; daysLeft: number },
  locale: TemplateLocale = "tr"
): Pick<EmailPayload, "subject" | "html" | "text"> {
  const isTr = locale === "tr";
  return {
    subject: isTr ? `Aboneliğiniz ${data.daysLeft} gün içinde sona eriyor` : `Your subscription expires in ${data.daysLeft} days`,
    html: layout(
      isTr ? "Abonelik Uyarısı" : "Subscription Reminder",
      `
      <h2>${isTr ? "Abonelik Yenileme Hatırlatması" : "Subscription renewal reminder"}</h2>
      <p>${isTr ? "Merhaba" : "Hello"} ${safeText(data.firstName)}, <strong>${safeText(data.planTier)}</strong> ${isTr ? "planınız" : "plan"} <strong>${safeText(data.expiresAt)}</strong> ${isTr ? "tarihinde sona erecektir." : "will expire on this date."}</p>
      <div class="warning-box">
        <p><strong>${formatEmailNumber(locale, data.daysLeft)} ${isTr ? "gün" : "days"}</strong> ${isTr ? "kaldı! Hizmetlerinizin kesintisiz devam etmesi için lütfen ödemenizi yapın." : "left! Please renew to keep your services running without interruption."}</p>
      </div>
      <a href="${APP_URL}/panel/billing" class="btn">${isTr ? "Yenileme İçin Tıklayın" : "Click to Renew"}</a>
      <p style="font-size:13px;color:#94a3b8">${isTr ? "Sorularınız için" : "If you have questions, contact"} <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>${isTr ? " adresine yazabilirsiniz." : "."}</p>
    `,
      locale
    ),
    text: isTr
      ? `Merhaba ${data.firstName},\n${data.planTier} planınız ${data.expiresAt} tarihinde sona erecek.\n${data.daysLeft} gün kaldı!\n\n${APP_URL}/panel/billing`
      : `Hello ${data.firstName},\nYour ${data.planTier} plan will expire on ${data.expiresAt}.\n${data.daysLeft} days left!\n\n${APP_URL}/panel/billing`,
  };
}

// ─── Convenience Send Functions ──────────────────────────
export async function sendWelcomeEmail(to: string, name: string, companyName?: string, planTier?: string, locale: TemplateLocale = "tr") {
  const tpl = welcomeEmail(name, companyName, planTier, locale);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "welcome" }] });
}

export async function sendInvoiceEmail(
  to: string,
  data: { firstName: string; invoiceNumber: string; amount: number; currency?: string; planTier: string; dueDate: string },
  locale: TemplateLocale = "tr"
) {
  const tpl = invoiceCreatedEmail(data, locale);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "invoice_created" }] });
}

export async function sendPaymentConfirmedEmail(to: string, data: { firstName: string; invoiceNumber: string; planTier: string }, locale: TemplateLocale = "tr") {
  const tpl = paymentConfirmedEmail(data, locale);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "payment_confirmed" }] });
}

export async function sendOrderUpdateEmail(to: string, name: string, orderId: string, status: string, trackingRef?: string, carrier?: string, locale: TemplateLocale = "tr") {
  const tpl = orderStatusEmail(name, orderId, status, trackingRef, carrier, locale);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "order_status" }] });
}

export async function sendInvitationEmail(to: string, planTier: string, token: string, locale: TemplateLocale = "tr") {
  const tpl = invitationEmail(planTier, token, locale);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "invitation" }] });
}

export async function sendTicketUpdateEmail(to: string, data: { ticketSubject: string; status: string; adminResponse?: string }, locale: TemplateLocale = "tr") {
  const tpl = ticketUpdateEmail(data, locale);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "ticket_update" }] });
}

export async function sendSubscriptionExpiringEmail(
  to: string,
  data: { firstName: string; planTier: string; expiresAt: string; daysLeft: number },
  locale: TemplateLocale = "tr"
) {
  const tpl = subscriptionExpiringEmail(data, locale);
  return sendEmail({ to, ...tpl, tags: [{ name: "template", value: "subscription_expiring" }] });
}
