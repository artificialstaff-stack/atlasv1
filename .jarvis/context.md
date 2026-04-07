# JARVIS.md — Atlas'ın Canlı Beyni

Bu dosya Atlas platformunun beynidir. Jarvis (OpenClaw asistanı) buradan sistemi hatırlar.
Herhangi bir session reset'inde bu dosya okunur ve sistem bağlamı yeniden kurulur.

## Son Güncelleme: 2026-04-07 12:50 UTC+8

---

## Atlas Nedir?

Atlas, **Türk KOBİ'leri için ABD pazarına açılan hizmet sağlayıcı platformdur.**

### İş Modeli
```
Müşteri (Türk Üretici)
    │
    ├── Atlas'tan paket satın alır
    │   (örn: Amazon Paketi = $1000 kurulum + $750/ay)
    │
    ├── Atlas arka planda HER ŞEYİ yapar:
    │   LLC kuruluşu, EIN, pazaryeri hesapları, satış yönetimi,
    │   iade yönetimi, lojistik, fiyatlandırma, müşteri hizmetleri
    │
    └── Müşteri sadece:
        📊 Satışlarını izler (dashboard)
        📝 İstenen formları doldurur
        📦 Yeni ürün gönderme talebi oluşturur
        💰 Paket ücretini öder
        🔔 Bildirimleri takip eder
```

### Para Akışı
1. Satış → Müşterinin LLC banka hesabına gider (Atlas yönetir)
2. Atlas komisyonlarını keser
3. Kalan müşteri hesabında birikir
4. Müşteri TR IBAN'a çekim talebi oluşturabilir

---

## Sistem Mimarisi

### Üç Yüzey
1. **Marketing** (`src/app/(marketing)/`) — Landing, about, pricing, contact, comparison, demo, how-it-works, proof, webinar
2. **Admin Panel** (`src/app/(admin)/admin/`) — Operasyon merkezi (biz çalışırız)
3. **Müşteri Paneli** (`src/app/(client)/panel/`) — Gözetim ekranı (müşteri izler)

### Müşteri Paneli Modülleri (17)
- **Launch**: dashboard, process, services, store
- **Operations**: companies, marketplaces, products, orders, warehouse
- **Analytics**: social, advertising, finance, reports
- **Utility**: documents, billing, support, settings

### Modül Görünürlük Sistemi
- `hidden` — Gizli (hiç gösterilmiyor)
- `locked` — Kilitli (satın alınmamış veya işleniyor)
- `active` — Aktif (kullanılabilir)
- Kilitli durumlar: `not_purchased`, `processing`, `blocked`

### Launch Fazları
application → llc_setup → ein_setup → plan_ready → channel_selection → store_setup → go_live_ready → live

### Workstream'ler (8)
company_setup, catalog_intake, website, marketplaces, ads, social, seo, fulfillment

---

## Kritik Dosyalar

### Müşteri Workspace (`src/lib/customer-workspace/`)
- `service.ts` (1998 satır) — Ana servis, tüm veri çekme mantığı
- `types.ts` — Tüm interface tanımları
- `blueprint.ts` — 17 modülün sidebar gruplandırması
- `store.ts` — Request threads, deliverables CRUD
- `store-experience.ts` — Paket satın alma deneyimi
- `index.ts` — Barrel exports

### Jarvis Inner Brain (`src/lib/jarvis/`)
- self-model, observer, audit, memory (episodic/user/procedural/thread)
- tracing, security, background-loop, gap-report, autofix
- Brain API endpoint'leri: `src/app/api/admin/copilot/jarvis/`

### Portal Bileşenleri (`src/components/portal/`)
- atlas-widget-kit.tsx (18KB) — Widget sistemi (HeroBoard, MetricSlab, InsightCard, etc.)
- observer-dashboard-content.tsx, observer-workstream-content.tsx
- deliverables-content.tsx, performance-summary-content.tsx
- locked-module-content.tsx, launch-journey-content.tsx
- portal-page-hero.tsx, request-hub-content.tsx, support-center-content.tsx

### Bildirim Sistemi (`src/lib/notifications/index.ts`)
- CRUD: createNotification, getNotifications, markAsRead, markAllAsRead
- Email desteği var
- ⚠️ Eksik: Admin aksiyonlarında otomatik bildirim trigger'ı

### AI Sistemi (`src/lib/ai/`)
- 4 Agent: Orchestrator, Compliance, Logistics, Auditor
- Copilot Engine: actions, artifacts, deep-analysis, intent, memory, planner
- Autonomous: agent-tools, approval, content-pipeline, workflow-engine
- MCP Server: 7 tool (products, orders, tasks, tickets, inventory, documents)

---

## Jarvis'in Görevleri

1. **Sistemi İzle** — Hataları, eksikleri, performans sorunlarını tespit et
2. **Geliştirme Yap** — Eksik özellikleri tamamla, hataları düzelt
3. **Bildirim Tetikle** — Admin aksiyonlarında müşteriye bildirim gönder
4. **WORKTREE Güncelle** — Her değişikliği kaydet
5. **Subagent Yönet** — Paralel geliştirme görevlerini yönet
6. **Konuş** — Sistem durumu hakkında rapor ver

---

## Geliştirme Kuralları

- Her değişiklik WORKTREE.md'ye kaydedilmeli
- Müşteri paneli = sadece izleme + talep oluşturma (asla operasyon yok)
- Admin panel = tüm operasyonlar
- Bildirimler her admin aksiyonunda müşteriye gitmeli
- TypeScript strict, shadcn/ui, Framer Motion, Supabase RLS
- `npm run validate` — typecheck + lint + test + build (CI doğrulama)
