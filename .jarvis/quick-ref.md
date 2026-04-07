# Atlas Jarvis — Hızlı Referans Kartı
# Bu dosya session reset'lerinde hızlı hatırlama için kullanılır.

## Çalıştırma
cd ~/.openclaw/workspace/atlas-platform
npm run dev          # Dev server
npm run validate     # Full CI (type + lint + test + build)
npm test             # Unit tests
npm run e2e          # Playwright E2E

## Git
Branch: jarvis/integration
Remote: origin (artificialstaff-stack/atlasv1)
Push: git push origin jarvis/integration

## En Kritik Dosyalar (ilk bakılacak)
1. src/lib/customer-workspace/service.ts    — Müşteri veri katmanı (1998 satır)
2. src/lib/customer-workspace/types.ts      — Tüm tipler
3. src/lib/customer-workspace/blueprint.ts  — Modül yapısı
4. src/components/portal/atlas-widget-kit.tsx — Widget sistemi
5. src/app/(client)/panel/dashboard/_components/dashboard-content.tsx — Dashboard
6. src/app/(client)/panel/_components/client-sidebar.tsx — Sidebar
7. src/lib/notifications/index.ts           — Bildirim sistemi
8. src/lib/jarvis/index.ts                  — Inner Jarvis brain

## Müşteri Paneli Route Haritası
/panel/dashboard    — Ana dashboard (HeroBoard, metrics, action items)
/panel/process      — Süreç takibi (LLC, EIN, kurulum aşamaları)
/panel/services     — Hizmetlerim (paketler, kapsam)
/panel/store        — Mağaza (kanal seçimi, paket satın alma)
/panel/companies    — Şirket / LLC detayları
/panel/marketplaces — Pazaryeri hesapları
/panel/products     — Ürün katalog
/panel/orders       — Siparişler
/panel/warehouse    — Depo durumu
/panel/social-media — Sosyal medya
/panel/advertising  — Reklamlar
/panel/finance      — Finans
/panel/reports      — Raporlar
/panel/documents    — Belgeler
/panel/billing      — Faturalar
/panel/support      — Destek
/panel/settings     — Ayarlar

## Admin Panel Route Haritası
/admin/dashboard    — Admin ana sayfa
/admin/customers    — Müşteri yönetimi
/admin/orders       — Sipariş yönetimi
/admin/inventory    — Stok yönetimi
/admin/support      — Destek talepleri
/admin/leads        — Potansiyel müşteriler
/admin/workflows    — İş akışları
/admin/documents    — Belge yönetimi
/admin/ai           — AI yönetimi
/admin/ai/brain     — Jarvis brain dashboard
/admin/ai/providers — AI provider yönetimi
/admin/ai/operator  — AI operatör workspace
/admin/billing      — Fatura yönetimi
/admin/finance      — Finans yönetimi

## Supabase Tablolar
profiles, customers, products, orders, order_items, process_tasks,
support_tickets, ticket_messages, leads, workflows, documents,
agent_action_log, state_transitions, notifications, form_submissions,
workflow_events, user_subscriptions, invoices, customer_companies

## Bildirim Akışı (Eksik — Doldurulacak)
Admin aksiyonu → createNotification(userId, title, body, type, channel)
→ Supabase Realtime → NotificationBell → Müşteri görür
→ Email gönderimi (opsiyonel)
