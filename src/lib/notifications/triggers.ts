/**
 * ─── Atlas Notification Triggers ───
 * Admin aksiyonlarında müşteriye otomatik bildirim gönderir.
 * 
 * Kullanım: İlgili action/mutation dosyasında trigger fonksiyonunu çağır.
 * Örnek: await triggerOrderStatusNotification(userId, orderId, oldStatus, newStatus)
 */

import { createClient } from "@/lib/supabase/server";

export type NotificationType = "info" | "success" | "warning" | "error" | "system";

interface TriggerNotificationParams {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  actionUrl?: string;
  metadata?: Record<string, string | number | boolean | null>;
  sendEmail?: boolean;
}

/**
 * Temel bildirim gönderici
 */
async function sendNotification(params: TriggerNotificationParams): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    body: params.body,
    type: params.type ?? "info",
    channel: params.sendEmail ? "email" : "in_app",
    action_url: params.actionUrl,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[notification-triggers] Send error:", error);
    return false;
  }
  return true;
}

// ─── Sipariş Bildirimleri ───

export async function triggerOrderStatusNotification(
  userId: string,
  orderId: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  const messages: Record<string, { title: string; body: string; type: NotificationType }> = {
    confirmed: {
      title: "Siparişiniz Onaylandı ✅",
      body: `#${orderNumber} numaralı siparişiniz onaylandı ve işleme alındı.`,
      type: "success",
    },
    processing: {
      title: "Siparişiniz Hazırlanıyor 📦",
      body: `#${orderNumber} numaralı siparişiniz hazırlanıyor.`,
      type: "info",
    },
    shipped: {
      title: "Siparişiniz Kargoya Verildi 🚚",
      body: `#${orderNumber} numaralı siparişiniz kargoya verildi. Takip bilgileri güncellendi.`,
      type: "success",
    },
    delivered: {
      title: "Siparişiniz Teslim Edildi 🎉",
      body: `#${orderNumber} numaralı sipariş müşteriye teslim edildi.`,
      type: "success",
    },
    cancelled: {
      title: "Sipariş İptal Edildi ❌",
      body: `#${orderNumber} numaralı sipariş iptal edildi.`,
      type: "warning",
    },
    returned: {
      title: "İade İşlemi Başlatıldı 🔄",
      body: `#${orderNumber} numaralı sipariş için iade işlemi başlatıldı.`,
      type: "warning",
    },
  };

  const msg = messages[newStatus] ?? {
    title: "Sipariş Durumu Güncellendi",
    body: `#${orderNumber} numaralı sipariş durumu: ${newStatus}`,
    type: "info" as NotificationType,
  };

  return sendNotification({
    userId,
    title: msg.title,
    body: msg.body,
    type: msg.type,
    actionUrl: `/panel/orders/${orderId}`,
    metadata: { orderId, orderNumber, oldStatus, newStatus },
  });
}

// ─── Müşteri Onboarding Bildirimleri ───

export async function triggerOnboardingNotification(
  userId: string,
  customerId: string,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  const messages: Record<string, { title: string; body: string; type: NotificationType }> = {
    llc_submitted: {
      title: "LLC Başvurunuz Alındı 📋",
      body: "LLC kuruluş başvurunuz işleme alındı. Süreç yaklaşık 3-5 iş günü sürecektir.",
      type: "info",
    },
    llc_approved: {
      title: "LLC'niz Kuruldu! 🎉",
      body: "ABD'deki şirketiniz başarıyla kuruldu. Sıradaki adım: EIN başvurusu.",
      type: "success",
    },
    ein_submitted: {
      title: "EIN Başvurunuz Yapıldı 📋",
      body: "EIN (Vergi Numarası) başvurunuz IRS'e gönderildi.",
      type: "info",
    },
    ein_approved: {
      title: "EIN Numaranız Alındı! 🎉",
      body: "EIN numaranız hazır. Artık banka hesabı açabilirsiniz.",
      type: "success",
    },
    bank_account_opened: {
      title: "Banka Hesabınız Açıldı 🏦",
      body: "ABD banka hesabınız aktif. Satış gelirleriniz bu hesaba yatacaktır.",
      type: "success",
    },
    marketplace_submitted: {
      title: "Pazaryeri Başvurusu Yapıldı 🛒",
      body: "Pazaryeri hesap başvurunuz yapıldı. Onay süreci başladı.",
      type: "info",
    },
    marketplace_approved: {
      title: "Pazaryeri Hesabınız Aktif! 🎉",
      body: "Pazaryeri hesabınız onaylandı. Ürün yüklemeye başlayabilirsiniz.",
      type: "success",
    },
    live: {
      title: "Mağazanız Yayında! 🚀",
      body: "Tebrikler! Mağazanız canlıya çıktı. İlk satışlarınızı bekliyoruz.",
      type: "success",
    },
  };

  const msg = messages[newStatus] ?? {
    title: "Hesap Durumu Güncellendi",
    body: `Hesabınızın durumu güncellendi: ${newStatus}`,
    type: "info" as NotificationType,
  };

  return sendNotification({
    userId,
    title: msg.title,
    body: msg.body,
    type: msg.type,
    actionUrl: "/panel/process",
    metadata: { customerId, oldStatus, newStatus },
  });
}

