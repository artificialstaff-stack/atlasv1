# Atlas Platform — B2B SaaS + Spatial Intelligence

> **CTO Referans Mimarisi 2026** — 4 Sütun, 5 Faz, 40 Hafta

Atlas, B2B e-ticaret, envanter yönetimi ve mekansal zeka yeteneklerini tek bir platformda birleştiren yeni nesil SaaS çözümüdür. React 19 Compiler-era, AI Ajanik Yığın (CopilotKit + AG-UI + MCP) ve WebGPU destekli mekansal işleme motoru üzerine inşa edilmiştir.

---

## Mimari — 4 Sütun

```
┌─────────────────────────────────────────────────────────────┐
│                    Atlas Platform 2026                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Sütun 1     │  Sütun 2     │  Sütun 3     │  Sütun 4       │
│  UI/UX &     │  Generative  │  Core App &  │  Spatial        │
│  Design      │  UI & AI     │  State       │  Render         │
│  System      │  Layer       │  Management  │  Engine          │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Zero Drift   │ CopilotKit   │ React 19     │ WebGPU          │
│ A2UI Catalog │ AG-UI Proto  │ RSC + Actions│ Deck.gl v9      │
│ Ambient UX   │ MCP Tools    │ Zustand v5   │ MapLibre v5     │
│ Design Tokens│ Gatekeeper   │ TanStack Q5  │ A5 DGGS         │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### Sütun 1 — UI/UX & Design System
- **Zero Drift Token Sistemi**: Figma → Kod otomatik senkronizasyon (`src/lib/design-tokens.ts`)
- **A2UI Bileşen Kataloğu**: Makine-okunur, AI uyumlu bileşen tanımları (`src/lib/component-catalog.ts`)
- **Ambient UX**: Anlamlı mikro-animasyonlar ve geçişler (`src/lib/ambient-ux.ts`)
- **shadcn/ui**: 26+ UI primitifi (Tailwind CSS v4 tabanlı)

### Sütun 2 — Generative UI & AI Layer
- **CopilotKit + AG-UI**: Gerçek zamanlı ajan-kullanıcı etkileşimi (`src/lib/ai/`)
- **MCP (Model Context Protocol)**: Standart araç katmanı — veritabanı, mekansal analiz
- **Gatekeeper Agent**: Savunma ajanı — ham HTML yasağı, güven skoru kontrolü
- **Human-in-the-Loop**: Düşük güvenli eylemlerde kullanıcı onayı

### Sütun 3 — Core App & State Management
- **React 19.2.3**: Server Components + Actions + Compiler-era
- **Next.js 16 (App Router)**: Turbopack, Edge Runtime, RSC Streaming
- **TanStack Query v5**: Server state (cache, deduplication, optimistic)
- **Zustand v5**: Client state (UI, notification, spatial, agent)

### Sütun 4 — Spatial Render Engine
- **WebGPU/WebGL2**: GPU-hızlandırılmış render (`src/lib/spatial/`)
- **Deck.gl v9**: 8 katman tipi (scatterplot, heatmap, pentagon, arc...)
- **MapLibre v5**: Vektör harita, 3 ücretsiz stil (Positron, Dark Matter, Voyager)
- **A5 DGGS**: Beşgen küresel grid — 11 çözünürlük seviyesi

---

## Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19.2.3 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui (new york) | latest |
| Database | Supabase (PostgreSQL 17) | SSR |
| Server State | TanStack React Query | v5 |
| Client State | Zustand | v5 |
| Validation | Zod | v4 |
| Testing | Vitest + Testing Library | v4 |
| Animation | Framer Motion | v12 |
| AI Layer | CopilotKit + AG-UI + MCP | Phase 4 |
| Spatial | Deck.gl + MapLibre + WebGPU | Phase 3 |

---

## Proje Yapısı

```
atlas-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/        # Pazarlama sayfaları
│   │   ├── (auth)/             # Login/Register
│   │   ├── (admin)/            # Yönetici paneli
│   │   └── (client)/           # Müşteri paneli
│   ├── components/
│   │   ├── layouts/            # Navbar, Footer, Sidebar
│   │   ├── shared/             # ErrorBoundary, Loading, Modal
│   │   └── ui/                 # shadcn/ui primitifleri (26+)
│   ├── features/               # Feature-based modules
│   │   ├── auth/               # Kimlik doğrulama
│   │   ├── customers/          # Müşteri yönetimi
│   │   ├── inventory/          # Envanter
│   │   ├── leads/              # Potansiyel müşteriler
│   │   ├── orders/             # Sipariş yönetimi
│   │   ├── support/            # Destek talepleri
│   │   └── workflows/          # İş akışları
│   ├── lib/
│   │   ├── ai/                 # ★ AI/Agent Layer (Sütun 2)
│   │   │   ├── agent-types.ts  # Ajan tipleri & Gatekeeper kuralları
│   │   │   ├── mcp-config.ts   # MCP sunucu & araç tanımları
│   │   │   ├── ag-ui-runtime.ts # AG-UI runtime & state yönetimi
│   │   │   └── index.ts
│   │   ├── spatial/            # ★ Spatial Engine (Sütun 4)
│   │   │   ├── spatial-config.ts # WebGPU, Deck.gl, A5 DGGS, MapLibre
│   │   │   └── index.ts
│   │   ├── hooks/              # Custom hooks (pagination, realtime)
│   │   ├── store/              # Zustand mağazaları
│   │   ├── supabase/           # Supabase istemcileri
│   │   ├── env.ts              # Zod ortam değişken validasyonu
│   │   ├── design-tokens.ts    # ★ Zero Drift token sistemi
│   │   ├── component-catalog.ts # ★ A2UI bileşen kataloğu
│   │   ├── ambient-ux.ts       # ★ Ambient UX animasyonları
│   │   └── utils.ts            # Yardımcı fonksiyonlar
│   ├── __tests__/              # Vitest test dosyaları
│   ├── types/                  # TypeScript tip tanımları
│   └── middleware.ts           # Edge RBAC middleware
├── supabase/                   # Şema, migration, seed
└── public/                     # Statik dosyalar
```

> ★ işaretli dosyalar bu mimarinin yeni eklenen temel parçalarıdır.

---

## Geliştirme Fazları

| Faz | Sprint | Süre | Odak |
|-----|--------|------|------|
| **Faz 1** | 1-4 | 8 hafta | Foundation & Design System |
| **Faz 2** | 5-8 | 8 hafta | Core App & Business Logic |
| **Faz 3** | 9-13 | 10 hafta | Spatial Render Engine |
| **Faz 4** | 14-17 | 8 hafta | AI & Generative UI |
| **Faz 5** | 18-20 | 6 hafta | Performance & Launch |

### Faz 1 — Foundation & Design System ✅
- [x] Next.js 16 + React 19 + TypeScript strict mode
- [x] Supabase auth (SSR cookie-based) + RBAC middleware
- [x] shadcn/ui 26+ component + Tailwind CSS v4
- [x] Zero Drift design token sistemi
- [x] A2UI makine-okunur bileşen kataloğu
- [x] Ambient UX animasyon altyapısı
- [x] AI ajan katmanı temel tipleri & Gatekeeper
- [x] Spatial engine konfigürasyon & WebGPU algılama

### Faz 2 — Core App & Business Logic ✅
- [x] 11-tablo Supabase şeması + RLS + seed data
- [x] Server Actions — CRUD (orders, leads, inventory, support, invitations)
- [x] TanStack Query entegrasyonu (queries + mutations + optimistic updates)
- [x] Admin paneli (Dashboard, Siparişler, Müşteriler, Envanter, Leads, Destek, Davetler)
- [x] Client paneli (Dashboard, Siparişler, Destek)
- [x] CopilotKit v1.52.0 entegrasyonu (7 action + 2 readable + MCP server)
- [x] Premium UI overhaul — framer-motion, glass morphism, gradient animations

### Faz 2.5 — Production Hardening ✅
- [x] Error/Loading/Not-found sayfaları tüm route grupları (10 dosya)
- [x] Zod environment validation (`src/lib/env.ts`)
- [x] SEO metadata tüm route'larda
- [x] Davet token güvenlik düzeltmesi (tek kullanım)
- [x] **Vitest 4.0 + Testing Library** — 112 test, 10 dosya, %100 pass
- [x] **Realtime hooks** — Supabase postgres_changes → TanStack Query invalidation
- [x] **Pagination** — `usePagination` hook + `DataTablePagination` UI (Orders + Support)
- [x] **Mini Charts** — SVG-based MiniBarChart, MiniDonut, Sparkline (bağımlılıksız)
- [x] **Dashboard grafikleri** — Sipariş dağılımı + kapasite donut'ları
- [x] **Security Headers** — HSTS, CSP, X-Frame-Options, Permissions-Policy (`next.config.ts`)
- [x] **Rate Limiting** — Sliding window, endpoint-bazlı (API/Auth/Contact/MCP/Webhook)
- [x] **Optimistic Updates** — Order status + Lead status mutations
- [x] **Structured Logging** — JSON logger, child loggers, log levels
- [x] **Deep Health Check** — `/api/health` (DB, Auth, Env kontrolü)
- [x] **CI/CD** — GitHub Actions (lint + typecheck + test + build + security audit)
- [x] **Pre-commit Hooks** — Husky + lint-staged (eslint + vitest related)
- [x] **A11y** — SkipToContent, aria-label'lar, keyboard navigation
- [x] **Query Key Factory** — Centralized, type-safe, testable

---

## Başlangıç

```bash
# Bağımlılıkları kur
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Testleri çalıştır
npm test              # Tek seferlik (112 test)
npm run test:watch    # İzleme modu
npm run test:coverage # Kapsam raporu

# Kod kalite kontrol
npm run typecheck     # TypeScript strict
npm run lint          # ESLint
npm run validate      # typecheck + lint + test + build (full CI)

# Supabase lokal geliştirme
npx supabase start
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## Güvenlik İlkeleri

- **Security Headers**: HSTS, CSP, X-Frame-Options, X-XSS-Protection, Permissions-Policy
- **Rate Limiting**: Sliding-window, IP-bazlı — API (60/dk), Auth (10/dk), Contact (3/dk)
- **RBAC**: Admin/Client/Moderator/Viewer rol bazlı erişim kontrolü (Edge Middleware)
- **Gatekeeper Agent**: Her AI aksiyonu denetim kurallarından geçer
- **Human-in-the-Loop**: Güven skoru < 0.7 olan eylemler kullanıcı onayı gerektirir
- **A2UI Yasağı**: Ajanlar ham HTML/CSS üretemez — yalnızca katalog bileşenleri
- **Zod Validation**: Env değişkenleri, form şemaları, API input'ları
- **Dark Pattern Yasağı**: Sahte aciliyet, duygusal CTA, manipülatif UI yasak

---

## Lisans

Private — Tüm hakları saklıdır.
