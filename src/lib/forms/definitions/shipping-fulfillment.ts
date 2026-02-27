// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Gönderim & Lojistik (ATL-2xx)
// =============================================================================

import type { FormDefinition } from "../types";

export const shippingFulfillmentForms: FormDefinition[] = [
  // ─── ATL-201: Ürün Gönderim Talebi ───
  {
    code: "ATL-201",
    title: "Ürün Gönderim Talebi",
    description: "Türkiye'den ABD deposuna ürün göndermek için talep formu.",
    instructions: "Ürünlerinizi ABD depomuz adresine göndermek için bu formu doldurun. Gönderiminiz için en uygun kargo seçeneğini belirleyeceğiz.",
    category: "shipping-fulfillment",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Gönderim Bilgileri",
        fields: [
          { name: "shipment_type", label: "Gönderim Tipi", type: "radio", required: true, options: [{ value: "air", label: "Hava Kargo" }, { value: "sea", label: "Deniz Kargo" }, { value: "express", label: "Express (DHL/FedEx)" }] },
          { name: "origin_city", label: "Çıkış Şehri (Türkiye)", type: "text", required: true, placeholder: "Örn: İstanbul" },
          { name: "package_count", label: "Paket/Koli Sayısı", type: "number", required: true },
          { name: "total_weight_kg", label: "Toplam Ağırlık (kg)", type: "number", required: true },
          { name: "dimensions", label: "Boyutlar (en x boy x yükseklik cm)", type: "text", placeholder: "Örn: 40x30x30", required: false },
          { name: "estimated_value_usd", label: "Tahmini Mal Değeri ($)", type: "currency", required: true },
        ],
      },
      {
        title: "Ürün Detayları",
        fields: [
          { name: "product_description", label: "Ürün Açıklaması", type: "textarea", required: true, placeholder: "Gönderilecek ürünlerin detaylı açıklaması" },
          { name: "hs_codes", label: "HS (Gümrük Tarife) Kodları", type: "text", required: false, helpText: "Bilmiyorsanız boş bırakabilirsiniz, biz belirleriz" },
          { name: "contains_battery", label: "Pil/batarya içeriyor mu?", type: "radio", required: true, options: [{ value: "yes", label: "Evet" }, { value: "no", label: "Hayır" }] },
          { name: "is_fragile", label: "Kırılacak ürün var mı?", type: "radio", required: true, options: [{ value: "yes", label: "Evet" }, { value: "no", label: "Hayır" }] },
          { name: "special_instructions", label: "Özel Talimatlar", type: "textarea", placeholder: "Depolama, etiketleme veya gönderimle ilgili özel talepler" },
        ],
      },
      {
        title: "Gümrük & Belgeler",
        fields: [
          { name: "commercial_invoice", label: "Ticari Fatura (Commercial Invoice)", type: "file" },
          { name: "packing_list", label: "Ambalaj Listesi (Packing List)", type: "file" },
          { name: "additional_docs", label: "Ek Belgeler", type: "file" },
        ],
      },
    ],
  },

  // ─── ATL-202: Depo Stok Transferi ───
  {
    code: "ATL-202",
    title: "Depo İçi Stok Transferi",
    description: "ABD deposundaki ürünler arasında transfer veya FBA'ya gönderim talebi.",
    category: "shipping-fulfillment",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Transfer Detayları",
        fields: [
          { name: "transfer_type", label: "Transfer Tipi", type: "select", required: true, options: [{ value: "internal", label: "Depo içi transfer" }, { value: "fba", label: "Amazon FBA'ya gönderim" }, { value: "fbm", label: "Amazon FBM hazırlık" }, { value: "other_marketplace", label: "Diğer pazaryeri" }] },
          { name: "sku_list", label: "Ürün SKU Listesi ve Adetler", type: "textarea", required: true, placeholder: "Her satıra bir SKU ve adet yazın:\nSKU-001: 50 adet\nSKU-002: 30 adet" },
          { name: "fba_shipment_id", label: "FBA Shipment ID", type: "text", showWhen: { field: "transfer_type", value: "fba" }, helpText: "Amazon Seller Central'dan alınan shipment ID" },
          { name: "destination_address", label: "Hedef Adres", type: "textarea", showWhen: { field: "transfer_type", value: ["other_marketplace"] } },
          { name: "labeling_needed", label: "FNSKU Etiketleme gerekli mi?", type: "radio", options: [{ value: "yes", label: "Evet" }, { value: "no", label: "Hayır" }], showWhen: { field: "transfer_type", value: "fba" } },
          { name: "preferred_date", label: "Tercih Edilen Gönderim Tarihi", type: "date" },
          { name: "priority", label: "Öncelik", type: "select", required: true, options: [{ value: "normal", label: "Normal (3-5 iş günü)" }, { value: "urgent", label: "Acil (1-2 iş günü)" }] },
        ],
      },
    ],
  },

  // ─── ATL-203: Sipariş Karşılama ───
  {
    code: "ATL-203",
    title: "Özel Sipariş Karşılama (Fulfillment) Talebi",
    description: "Kendi web sitenizden veya özel kanaldan gelen siparişlerin karşılanması.",
    category: "shipping-fulfillment",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: "Sipariş Bilgileri",
        fields: [
          { name: "order_source", label: "Sipariş Kaynağı", type: "select", required: true, options: [{ value: "shopify", label: "Shopify" }, { value: "woocommerce", label: "WooCommerce" }, { value: "etsy", label: "Etsy" }, { value: "custom_site", label: "Kendi sitem" }, { value: "wholesale", label: "Toptan sipariş" }, { value: "other", label: "Diğer" }] },
          { name: "order_reference", label: "Sipariş Referansı / Numarası", type: "text", required: true },
          { name: "customer_name", label: "Alıcı Ad Soyad", type: "text", required: true },
          { name: "shipping_address", label: "Teslimat Adresi", type: "textarea", required: true },
          { name: "phone", label: "Alıcı Telefon", type: "phone" },
        ],
      },
      {
        title: "Ürünler",
        fields: [
          { name: "items", label: "Sipariş Kalemleri (SKU ve adet)", type: "textarea", required: true, placeholder: "SKU-001: 2 adet\nSKU-003: 1 adet" },
          { name: "shipping_method", label: "Kargo Yöntemi", type: "select", required: true, options: [{ value: "usps_first", label: "USPS First Class" }, { value: "usps_priority", label: "USPS Priority" }, { value: "ups_ground", label: "UPS Ground" }, { value: "fedex_home", label: "FedEx Home Delivery" }, { value: "cheapest", label: "En uygun fiyatlı" }] },
          { name: "gift_message", label: "Hediye mesajı (opsiyonel)", type: "textarea" },
          { name: "custom_packing", label: "Özel ambalaj talebi", type: "textarea", placeholder: "Marka etiketli kutu, özel bant, kart vb." },
        ],
      },
    ],
  },
];
