<p align="center">
  <img src="public/atlas-logo.svg" alt="Atlas Platform" width="80" />
</p>

<h1 align="center">Atlas Platform</h1>

<p align="center">
  <strong>Türk KOBİ'leri için AI-destekli ABD pazarı e-ticaret SaaS platformu</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.4.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL%2017-3FCF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/CopilotKit-1.52.0-7C3AED" alt="CopilotKit" />
  <img src="https://img.shields.io/badge/Tests-138%20passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/CTO%20Score-10%2F10-gold" alt="CTO Score" />
</p>

---

## Genel Bakış

Atlas Platform, Türk küçük ve orta ölçekli işletmelerin ABD pazarına girişini kolaylaştıran **full-stack SaaS** uygulamasıdır. LLC kuruluşu, EIN başvurusu, gümrük uyumu, envanter yönetimi, sipariş takibi ve destek süreçlerini **AI destekli çoklu ajan mimarisi** ile yönetir.

### Öne Çıkan Özellikler

- **4 Uzman AI Ajanı**: Orchestrator, Compliance, Logistics, Auditor
- **CopilotKit Entegrasyonu**: 7 aksiyon + 2 readable + doğal dil arayüzü
- **MCP Server**: Model Context Protocol ile standart tool erişimi
- **Anticipatory Intelligence**: Proaktif stok uyarıları, süreç tahminleri, maliyet optimizasyonu
- **Ambient UX**: Spatial engine, cam morfoloji, gradient animasyonlar
- **Gerçek Zamanlı**: Supabase Realtime ile canlı veri güncellemeleri
- **Production-Grade Altyapı**: Security headers, rate limiting, structured logging, correlation IDs

---

## Teknoloji Stack

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | Next.js (App Router, Turbopack, RSC) | 16.1.6 |
| UI | React + React Compiler | 19.2.3 |
| Dil | TypeScript (strict mode) | 5.x |
| Veritabanı | Supabase (PostgreSQL 17 + RLS) | 2.97.0 |
| Auth | Supabase SSR Auth | 0.8.0 |
| AI Chat | CopilotKit (react-core, react-ui, runtime) | 1.52.0 |
| AI SDK | Vercel AI SDK + OpenAI | 6.x |
| State | Zustand + TanStack React Query | 5.x / 5.90 |
| Tablo | TanStack React Table | 8.21.3 |
| Form | React Hook Form + Zod 4 | 7.71 / 4.3 |
| Animasyon | Framer Motion | 12.34 |
| UI Kit | shadcn/ui (26+ bileşen) + Radix | 1.4.3 |
| Grafik | Recharts + Custom SVG (MiniBar, MiniDonut, Sparkline) | 3.7.0 |
| Test (Unit) | Vitest 4 + Testing Library + jsdom | 4.0.18 |
| Test (E2E) | Playwright | 1.58.2 |
| CI/CD | GitHub Actions (5 job pipeline) | - |
| Git Hooks | Husky 9 + lint-staged 16 | 9.1.7 |

---

## Mimari

