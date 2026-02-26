/**
 * Anticipatory Intelligence Engine
 *
 * CTO Raporu Bölüm 8: Kullanıcı davranışlarını analiz ederek
 * proaktif öneriler sunar. "Ambient UX" konseptinin AI karşılığı.
 *
 * Özellikler:
 *   - Kullanıcı rutin analizi (login saatleri, sık kullanılan sayfalar)
 *   - Stok tükenme tahmini
 *   - Süreç tamamlanma tahmini
 *   - Akıllı bildirim zamanlaması
 *   - Kişiselleştirilmiş dashboard önerileri
 */

// ─── Types ───

export interface UserRoutine {
  userId: string;
  loginPattern: {
    preferredHours: number[];    // Saat bazında login dağılımı
    avgSessionMinutes: number;
    peakDay: string;             // En aktif gün
  };
  frequentPages: string[];       // En çok ziyaret edilen sayfalar
  lastActions: string[];         // Son 10 aksiyon
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export type RecommendationType =
  | "low_stock_warning"
  | "task_completion_reminder"
  | "order_follow_up"
  | "document_expiry"
  | "optimization_tip"
  | "seasonal_trend"
  | "cost_saving";

// ─── Stok Tükenme Tahmini ───

interface StockPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  dailyBurnRate: number;
  daysUntilEmpty: number;
  warehouse: "turkey" | "us";
}

/**
 * Basit doğrusal stok tükenme tahmini
 * İleride ML modeli ile değiştirilecek
 */
export function predictStockDepletion(
  currentStock: number,
  salesLast30Days: number
): { daysUntilEmpty: number; dailyBurnRate: number } {
  const dailyBurnRate = salesLast30Days / 30;

  if (dailyBurnRate === 0) {
    return { daysUntilEmpty: Infinity, dailyBurnRate: 0 };
  }

  return {
    daysUntilEmpty: Math.floor(currentStock / dailyBurnRate),
    dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
  };
}

// ─── Süreç Tamamlanma Tahmini ───

/**
 * Süreç görevlerinin tamamlanma yüzdesini ve tahmini bitiş süresini hesapla
 */
export function estimateProcessCompletion(
  totalTasks: number,
  completedTasks: number,
  avgDaysPerTask: number
): { completionPercent: number; estimatedDaysRemaining: number } {
  if (totalTasks === 0) {
    return { completionPercent: 100, estimatedDaysRemaining: 0 };
  }

  const completionPercent = Math.round((completedTasks / totalTasks) * 100);
  const remainingTasks = totalTasks - completedTasks;
  const estimatedDaysRemaining = Math.ceil(remainingTasks * avgDaysPerTask);

  return { completionPercent, estimatedDaysRemaining };
}

// ─── Öneri Motoru ───

/**
 * Stok durumuna göre öneriler oluştur
 */
export function generateStockRecommendations(
  predictions: StockPrediction[]
): Recommendation[] {
  return predictions
    .filter((p) => p.daysUntilEmpty < 14)
    .map((p) => ({
      id: `stock-${p.productId}-${p.warehouse}`,
      type: "low_stock_warning" as const,
      title: `${p.productName} stoku azalıyor`,
      description: `${p.warehouse === "turkey" ? "Türkiye" : "ABD"} deposunda ${p.currentStock} adet kaldı. Tahmini ${p.daysUntilEmpty} gün içinde tükenecek.`,
      priority: p.daysUntilEmpty < 3 ? ("urgent" as const) : p.daysUntilEmpty < 7 ? ("high" as const) : ("medium" as const),
      actionUrl: "/dashboard/products",
      actionLabel: "Stok Yönetimine Git",
      metadata: {
        productId: p.productId,
        warehouse: p.warehouse,
        daysUntilEmpty: p.daysUntilEmpty,
        dailyBurnRate: p.dailyBurnRate,
      },
    }));
}

/**
 * Süreç durumuna göre görev hatırlatması oluştur
 */
export function generateTaskReminders(
  tasks: { id: string; name: string; status: string; category: string }[]
): Recommendation[] {
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  const recommendations: Recommendation[] = [];

  for (const task of blockedTasks) {
    recommendations.push({
      id: `task-blocked-${task.id}`,
      type: "task_completion_reminder",
      title: `${task.name} görevi engellendi`,
      description: `${task.category} kategorisindeki görev bloke durumda. Lütfen gerekli aksiyonu alın.`,
      priority: "high",
      actionUrl: "/dashboard/process",
      actionLabel: "Sürece Git",
    });
  }

  for (const task of inProgressTasks) {
    recommendations.push({
      id: `task-progress-${task.id}`,
      type: "task_completion_reminder",
      title: `${task.name} devam ediyor`,
      description: `${task.category} kategorisindeki görev hâlâ devam ediyor. Güncel durumu kontrol edin.`,
      priority: "medium",
      actionUrl: "/dashboard/process",
      actionLabel: "Durumu Kontrol Et",
    });
  }

  return recommendations;
}

// ─── Bildirim Zamanlaması ───

/**
 * Kullanıcının aktif olduğu saatlerde bildirim gönder
 * Rahatsız etmeme prensibi (Do Not Disturb)
 */
export function shouldNotifyNow(
  preferredHours: number[],
  currentHour: number = new Date().getHours()
): boolean {
  // Kullanıcının aktif saatleri dışında bildirim gönderme
  if (preferredHours.length === 0) {
    // Varsayılan: 09:00-18:00 arası
    return currentHour >= 9 && currentHour <= 18;
  }

  return preferredHours.includes(currentHour);
}

// ─── Maliyet Optimizasyonu Önerileri ───

/**
 * Basit maliyet optimizasyonu analizi
 */
export function generateCostSavingTips(
  monthlyOrders: number,
  avgShippingCost: number,
  usWarehouseUsage: number // 0-100 yüzde
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Toplu gönderim önerisi
  if (monthlyOrders > 50 && avgShippingCost > 15) {
    recommendations.push({
      id: "cost-bulk-shipping",
      type: "cost_saving",
      title: "Toplu gönderim ile tasarruf edin",
      description: `Aylık ${monthlyOrders} sipariş ile toplu gönderim anlaşması yaparak kargo maliyetinizi %15-25 düşürebilirsiniz.`,
      priority: "medium",
      actionLabel: "Detayları Gör",
    });
  }

  // US depo kullanım önerisi
  if (usWarehouseUsage < 30 && monthlyOrders > 20) {
    recommendations.push({
      id: "cost-us-warehouse",
      type: "optimization_tip",
      title: "ABD deposunu daha verimli kullanın",
      description: `ABD depo kullanım oranınız %${usWarehouseUsage}. Daha fazla ürün stoklayarak teslimat sürelerini kısaltabilir ve müşteri memnuniyetini artırabilirsiniz.`,
      priority: "low",
      actionUrl: "/dashboard/products",
      actionLabel: "Depo Yönetimi",
    });
  }

  return recommendations;
}
