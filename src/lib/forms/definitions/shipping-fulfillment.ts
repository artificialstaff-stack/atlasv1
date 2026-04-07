// =============================================================================
// ATLAS PLATFORM — Form Tanımları: Gönderim & Lojistik (ATL-2xx)
// =============================================================================

import { localized as t, type LocalizedFormDefinition } from "../localization";

export const shippingFulfillmentForms: LocalizedFormDefinition[] = [
  {
    code: "ATL-201",
    title: t("Ürün Gönderim Talebi", "Product Shipping Request"),
    description: t("Türkiye'den ABD deposuna ürün göndermek için talep formu.", "Request form to ship products from Turkey to the US warehouse."),
    instructions: t("Ürünlerinizi ABD depomuz adresine göndermek için bu formu doldurun. Gönderiminiz için en uygun kargo seçeneğini belirleyeceğiz.", "Fill out this form to send your products to our US warehouse. We'll determine the best shipping option for your shipment."),
    category: "shipping-fulfillment",
    estimatedMinutes: 10,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Gönderim Bilgileri", "Shipment Details"),
        fields: [
          { name: "shipment_type", label: t("Gönderim Tipi", "Shipping Type"), type: "radio", required: true, options: [{ value: "air", label: t("Hava Kargo", "Air Freight") }, { value: "sea", label: t("Deniz Kargo", "Sea Freight") }, { value: "express", label: t("Express (DHL/FedEx)", "Express (DHL/FedEx)") }] },
          { name: "origin_city", label: t("Çıkış Şehri (Türkiye)", "Origin City (Turkey)"), type: "text", required: true, placeholder: t("Örn: İstanbul", "e.g. Istanbul") },
          { name: "package_count", label: t("Paket/Koli Sayısı", "Package / Box Count"), type: "number", required: true },
          { name: "total_weight_kg", label: t("Toplam Ağırlık (kg)", "Total Weight (kg)"), type: "number", required: true },
          { name: "dimensions", label: t("Boyutlar (en x boy x yükseklik cm)", "Dimensions (width x length x height cm)"), type: "text", placeholder: t("Örn: 40x30x30", "e.g. 40x30x30"), required: false },
          { name: "estimated_value_usd", label: t("Tahmini Mal Değeri ($)", "Estimated Goods Value ($)"), type: "currency", required: true },
        ],
      },
      {
        title: t("Ürün Detayları", "Product Details"),
        fields: [
          { name: "product_description", label: t("Ürün Açıklaması", "Product Description"), type: "textarea", required: true, placeholder: t("Gönderilecek ürünlerin detaylı açıklaması", "Detailed description of the products being shipped") },
          { name: "hs_codes", label: t("HS (Gümrük Tarife) Kodları", "HS / Tariff Codes"), type: "text", required: false, helpText: t("Bilmiyorsanız boş bırakabilirsiniz, biz belirleriz", "Leave blank if you do not know them; we can determine them") },
          { name: "contains_battery", label: t("Pil/batarya içeriyor mu?", "Contains batteries?"), type: "radio", required: true, options: [{ value: "yes", label: t("Evet", "Yes") }, { value: "no", label: t("Hayır", "No") }] },
          { name: "is_fragile", label: t("Kırılacak ürün var mı?", "Any fragile items?"), type: "radio", required: true, options: [{ value: "yes", label: t("Evet", "Yes") }, { value: "no", label: t("Hayır", "No") }] },
          { name: "special_instructions", label: t("Özel Talimatlar", "Special Instructions"), type: "textarea", placeholder: t("Depolama, etiketleme veya gönderimle ilgili özel talepler", "Special requests about storage, labeling, or shipping") },
        ],
      },
      {
        title: t("Gümrük & Belgeler", "Customs & Documents"),
        fields: [
          { name: "commercial_invoice", label: t("Ticari Fatura (Commercial Invoice)", "Commercial Invoice"), type: "file" },
          { name: "packing_list", label: t("Ambalaj Listesi (Packing List)", "Packing List"), type: "file" },
          { name: "additional_docs", label: t("Ek Belgeler", "Additional Documents"), type: "file" },
        ],
      },
    ],
  },
  {
    code: "ATL-202",
    title: t("Depo İçi Stok Transferi", "Warehouse Stock Transfer"),
    description: t("ABD deposundaki ürünler arasında transfer veya FBA'ya gönderim talebi.", "Request to transfer products within the US warehouse or send them to FBA."),
    category: "shipping-fulfillment",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Transfer Detayları", "Transfer Details"),
        fields: [
          { name: "transfer_type", label: t("Transfer Tipi", "Transfer Type"), type: "select", required: true, options: [{ value: "internal", label: t("Depo içi transfer", "Internal warehouse transfer") }, { value: "fba", label: t("Amazon FBA'ya gönderim", "Send to Amazon FBA") }, { value: "fbm", label: t("Amazon FBM hazırlık", "Prepare for Amazon FBM") }, { value: "other_marketplace", label: t("Diğer pazaryeri", "Other marketplace") }] },
          { name: "sku_list", label: t("Ürün SKU Listesi ve Adetler", "SKU List and Quantities"), type: "textarea", required: true, placeholder: t("Her satıra bir SKU ve adet yazın:\nSKU-001: 50 adet\nSKU-002: 30 adet", "Write one SKU and quantity per line:\nSKU-001: 50 units\nSKU-002: 30 units") },
          { name: "fba_shipment_id", label: t("FBA Shipment ID", "FBA Shipment ID"), type: "text", showWhen: { field: "transfer_type", value: "fba" }, helpText: t("Amazon Seller Central'dan alınan shipment ID", "Shipment ID from Amazon Seller Central") },
          { name: "destination_address", label: t("Hedef Adres", "Destination Address"), type: "textarea", showWhen: { field: "transfer_type", value: ["other_marketplace"] } },
          { name: "labeling_needed", label: t("FNSKU Etiketleme gerekli mi?", "Is FNSKU labeling required?"), type: "radio", options: [{ value: "yes", label: t("Evet", "Yes") }, { value: "no", label: t("Hayır", "No") }], showWhen: { field: "transfer_type", value: "fba" } },
          { name: "preferred_date", label: t("Tercih Edilen Gönderim Tarihi", "Preferred Shipping Date"), type: "date" },
          { name: "priority", label: t("Öncelik", "Priority"), type: "select", required: true, options: [{ value: "normal", label: t("Normal (3-5 iş günü)", "Normal (3-5 business days)") }, { value: "urgent", label: t("Acil (1-2 iş günü)", "Urgent (1-2 business days)") }] },
        ],
      },
    ],
  },
  {
    code: "ATL-203",
    title: t("Özel Sipariş Karşılama (Fulfillment) Talebi", "Custom Order Fulfillment Request"),
    description: t("Kendi web sitenizden veya özel kanaldan gelen siparişlerin karşılanması.", "Fulfillment for orders coming from your website or a custom channel."),
    category: "shipping-fulfillment",
    estimatedMinutes: 8,
    version: "1.0",
    active: true,
    sections: [
      {
        title: t("Sipariş Bilgileri", "Order Information"),
        fields: [
          { name: "order_source", label: t("Sipariş Kaynağı", "Order Source"), type: "select", required: true, options: [{ value: "shopify", label: "Shopify" }, { value: "woocommerce", label: "WooCommerce" }, { value: "etsy", label: "Etsy" }, { value: "custom_site", label: t("Kendi sitem", "My own site") }, { value: "wholesale", label: t("Toptan sipariş", "Wholesale order") }, { value: "other", label: t("Diğer", "Other") }] },
          { name: "order_reference", label: t("Sipariş Referansı / Numarası", "Order Reference / Number"), type: "text", required: true },
          { name: "customer_name", label: t("Alıcı Ad Soyad", "Recipient Full Name"), type: "text", required: true },
          { name: "shipping_address", label: t("Teslimat Adresi", "Shipping Address"), type: "textarea", required: true },
          { name: "phone", label: t("Alıcı Telefon", "Recipient Phone"), type: "phone" },
        ],
      },
      {
        title: t("Ürünler", "Items"),
        fields: [
          { name: "items", label: t("Sipariş Kalemleri (SKU ve adet)", "Order Items (SKU and quantity)"), type: "textarea", required: true, placeholder: t("SKU-001: 2 adet\nSKU-003: 1 adet", "SKU-001: 2 units\nSKU-003: 1 unit") },
          { name: "shipping_method", label: t("Kargo Yöntemi", "Shipping Method"), type: "select", required: true, options: [{ value: "usps_first", label: "USPS First Class" }, { value: "usps_priority", label: "USPS Priority" }, { value: "ups_ground", label: "UPS Ground" }, { value: "fedex_home", label: "FedEx Home Delivery" }, { value: "cheapest", label: t("En uygun fiyatlı", "Lowest cost") }] },
          { name: "gift_message", label: t("Hediye mesajı (opsiyonel)", "Gift message (optional)"), type: "textarea" },
          { name: "custom_packing", label: t("Özel ambalaj talebi", "Custom packaging request"), type: "textarea", placeholder: t("Marka etiketli kutu, özel bant, kart vb.", "Branded box, custom tape, cards, etc.") },
        ],
      },
    ],
  },
];
