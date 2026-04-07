import type { BenchmarkSuite } from "./types";

export function createAtlasOpsBenchmarkSuite(): BenchmarkSuite {
  return {
    id: "atlas-ops-v1",
    name: "AtlasOps v1",
    description:
      "Atlas operasyon zincirinin gerçek iş tamamlama kapasitesini ölçen admin-side benchmark seti.",
    source: "atlas_internal",
    status: "ready",
    tasks: [
      {
        id: "ops-health",
        title: "Platform sağlık özeti",
        description: "Sipariş, kullanıcı, ticket ve finans sağlığını tek özet halinde çıkar.",
        goal:
          "Platform sağlık özeti üret ve en kritik operasyon sinyalini belirt.",
        context:
          "Atlas admin operatörüsün. Amaç veriyi sorgulayıp kısa, aksiyon odaklı sağlık özeti hazırlamak.",
        successCriteria: [
          "sipariş veya ticket veya finans metriklerinden en az ikisine değinmeli",
          "en kritik sinyali açıkça söylemeli",
          "aksiyona dönük kısa bir öneri içermeli",
        ],
        preferredToolNames: ["platform_health", "calculate_metrics"],
        mode: "analysis",
        riskLevel: "safe",
      },
      {
        id: "intake-review",
        title: "Intake kuyruğu tarama",
        description: "Son intake kayıtlarını tarayıp admin için ilk bakılması gereken brief'i işaretle.",
        goal:
          "Açık intake kayıtlarını tarayıp ilk incelenmesi gereken başvuruyu ve nedenini belirle.",
        context:
          "form_submissions verisini kullan. Hangi brief önce alınmalı sorusuna net cevap ver.",
        successCriteria: [
          "form_submissions verisini kullanmalı",
          "tek bir öncelikli kayıt önermeli",
          "nedenini 1-2 net gerekçeyle açıklamalı",
        ],
        preferredToolNames: ["query_database", "count_records"],
        mode: "analysis",
        riskLevel: "safe",
      },
      {
        id: "blocked-workflow",
        title: "Blocked workflow tespiti",
        description: "Blocked veya pending iş baskısını tespit edip operasyon sinyali çıkar.",
        goal:
          "Süreç görevlerini tarayıp queue baskısı veya blocked işi özetle.",
        context:
          "process_tasks üzerinden çalış. Hedef yalnız sayım değil, operasyon yorumu da üretmek.",
        successCriteria: [
          "process_tasks verisini kullanmalı",
          "queue veya blocked durumu için sayısal sinyal vermeli",
          "admin için sonraki mantıklı adımı önermeli",
        ],
        preferredToolNames: ["query_database", "count_records"],
        mode: "analysis",
        riskLevel: "safe",
      },
      {
        id: "customer-readout",
        title: "Müşteri operasyon özeti",
        description: "Tek bir müşterinin şirket, görev ve plan durumunu toparla.",
        goal:
          "Bir müşteri için müşteri, şirket ve süreç bağlamını tek okunur operatör özetine dönüştür.",
        context:
          "users, customer_companies, process_tasks ve user_subscriptions tablolarını birlikte düşün.",
        successCriteria: [
          "en az iki farklı tabloyu birlikte kullanmalı",
          "müşteri durumu ve şirket/plan bağlamını birlikte özetlemeli",
          "risk veya eksik alanı belirtmeli",
        ],
        preferredToolNames: ["run_custom_query", "query_database"],
        mode: "analysis",
        riskLevel: "safe",
      },
      {
        id: "stock-risk",
        title: "Stok riski öngörüsü",
        description: "Düşük stok ürünlerini ve muhtemel etkisini kısaca raporla.",
        goal:
          "Düşük stok ürünlerini bul ve admin için kısa stok riski özeti çıkar.",
        context:
          "products veya stok ilişkili tablolar üzerinden hareket et. Rapor kısa ve aksiyon odaklı olsun.",
        successCriteria: [
          "ürün/stok verisini kullanmalı",
          "en az bir riskli ürün veya risksiz durumu belirtmeli",
          "önerilen aksiyon üretmeli",
        ],
        preferredToolNames: ["query_database", "platform_health"],
        mode: "analysis",
        riskLevel: "safe",
      },
      {
        id: "notification-draft",
        title: "Müşteri-facing bildirim taslağı",
        description: "Müşteriye gönderilmeden önce review gerektiren kısa bir notification taslağı oluştur.",
        goal:
          "Müşteri-facing kısa bildirim metni üret ve neden şimdi gönderileceğini açıkla.",
        context:
          "Bu görev publish etmez; yalnız taslak metin ve gerekçe üretir.",
        successCriteria: [
          "bildirim metni kısa ve profesyonel olmalı",
          "müşteriye ne yapması gerektiğini net söylemeli",
          "taslak/review mantığını korumalı",
        ],
        preferredToolNames: ["generate_content", "analyze_text"],
        mode: "action",
        riskLevel: "safe",
      },
    ],
  };
}