```
atlas-platform/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (marketing)/              # Pazarlama sayfaları (SSG)
│   │   │   ├── about/
│   │   │   ├── contact/
│   │   │   └── pricing/
│   │   ├── (auth)/                   # Auth sayfaları
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (admin)/admin/            # Admin dashboard
│   │   │   ├── dashboard/
│   │   │   ├── customers/[id]/
│   │   │   ├── orders/
│   │   │   ├── inventory/
│   │   │   ├── support/
│   │   │   ├── leads/
│   │   │   ├── workflows/
│   │   │   └── documents/
│   │   ├── (client)/panel/           # Müşteri paneli
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── process/
│   │   │   ├── documents/
│   │   │   └── support/
│   │   └── api/
│   │       ├── copilot/              # CopilotKit runtime endpoint
│   │       ├── mcp/                  # MCP JSON-RPC 2.0 server
│   │       ├── health/               # Health check endpoint
│   │       └── webhooks/auth/        # Auth webhooks
│   ├── components/
│   │   ├── ai/                       # AI bileşenleri (CopilotProvider, AIChatPanel)
│   │   ├── layouts/                  # Layout bileşenleri
│   │   ├── shared/                   # Ortak bileşenler (DataTable, Pagination)
│   │   └── ui/                       # shadcn/ui (26+ bileşen)
│   ├── features/                     # Domain feature modülleri
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── inventory/
│   │   ├── leads/
│   │   ├── orders/
│   │   ├── support/
│   │   └── workflows/
│   ├── hooks/                        # Global hooks
│   ├── lib/
│   │   ├── ai/                       # AI katmanı
│   │   │   ├── agents/               # 4-ajan sistemi (modüler)
│   │   │   │   ├── types.ts
│   │   │   │   ├── orchestrator.ts
│   │   │   │   ├── compliance-agent.ts
│   │   │   │   ├── logistics-agent.ts
│   │   │   │   ├── auditor-agent.ts
│   │   │   │   └── index.ts
│   │   │   ├── agent-types.ts        # Agent session & gatekeeper
│   │   │   ├── ag-ui-runtime.ts      # AG-UI event system
│   │   │   ├── mcp-config.ts         # MCP tool registry
│   │   │   ├── mcp-handlers.ts       # Extracted MCP handlers
│   │   │   ├── anticipatory.ts       # Proaktif öneri motoru
│   │   │   └── index.ts              # Barrel export
│   │   ├── query/                    # React Query altyapısı
│   │   │   ├── query-keys.ts         # Unified query key factory
│   │   │   └── query-client.ts
│   │   ├── spatial/                  # Spatial engine config
│   │   ├── store/                    # Zustand stores
│   │   └── supabase/                 # Supabase client (server/client/middleware)
│   ├── __tests__/                    # Unit test dosyaları (12 dosya, 138 test)
│   └── types/                        # Global TypeScript tipleri
├── supabase/
│   └── migrations/                   # SQL migration dosyaları
│       ├── 20250101000001_initial_schema.sql
│       ├── 20250101000002_agent_action_log.sql
│       └── 20250101000003_state_machine_status.sql
├── e2e/                              # Playwright E2E testleri
│   ├── marketing.spec.ts
│   ├── auth.spec.ts
│   └── api.spec.ts
├── .github/
│   └── workflows/ci.yml             # 5-job CI/CD pipeline
├── .husky/pre-commit                 # Git pre-commit hook
└── public/                           # Statik dosyalar
```

---

## Veritabanı Şeması (11 Tablo + 2 Ek)

| Tablo | Açıklama |
|-------|----------|
| `profiles` | Kullanıcı profilleri (role: admin/customer) |
| `customers` | Müşteri detayları (şirket, faz, iletişim) |
| `products` | Ürünler (SKU, HS kodu, TR/US stok, fiyat) |
| `orders` | Siparişler (platform, durum, takip) |
| `order_items` | Sipariş kalemleri |
| `process_tasks` | Süreç görevleri (LLC, EIN, gümrük vb.) |
| `support_tickets` | Destek talepleri |
| `ticket_messages` | Talep mesajları |
| `leads` | Potansiyel müşteri adayları |
| `workflows` | İş akışları |
| `documents` | Belge metadata |
| `agent_action_log` | AI ajan aksiyon günlüğü |
| `state_transitions` | FSM durum geçiş kaydı |

### Row Level Security (RLS)

Tüm tablolarda RLS aktif. Kullanıcılar yalnızca kendi verilerine erişebilir. Admin'ler tüm verileri görebilir.

### State Machine

`process_tasks` tablosunda `sm_status` sütunu ile Finite State Machine:

```
idle → awaiting_input → processing → review → approved → completed
                                        ↓
                                    rejected → awaiting_input
                                        ↓
                                      failed
```

---

## AI Katmanı

### 4-Ajan Mimarisi

