"use client";

/**
 * Atlas CopilotKit Actions — AI asistanının kullanabileceği araçlar
 *
 * useCopilotAction  → Chat'ten tetiklenen tool'lar
 * useCopilotReadable → Chat'e bağlam sağlayan veriler
 *
 * Bu bileşen CopilotProvider içinde bir yerde render edilmelidir.
 */

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { ALL_FORMS, FORM_CATEGORIES, getFormByCode, searchForms, getFormsByCategory } from "@/lib/forms";
import type { FormCategory } from "@/lib/forms/types";

const supabase = createClient();

export function CopilotActions() {
  const pathname = usePathname();

  // ─── READABLE CONTEXT ─── Chat'e bağlam sağla
  useCopilotReadable({
    description: "Kullanıcının şu an bulunduğu sayfa",
    value: pathname,
  });

  useCopilotReadable({
    description: "Atlas Platform hakkında bilgi: B2B SaaS, ABD e-ticaret, envanter yönetimi, sipariş karşılama. Türkçe konuş.",
    value: "Atlas, Türk girişimcilerin ABD pazarına girmesine yardımcı olan bir SaaS platformudur. LLC kurulumu, EIN alımı, envanter yönetimi, sipariş karşılama (fulfillment) hizmetleri sunar.",
  });

  // ─── ACTION: Müşteri Listesi Sorgulama ───
  useCopilotAction({
    name: "getCustomers",
    description: "Müşteri listesini getirir. Arama terimi ile filtrelenebilir.",
    parameters: [
      {
        name: "search",
        type: "string",
        description: "İsim, şirket veya e-posta ile arama (opsiyonel)",
        required: false,
      },
      {
        name: "limit",
        type: "number",
        description: "Maksimum sonuç sayısı (varsayılan 10)",
        required: false,
      },
    ],
    handler: async ({ search, limit }) => {
      let query = supabase
        .from("users")
        .select("id, first_name, last_name, email, company_name, onboarding_status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit || 10);

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) return `Hata: ${error.message}`;
      if (!data?.length) return "Müşteri bulunamadı.";

      return data.map((c) => ({
        isim: `${c.first_name} ${c.last_name}`,
        sirket: c.company_name,
        email: c.email,
        durum: c.onboarding_status,
        kayit: c.created_at,
      }));
    },
  });

  // ─── ACTION: Sipariş Durumu Sorgulama ───
  useCopilotAction({
    name: "getOrders",
    description: "Siparişleri listeler. Durum filtresi veya müşteri adı ile aranabilir.",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Sipariş durumu filtresi: received, processing, packing, shipped, delivered, cancelled, returned",
        required: false,
      },
      {
        name: "limit",
        type: "number",
        description: "Maksimum sonuç sayısı (varsayılan 10)",
        required: false,
      },
    ],
    handler: async ({ status, limit }) => {
      let query = supabase
        .from("orders")
        .select("id, status, destination, total_amount, platform, tracking_ref, carrier, created_at, users(first_name, last_name, company_name)")
        .order("created_at", { ascending: false })
        .limit(limit || 10);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) return `Hata: ${error.message}`;
      if (!data?.length) return "Sipariş bulunamadı.";

      return data.map((o: Record<string, unknown>) => {
        const users = o.users as { first_name: string; last_name: string; company_name: string } | null;
        return {
          id: (o.id as string).slice(0, 8),
          musteri: users?.company_name ?? "—",
          durum: o.status,
          tutar: o.total_amount ? `$${o.total_amount}` : "—",
          platform: o.platform ?? "—",
          takip: o.tracking_ref ?? "—",
          tarih: o.created_at,
        };
      });
    },
  });

  // ─── ACTION: Envanter/Stok Sorgulama ───
  useCopilotAction({
    name: "getInventory",
    description: "Ürün stok bilgilerini getirir. Düşük stoklu ürünleri filtreler.",
    parameters: [
      {
        name: "search",
        type: "string",
        description: "Ürün adı veya SKU ile arama (opsiyonel)",
        required: false,
      },
      {
        name: "lowStock",
        type: "boolean",
        description: "true ise sadece stoku 10'un altında olan ürünleri getirir",
        required: false,
      },
    ],
    handler: async ({ search, lowStock }) => {
      let query = supabase
        .from("products")
        .select("id, name, sku, stock_turkey, stock_us, base_price, is_active, owner_id, users(company_name)")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) return `Hata: ${error.message}`;
      if (!data?.length) return "Ürün bulunamadı.";

      let results = data;
      if (lowStock) {
        results = data.filter(
          (p) => (p.stock_turkey + p.stock_us) < 10
        );
      }

      return results.map((p: Record<string, unknown>) => {
        const users = p.users as { company_name: string } | null;
        return {
          urun: p.name,
          sku: p.sku,
          stok_TR: p.stock_turkey,
          stok_US: p.stock_us,
          toplam: (p.stock_turkey as number) + (p.stock_us as number),
          fiyat: `$${p.base_price}`,
          sahip: users?.company_name ?? "—",
        };
      });
    },
  });

  // ─── ACTION: Destek Talepleri ───
  useCopilotAction({
    name: "getTickets",
    description: "Destek taleplerini listeler. Durum ve öncelik ile filtrelenebilir.",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Durum filtresi: open, in_progress, resolved, closed",
        required: false,
      },
      {
        name: "priority",
        type: "string",
        description: "Öncelik filtresi: low, medium, high, urgent",
        required: false,
      },
    ],
    handler: async ({ status, priority }) => {
      let query = supabase
        .from("support_tickets")
        .select("id, subject, description, status, priority, created_at, resolved_at, users(first_name, last_name, company_name)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (status) query = query.eq("status", status);
      if (priority) query = query.eq("priority", priority);

      const { data, error } = await query;
      if (error) return `Hata: ${error.message}`;
      if (!data?.length) return "Destek talebi bulunamadı.";

      return data.map((t: Record<string, unknown>) => {
        const users = t.users as { first_name: string; last_name: string; company_name: string } | null;
        return {
          konu: t.subject,
          musteri: users?.company_name ?? "—",
          durum: t.status,
          oncelik: t.priority,
          tarih: t.created_at,
        };
      });
    },
  });

  // ─── ACTION: Süreç Görevleri ───
  useCopilotAction({
    name: "getProcessTasks",
    description: "Müşteri onboarding süreç görevlerini listeler.",
    parameters: [
      {
        name: "customerId",
        type: "string",
        description: "Belirli müşterinin görevleri (opsiyonel, tümü için boş bırakın)",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "Görev durumu: pending, in_progress, completed, blocked",
        required: false,
      },
    ],
    handler: async ({ customerId, status }) => {
      let query = supabase
        .from("process_tasks")
        .select("id, task_name, task_category, task_status, sort_order, completed_at, users(first_name, last_name, company_name)")
        .order("sort_order", { ascending: true });

      if (customerId) query = query.eq("user_id", customerId);
      if (status) query = query.eq("task_status", status);

      const { data, error } = await query;
      if (error) return `Hata: ${error.message}`;
      if (!data?.length) return "Görev bulunamadı.";

      return data.map((t: Record<string, unknown>) => {
        const users = t.users as { first_name: string; last_name: string; company_name: string } | null;
        return {
          gorev: t.task_name,
          kategori: t.task_category,
          durum: t.task_status,
          musteri: users?.company_name ?? "—",
          tamamlanma: t.completed_at ?? "—",
        };
      });
    },
  });

  // ─── ACTION: Dashboard KPI Özeti ───
  useCopilotAction({
    name: "getDashboardSummary",
    description: "Platform özet istatistiklerini getirir: müşteri sayısı, aktif sipariş, bekleyen lead, düşük stok uyarıları.",
    parameters: [],
    handler: async () => {
      const [
        { count: customerCount },
        { count: activeOrderCount },
        { count: leadCount },
        { data: lowStockProducts },
        { count: openTicketCount },
        { count: pendingTaskCount },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["received", "processing", "packing"]),
        supabase
          .from("contact_submissions")
          .select("*", { count: "exact", head: true })
          .in("status", ["new", "contacted"]),
        supabase
          .from("products")
          .select("name, sku, stock_turkey, stock_us")
          .eq("is_active", true),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
        supabase
          .from("process_tasks")
          .select("*", { count: "exact", head: true })
          .in("task_status", ["pending", "in_progress"]),
      ]);

      const lowStock = (lowStockProducts ?? []).filter(
        (p) => (p.stock_turkey + p.stock_us) < 10
      );

      return {
        toplam_musteri: customerCount ?? 0,
        aktif_siparis: activeOrderCount ?? 0,
        bekleyen_lead: leadCount ?? 0,
        dusuk_stok_urun: lowStock.length,
        acik_destek_talebi: openTicketCount ?? 0,
        bekleyen_gorev: pendingTaskCount ?? 0,
        dusuk_stok_detay: lowStock.map((p) => ({
          urun: p.name,
          sku: p.sku,
          stok_TR: p.stock_turkey,
          stok_US: p.stock_us,
        })),
      };
    },
  });

  // ─── ACTION: Lead/Başvuru Listesi ───
  useCopilotAction({
    name: "getLeads",
    description: "İletişim başvurularını (lead) listeler. Duruma göre filtrelenebilir.",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Lead durumu: new, contacted, qualified, converted, rejected",
        required: false,
      },
    ],
    handler: async ({ status }) => {
      let query = supabase
        .from("contact_submissions")
        .select("id, name, email, phone, company_name, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return `Hata: ${error.message}`;
      if (!data?.length) return "Lead bulunamadı.";

      return data.map((l) => ({
        isim: l.name,
        email: l.email,
        telefon: l.phone ?? "—",
        sirket: l.company_name ?? "—",
        mesaj: l.message?.slice(0, 100) + (l.message && l.message.length > 100 ? "..." : ""),
        durum: l.status,
        tarih: l.created_at,
      }));
    },
  });

  // ─── READABLE: Mevcut Formlar ───
  useCopilotReadable({
    description: "Atlas platformundaki tüm mevcut form kodları ve başlıkları. Müşteri her türlü talebini bu formlar aracılığıyla iletir.",
    value: ALL_FORMS.map((f) => `${f.code}: ${f.title} (${f.category})`).join("\n"),
  });

  // ─── ACTION: Form Kataloğu Sorgulama ───
  useCopilotAction({
    name: "getFormCatalog",
    description: "Mevcut formları listeler. Kategoriye göre filtreleyebilir veya arama yapabilir. Her form ABD form sistemi gibi numaralıdır (ATL-101, ATL-201 vb.).",
    parameters: [
      {
        name: "category",
        type: "string",
        description: "Kategori filtresi: llc-legal, shipping-fulfillment, accounting-finance, marketing-advertising, social-media, branding-design, general-support",
        required: false,
      },
      {
        name: "search",
        type: "string",
        description: "Arama terimi (form kodu, başlık veya açıklama)",
        required: false,
      },
    ],
    handler: async ({ category, search }) => {
      if (search) {
        const results = searchForms(search);
        if (!results.length) return "Aramanızla eşleşen form bulunamadı.";
        return results.map((f) => ({
          kod: f.code,
          baslik: f.title,
          aciklama: f.description,
          kategori: f.category,
          sure: f.estimatedMinutes ? `~${f.estimatedMinutes} dk` : "—",
        }));
      }

      if (category) {
        const results = getFormsByCategory(category as FormCategory);
        if (!results.length) return "Bu kategoride aktif form bulunmuyor.";
        return results.map((f) => ({
          kod: f.code,
          baslik: f.title,
          aciklama: f.description,
          sure: f.estimatedMinutes ? `~${f.estimatedMinutes} dk` : "—",
        }));
      }

      // Tüm kategorilerin özeti
      return FORM_CATEGORIES.map((cat) => ({
        kategori: cat.label,
        aciklama: cat.description,
        form_sayisi: getFormsByCategory(cat.id).length,
      }));
    },
  });

  // ─── ACTION: Form Detayı Getirme ───
  useCopilotAction({
    name: "getFormDetails",
    description: "Belirli bir formun tüm alanlarını (field) ve bölümlerini getirir. Müşterinin formu doldurmadan önce ne soracağını anlaması için kullanılır.",
    parameters: [
      {
        name: "formCode",
        type: "string",
        description: "Form kodu (örn: ATL-101, ATL-401)",
        required: true,
      },
    ],
    handler: async ({ formCode }) => {
      const form = getFormByCode(formCode.toUpperCase());
      if (!form) return `${formCode} kodlu form bulunamadı.`;

      return {
        kod: form.code,
        baslik: form.title,
        aciklama: form.description,
        talimatlar: form.instructions ?? "—",
        sure: form.estimatedMinutes ? `~${form.estimatedMinutes} dk` : "—",
        bolumler: form.sections.map((s) => ({
          baslik: s.title,
          aciklama: s.description,
          alanlar: s.fields
            .filter((f) => f.type !== "heading" && f.type !== "separator")
            .map((f) => ({
              ad: f.name,
              etiket: f.label,
              tip: f.type,
              zorunlu: f.required ?? false,
              secenekler: f.options?.map((o) => o.label) ?? [],
              yardim: f.helpText ?? "",
            })),
        })),
        doldurma_linki: `/panel/support/forms/${form.code}`,
      };
    },
  });

  // ─── ACTION: Form Gönderimi (Copilot ile doldurma) ───
  useCopilotAction({
    name: "submitForm",
    description: "Müşteri adına bir formu doldurarak gönderir. Tüm zorunlu alanların doldurulmuş olması gerekir. Müşteriden onay aldıktan sonra çağır.",
    parameters: [
      {
        name: "formCode",
        type: "string",
        description: "Form kodu (örn: ATL-101)",
        required: true,
      },
      {
        name: "formData",
        type: "string",
        description: "Form alanlarının JSON formatında değerleri. Örnek: {\"owner_full_name\": \"Ahmet Yılmaz\", \"owner_email\": \"ahmet@ornek.com\"}",
        required: true,
      },
    ],
    handler: async ({ formCode, formData }) => {
      const form = getFormByCode(formCode.toUpperCase());
      if (!form) return `${formCode} kodlu form bulunamadı.`;

      let parsedData: Record<string, unknown>;
      try {
        parsedData = JSON.parse(formData);
      } catch {
        return "Form verisi geçerli bir JSON değil. Lütfen düzeltip tekrar deneyin.";
      }

      // Check required fields
      const missingFields: string[] = [];
      for (const section of form.sections) {
        for (const field of section.fields) {
          if (field.required && !parsedData[field.name]) {
            missingFields.push(`${field.label} (${field.name})`);
          }
        }
      }

      if (missingFields.length > 0) {
        return `Eksik zorunlu alanlar: ${missingFields.join(", ")}`;
      }

      // Submit via Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "Oturum bulunamadı. Lütfen tekrar giriş yapın.";

      const { data: submission, error } = await supabase
        .from("form_submissions")
        .insert({
          form_code: form.code,
          user_id: user.id,
          data: parsedData as import("@/types/database").Json,
          status: "submitted",
        })
        .select("id")
        .single();

      if (error) return `Form gönderilemedi: ${error.message}`;

      return {
        basarili: true,
        mesaj: `${form.code} — ${form.title} başarıyla gönderildi!`,
        gonderim_id: submission.id,
        detay_linki: `/panel/support/submissions/${submission.id}`,
      };
    },
  });

  // ─── ACTION: Gönderim Geçmişi Sorgulama ───
  useCopilotAction({
    name: "getMyFormSubmissions",
    description: "Müşterinin daha önce gönderdiği formları ve durumlarını listeler.",
    parameters: [
      {
        name: "formCode",
        type: "string",
        description: "Belirli bir formun gönderimlerini filtrele (opsiyonel)",
        required: false,
      },
    ],
    handler: async ({ formCode }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "Oturum bulunamadı.";

      let query = supabase
        .from("form_submissions")
        .select("id, form_code, status, admin_notes, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (formCode) {
        query = query.eq("form_code", formCode.toUpperCase());
      }

      const { data, error } = await query;
      if (error) return `Hata: ${error.message}`;
      if (!data?.length) return "Henüz form gönderimi bulunamadı.";

      return data.map((s) => {
        const form = getFormByCode(s.form_code);
        return {
          id: s.id.slice(0, 8),
          form: `${s.form_code} — ${form?.title ?? "Bilinmeyen"}`,
          durum: s.status,
          admin_notu: s.admin_notes ?? "—",
          tarih: s.created_at,
        };
      });
    },
  });

  // Bu bileşen görsel bir şey render etmez — sadece hook'ları kaydeder
  return null;
}