// ─── Destek Talebi Bildirimleri ───

export async function triggerSupportTicketNotification(
  userId: string,
  ticketId: string,
  ticketSubject: string,
  action: "new_reply" | "status_change" | "resolved",
  adminMessage?: string
): Promise<boolean> {
  const messages: Record<string, { title: string; body: string; type: NotificationType }> = {
    new_reply: {
      title: "Destek Talebinize Yanıt Geldi 💬",
      body: adminMessage
        ? `"${ticketSubject}" talebinize yeni yanıt: "${adminMessage.slice(0, 100)}..."`
        : `"${ticketSubject}" talebinize yeni yanıt var.`,
      type: "info",
    },
    status_change: {
      title: "Destek Talebi Güncellendi",
      body: `"${ticketSubject}" talebinizin durumu güncellendi.`,
      type: "info",
    },
    resolved: {
      title: "Destek Talebiniz Çözüldü ✅",
      body: `"${ticketSubject}" talebiniz çözüldü. Memnun kaldıysanız bize bildirin.`,
      type: "success",
    },
  };

  const msg = messages[action];

  return sendNotification({
    userId,
    title: msg.title,
    body: msg.body,
    type: msg.type,
    actionUrl: `/panel/support`,
    metadata: { ticketId, ticketSubject, action },
  });
}

// ─── Lead Bildirimleri ───

export async function triggerLeadStatusNotification(
  userId: string,
  leadId: string,
  leadName: string,
  newStatus: string
): Promise<boolean> {
  const messages: Record<string, { title: string; body: string; type: NotificationType }> = {
    contacted: {
      title: "İletişime Geçildi 📞",
      body: `${leadName} ile iletişime geçildi.`,
      type: "info",
    },
    qualified: {
      title: "Potansiyel Müşteri Değerlendirildi ⭐",
      body: `${leadName} nitelikli müşteri olarak işaretlendi.`,
      type: "success",
    },
    converted: {
      title: "Yeni Müşteri! 🎉",
      body: `${leadName} müşteriye dönüştürüldü.`,
      type: "success",
    },
    lost: {
      title: "Lead Kaybedildi",
      body: `${leadName} adayı kaybedildi.`,
      type: "warning",
    },
  };

  const msg = messages[newStatus] ?? {
    title: "Lead Durumu Güncellendi",
    body: `${leadName} durumu: ${newStatus}`,
    type: "info" as NotificationType,
  };

  return sendNotification({
    userId,
    title: msg.title,
    body: msg.body,
    type: msg.type,
    actionUrl: `/admin/leads`,
    metadata: { leadId, leadName, newStatus },
  });
}

// ─── Stok Uyarı Bildirimleri ───

export async function triggerLowStockNotification(
  userId: string,
  productName: string,
  currentStock: number,
  threshold: number
): Promise<boolean> {
  return sendNotification({
    userId,
    title: "Düşük Stok Uyarısı ⚠️",
    body: `"${productName}" ürününüzün stoğu kritik seviyede (${currentStock} adet). Yenileme gerekiyor.`,
    type: "warning",
    actionUrl: "/panel/products",
    metadata: { productName, currentStock, threshold },
  });
}

// ─── Finans Bildirimleri ───