```
Kullanıcı İsteği
      ↓
[Orchestrator] ─→ routeToAgent() ile yönlendirme
      ↓
┌─────────────┬──────────────┬─────────────┐
│ Compliance  │  Logistics   │   Auditor   │
│ LLC/EIN/Tax │ Stok/Kargo   │ Denetim/Log │
└─────────────┴──────────────┴─────────────┘
      ↓
[Auditor] → Tüm aksiyonları loglar, risk skoru hesaplar
```

- **Orchestrator**: Kullanıcı isteğini analiz eder, doğru specialist'e yönlendirir
- **Compliance**: LLC kuruluş, EIN başvuru, vergi uyumu, gümrük belgeleri
- **Logistics**: Envanter sorgulama, sipariş durumu, stok uyarıları
- **Auditor**: Aksiyon loglama, risk skoru (0-100), güvenlik denetimi

### Autonomy Seviyeleri

| Seviye | Açıklama | Örnekler |
|--------|----------|----------|
| 0 | Salt Okunur | Ürün/sipariş sorgulama |
| 1 | Öneri | Ticket oluşturma, optimizasyon |
| 2 | Oto + Bildirim | Görev durumu güncelleme, düşük stok |
| 3 | Tam Otonom | Sipariş oluşturma, toplu işlem |

### CopilotKit Entegrasyonu

- **7 Aksiyon**: fetchOrders, fetchProducts, fetchTasks, createTicket, updateTask, inventoryAlert, generateReport
- **2 Readable**: currentUserContext, dashboardSummary
- **Chat Panel**: Glass morphism UI, Türkçe doğal dil desteği

### MCP Server (`POST /api/mcp`)

JSON-RPC 2.0 uyumlu 7 tool:
- `atlas.products.list` — Ürün & stok sorgulama
- `atlas.orders.list` — Sipariş listeleme
- `atlas.tasks.list` — Süreç görevleri
- `atlas.tasks.update` — Görev durumu güncelleme
- `atlas.tickets.create` — Destek talebi oluşturma
- `atlas.inventory.alerts` — Düşük stok uyarıları
- `atlas.documents.list` — Belge listeleme

### Anticipatory Intelligence

Proaktif öneri motoru (`src/lib/ai/anticipatory.ts`):
- **Stok Tükenme Tahmini**: Doğrusal burn rate analizi
- **Süreç Tamamlanma Tahmini**: Kalan görev x ortalama süre
- **Akıllı Bildirim**: Kullanıcının aktif saatlerinde
- **Maliyet Optimizasyonu**: Toplu gönderim, depo kullanımı önerileri
- **Görev Hatırlatıcıları**: Bloke & devam eden görevler

---

## UI / UX

### Design Tokens (OKLCH)

- **Primary**: `oklch(0.7 0.15 250)` — Mavi
- **Secondary**: `oklch(0.6 0.2 300)` — Mor
- **Accent**: `oklch(0.75 0.15 180)` — Teal

### Ambient UX

- **Cam Morfoloji** (Glass Morphism): `backdrop-blur`, custom glass cards
- **Gradient Animasyonlar**: Framer Motion ile premium geçişler
- **Spatial Engine**: Depth layer sistemi, sticky header parallax
- **Dark Mode**: Varsayılan, `next-themes` ile geçiş
- **Prefers Reduced Motion**: Tüm animasyonlar saygılı

### Bileşenler

26+ shadcn/ui bileşeni: Accordion, Alert, Avatar, Badge, Button, Calendar, Card, Chart, Checkbox, Command, DataTable, DatePicker, Dialog, DropdownMenu, Form, Input, Label, Popover, Progress, Select, Separator, Sheet, Skeleton, Sonner (Toast), Table, Tabs, Textarea, Tooltip...

---

## Test Altyapısı

### Unit Tests (Vitest 4)

**138 test** across **12 dosya**, tamamı geçiyor:

| Dosya | Kapsam |
|-------|--------|
| `auth-guards.test.ts` | Auth middleware, rol kontrolleri |
| `correlation.test.ts` | Correlation ID üretimi & propagation |
| `enums.test.ts` | Veritabanı enum validasyonları |
| `env-validation.test.ts` | Zod environment schema |
| `error-tracking.test.ts` | Hata yakalama & raporlama |
| `logger.test.ts` | Structured JSON logger |
| `mini-charts.test.tsx` | SVG mini grafikler (Bar, Donut, Sparkline) |
| `query-keys.test.ts` | Unified query key factory |
| `rate-limit.test.ts` | Token bucket rate limiter |
| `schemas.test.ts` | Zod form validasyon şemaları |
| `use-pagination.test.ts` | usePagination hook |
| `utils.test.ts` | Utility fonksiyonlar (cn, formatDate, vb.) |

### E2E Tests (Playwright)

3 test suite:
- `marketing.spec.ts` — Landing, about, pricing sayfaları
- `auth.spec.ts` — Login/register akışları
- `api.spec.ts` — Health & MCP endpoint'leri

### Komutlar

```bash
npm test              # Vitest (tek sefer)
npm run test:watch    # Vitest (watch mode)
npm run test:coverage # Coverage raporu
npm run e2e           # Playwright E2E
npm run e2e:ui        # Playwright UI mode
npm run validate      # typecheck + lint + test + build (full CI)
```

---

## Güvenlik

### HTTP Security Headers

- `Strict-Transport-Security`: HSTS (1 yıl, includeSubDomains, preload)
- `Content-Security-Policy`: Strict CSP
- `X-Frame-Options`: DENY
- `X-Content-Type-Options`: nosniff
- `X-DNS-Prefetch-Control`: off
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: camera=(), microphone=(), geolocation=()

### Rate Limiting

Token bucket algoritması ile endpoint koruması:
- `/api/*`: 100 req/dakika
- `/api/copilot`: 30 req/dakika
- `/api/mcp`: 60 req/dakika

### Auth

- Supabase SSR auth ile cookie-based oturum
- Role-based access control (admin/customer)
- Invite token güvenlik doğrulaması
- Middleware tabanlı route koruması

---

## Observability

### Structured Logging

JSON formatında log çıktısı:
```json
{
  "level": "info",
  "message": "Order created",
  "timestamp": "2025-01-15T10:30:00Z",
  "correlationId": "abc-123",
  "userId": "usr_xxx",
  "metadata": { "orderId": "ord_yyy" }
}
```

### Correlation IDs

Her HTTP isteğine UUID correlation ID atanır. Request → Response → Loglar arasında izlenebilirlik sağlar.

### Error Tracking

Merkezi hata yakalama modülü:
- Hata severity sınıflandırması (low/medium/high/critical)
- Stack trace capture
- Context enrichment (userId, route, correlationId)
- Production'da external service'e gönderim ready

### Health Endpoint

`GET /api/health` — JSON yanıt:
```json
{
  "status": "healthy",
  "version": "0.3.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 3600
}
```

---

## SEO & Metadata

- **robots.ts**: Dinamik `robots.txt` üretimi
- **sitemap.ts**: Dinamik XML sitemap
- **OG / Twitter Cards**: Her sayfa için Open Graph ve Twitter metadata
- **Canonical URL**: Duplicate content önlemi
- **Structured Data**: JSON-LD ve semantik HTML

---

## CI/CD Pipeline

`.github/workflows/ci.yml` — 5 paralel job:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Quality  │ │  Test    │ │  Build   │ │ Security │ │   E2E    │
│ lint+type│ │ vitest   │ │ next     │ │ audit    │ │playwright│
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Git Hooks (Husky + lint-staged)

Pre-commit:
- `*.{ts,tsx}` → `eslint --fix` + `vitest related --run`
- `*.{json,md,yml}` → `prettier --write`

### Dependabot

Haftalık dependency güncellemeleri için `.github/dependabot.yml` yapılandırılmış.

---

## Erişilebilirlik (a11y)

- **Skip to Content**: Tüm layout'larda `<a href="#main-content">` bağlantısı
- **`main-content` ID**: Tüm ana içerik alanlarında
- **Semantic HTML**: `<main>`, `<nav>`, `<section>`, `<article>`
- **ARIA Labels**: Tüm interaktif elemanlar
- **Keyboard Navigation**: Tab order, focus management
- **Prefers Reduced Motion**: Animasyonlar otomatik devre dışı
- **Color Contrast**: WCAG 2.1 AA uyumlu