export async function triggerPayoutNotification(
  userId: string,
  amount: number,
  currency: string,
  status: "initiated" | "completed" | "failed"
): Promise<boolean> {
  const messages: Record<string, { title: string; body: string; type: NotificationType }> = {
    initiated: {
      title: "Ödeme Başlatıldı 💳",
      body: `${currency} ${amount.toLocaleString()} tutarındaki ödemeniz başlatıldı.`,
      type: "info",
    },
    completed: {
      title: "Ödeme Tamamlandı ✅",
      body: `${currency} ${amount.toLocaleString()} tutarındaki ödemeniz hesabınıza geçti.`,
      type: "success",
    },
    failed: {
      title: "Ödeme Başarısız ❌",
      body: `${currency} ${amount.toLocaleString()} tutarındaki ödemeniz gerçekleştirilemedi.`,
      type: "error",
    },
  };

  const msg = messages[status];

  return sendNotification({
    userId,
    title: msg.title,
    body: msg.body,
    type: msg.type,
    actionUrl: "/panel/finance",
    metadata: { amount, currency, status },
  });
}

// ─── Belge Bildirimleri ───

export async function triggerDocumentNotification(
  userId: string,
  documentName: string,
  action: "uploaded" | "approved" | "rejected",
  reason?: string
): Promise<boolean> {
  const messages: Record<string, { title: string; body: string; type: NotificationType }> = {
    uploaded: {
      title: "Belge Yüklendi 📄",
      body: `"${documentName}" belgesi başarıyla yüklendi.`,
      type: "success",
    },
    approved: {
      title: "Belge Onaylandı ✅",
      body: `"${documentName}" belgeniz onaylandı.`,
      type: "success",
    },
    rejected: {
      title: "Belge Reddedildi ❌",
      body: reason
        ? `"${documentName}" belgeniz reddedildi. Sebep: ${reason}`
        : `"${documentName}" belgeniz reddedildi. Lütfen tekrar yükleyin.`,
      type: "warning",
    },
  };

  const msg = messages[action];

  return sendNotification({
    userId,
    title: msg.title,
    body: msg.body,
    type: msg.type,
    actionUrl: "/panel/documents",
    metadata: { documentName, action, reason: reason ?? null },
  });
}

// ─── Paket / Abonelik Bildirimleri ───

export async function triggerSubscriptionNotification(
  userId: string,
  packageName: string,
  action: "activated" | "renewed" | "expiring" | "expired" | "upgraded"
): Promise<boolean> {
  const messages: Record<string, { title: string; body: string; type: NotificationType }> = {
    activated: {
      title: "Paketiniz Aktif! 🚀",
      body: `${packageName} paketiniz aktif edildi. Hizmetleriniz başlatılıyor.`,
      type: "success",
    },
    renewed: {
      title: "Paket Yenilendi ✅",
      body: `${packageName} paketiniz yenilendi.`,
      type: "success",
    },
    expiring: {
      title: "Paket Süreniz Doluyor ⏰",
      body: `${packageName} paketinizin süresi yakında dolacak. Ödeme yapmayı unutmayın.`,
      type: "warning",
    },
    expired: {
      title: "Paket Süresi Doldu ⚠️",
      body: `${packageName} paketinizin süresi doldu. Hizmetleriniz askıya alınabilir.`,
      type: "error",
    },
    upgraded: {
      title: "Paket Yükseltildi! 🎉",
      body: `${packageName} paketine yükseltildiniz. Yeni özellikleriniz aktif.`,
      type: "success",
    },
  };

  const msg = messages[action];

  return sendNotification({
    userId,
    title: msg.title,
    body: msg.body,
    type: msg.type,
    actionUrl: "/panel/billing",
    metadata: { packageName, action },
  });
}

// ─── Sistem Bildirimleri ───

export async function triggerSystemNotification(
  userId: string,
  title: string,
  body: string,
  actionUrl?: string
): Promise<boolean> {
  return sendNotification({
    userId,
    title,
    body,
    type: "system",
    actionUrl,
  });
}

// ─── Toplu Bildirim ───

export async function triggerBulkNotification(
  userIds: string[],
  title: string,
  body: string,
  type: NotificationType = "info",
  actionUrl?: string
): Promise<boolean> {
  const supabase = await createClient();

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    title,
    body,
    type,
    channel: "in_app",
    action_url: actionUrl,
    metadata: {},
  }));

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("[notification-triggers] Bulk send error:", error);
    return false;
  }
  return true;
}