---

## Kurulum

### Gereksinimler

- Node.js 20+
- npm 10+
- Supabase hesabı (local veya cloud)

### 1. Repository'yi klonlayın

```bash
git clone https://github.com/your-org/atlas-platform.git
cd atlas-platform
```

### 2. Bağımlılıkları kurun

```bash
npm install
```

### 3. Environment değişkenlerini ayarlayın

```bash
cp .env.example .env.local
```

Gerekli değişkenler:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

### 4. Veritabanı migration'larını çalıştırın

```bash
npx supabase db push
```

### 5. Geliştirme sunucusunu başlatın

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

---

## Scriptler

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Turbopack ile geliştirme sunucusu |
| `npm run build` | Production build |
| `npm start` | Production sunucu |
| `npm run lint` | ESLint kontrolü |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm test` | Vitest unit testler |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage raporu |
| `npm run e2e` | Playwright E2E |
| `npm run e2e:ui` | Playwright UI mode |
| `npm run validate` | Tam CI doğrulama (type + lint + test + build) |

---

## Proje Fazları

### Faz 1 — Temel Altyapı ✅

- Next.js 16 + React 19 + TypeScript strict kurulumu
- Supabase SSR auth + 11 tablo + RLS politikaları
- shadcn/ui 26+ bileşen + design token sistemi
- Ambient UX (spatial engine, cam morfoloji, gradient)
- Zustand store + TanStack Query altyapısı
- Marketing sayfaları (landing, about, pricing, contact)

### Faz 2 — Uygulama Katmanı ✅

- Admin dashboard + müşteri paneli (tüm CRUD sayfaları)
- Server Actions ile mutation'lar
- Seed data (demo kullanıcılar & veriler)
- DataTable + pagination + sıralama + filtreleme
- SVG mini grafikler (MiniBar, MiniDonut, Sparkline)
- Realtime hooks (Supabase subscription)

### Faz 3 — AI & CopilotKit ✅

- CopilotKit v1.52.0 entegrasyonu (7 aksiyon + 2 readable)
- 4-ajan mimarisi (modüler ayrıştırma)
- MCP JSON-RPC 2.0 server (7 tool, handler'lar ayrı modülde)
- AG-UI event sistemi
- Anticipatory Intelligence motoru
- FSM state machine + geçiş log tablosu

### Faz 4 — Production-Grade Altyapı ✅

- Security headers (HSTS, CSP, X-Frame, Permissions-Policy)
- Rate limiting (token bucket)
- Structured JSON logger + correlation IDs
- Error tracking modülü
- Zod environment validation
- SEO (robots.ts, sitemap.ts, OG/Twitter metadata)
- a11y (skip-to-content, semantic HTML, reduced motion)
- 138 unit test + 3 E2E suite
- GitHub Actions CI/CD (5 job)
- Husky + lint-staged pre-commit
- Dependabot haftalık güncellemeleri

---

## Commit Geçmişi

| Hash | Açıklama |
|------|----------|
| `d29775e` | Faz 1 — Temel altyapı |
| `a2137db` | Bileşen kataloğu & spatial engine |
| `1cdd62a` | Faz 2 — Mutations, admin, seed data |
| `57400a5` | CopilotKit entegrasyonu |
| `e04855d` | Premium UI overhaul |
| `8c758ed` | Production infra (error/loading/not-found, Zod env, SEO) |
| `9032034` | Vitest + Realtime + Pagination + SVG Charts |
| `f3a9abc` | Pagination wired + query refactor |
| `46dc309` | Security headers, rate limiting, logger, CI/CD, a11y |
| `d090ec5` | CTO 10/10 push (query keys, E2E, observability, SEO) |

---

## Lisans

MIT License — Detaylar için [LICENSE](LICENSE) dosyasına bakın.
