-- =============================================================================
-- ATLAS PLATFORM — Kapsamlı İş Modülleri
-- Müşteri LLC, Pazaryeri, Sosyal Medya, Reklam, Finans, Depo Yönetimi
-- Supabase Dashboard > SQL Editor — TEK SEFERDE çalıştır
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CUSTOMER COMPANIES (LLC / Şirket Yönetimi)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.customer_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Şirket Bilgileri
  company_name TEXT NOT NULL,                      -- "ABC Trading LLC"
  company_type TEXT NOT NULL DEFAULT 'llc'
    CHECK (company_type IN ('llc','corporation','sole_proprietorship','partnership','other')),
  state_of_formation TEXT NOT NULL,                -- "Wyoming", "Delaware", "Florida"
  ein_number TEXT,                                 -- IRS Employer ID
  formation_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','formation_in_progress','active','suspended','dissolved')),

  -- Registered Agent
  registered_agent_name TEXT,
  registered_agent_address TEXT,

  -- Business Address
  business_address_line1 TEXT,
  business_address_line2 TEXT,
  business_city TEXT,
  business_state TEXT,
  business_zip TEXT,
  business_country TEXT DEFAULT 'US',

  -- Bank
  bank_name TEXT,
  bank_account_status TEXT DEFAULT 'not_opened'
    CHECK (bank_account_status IN ('not_opened','pending','active','closed')),

  -- İletişim
  company_phone TEXT,
  company_email TEXT,
  website TEXT,

  -- Notlar
  notes TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_companies_user ON public.customer_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_companies_status ON public.customer_companies(status);
ALTER TABLE public.customer_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_customer_read" ON public.customer_companies;
CREATE POLICY "companies_customer_read" ON public.customer_companies
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "companies_admin_all" ON public.customer_companies;
CREATE POLICY "companies_admin_all" ON public.customer_companies
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. MARKETPLACE ACCOUNTS (Pazaryeri Hesapları)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.marketplace_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.customer_companies(id) ON DELETE SET NULL,

  platform TEXT NOT NULL
    CHECK (platform IN (
      'amazon','ebay','walmart','etsy','shopify',
      'tiktok_shop','facebook_marketplace','google_shopping',
      'target_plus','wayfair','other'
    )),
  store_name TEXT NOT NULL,
  store_url TEXT,
  seller_id TEXT,                                  -- Platform seller ID
  status TEXT NOT NULL DEFAULT 'pending_setup'
    CHECK (status IN (
      'pending_setup','under_review','active','suspended',
      'vacation_mode','closed'
    )),

  -- Performans
  seller_rating NUMERIC(3,2),                      -- 4.85
  total_listings INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  monthly_revenue NUMERIC(12,2) DEFAULT 0,

  -- Erişim
  api_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,

  notes TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_user ON public.marketplace_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_platform ON public.marketplace_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_status ON public.marketplace_accounts(status);
ALTER TABLE public.marketplace_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_customer_read" ON public.marketplace_accounts;
CREATE POLICY "marketplace_customer_read" ON public.marketplace_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "marketplace_admin_all" ON public.marketplace_accounts;
CREATE POLICY "marketplace_admin_all" ON public.marketplace_accounts
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SOCIAL MEDIA ACCOUNTS (Sosyal Medya Hesapları)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.social_media_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.customer_companies(id) ON DELETE SET NULL,

  platform TEXT NOT NULL
    CHECK (platform IN (
      'instagram','facebook','tiktok','youtube','twitter_x',
      'pinterest','linkedin','snapchat','threads','other'
    )),
  account_name TEXT NOT NULL,                      -- @username
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_setup'
    CHECK (status IN ('pending_setup','active','suspended','deactivated')),

  -- Metrikler
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,          -- yüzde olarak

  -- Yönetim
  managed_by_us BOOLEAN DEFAULT true,              -- Biz mi yönetiyoruz?
  content_calendar_url TEXT,
  last_post_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,

  notes TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_media_user ON public.social_media_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_platform ON public.social_media_accounts(platform);
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_customer_read" ON public.social_media_accounts;
CREATE POLICY "social_customer_read" ON public.social_media_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_admin_all" ON public.social_media_accounts;
CREATE POLICY "social_admin_all" ON public.social_media_accounts
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. AD CAMPAIGNS (Reklam Kampanyaları)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.customer_companies(id) ON DELETE SET NULL,
  marketplace_id UUID REFERENCES public.marketplace_accounts(id) ON DELETE SET NULL,
  social_media_id UUID REFERENCES public.social_media_accounts(id) ON DELETE SET NULL,

  campaign_name TEXT NOT NULL,
  platform TEXT NOT NULL
    CHECK (platform IN (
      'google_ads','facebook_ads','instagram_ads','tiktok_ads',
      'amazon_ppc','walmart_ads','ebay_promoted','pinterest_ads',
      'youtube_ads','snapchat_ads','twitter_ads','other'
    )),
  campaign_type TEXT NOT NULL DEFAULT 'awareness'
    CHECK (campaign_type IN ('awareness','traffic','conversion','retargeting','brand','other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','active','paused','completed','cancelled')),

  -- Bütçe
  daily_budget NUMERIC(10,2),
  total_budget NUMERIC(12,2),
  spent_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Tarihler
  start_date DATE,
  end_date DATE,

  -- Performans
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_generated NUMERIC(12,2) DEFAULT 0,
  roas NUMERIC(8,2) DEFAULT 0,                     -- Return on Ad Spend
  cpc NUMERIC(8,4) DEFAULT 0,                      -- Cost per Click
  ctr NUMERIC(5,2) DEFAULT 0,                      -- Click-through Rate %

  -- Hedefleme
  target_audience TEXT,
  target_locations TEXT[],
  target_keywords TEXT[],

  notes TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user ON public.ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON public.ad_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(status);
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_customer_read" ON public.ad_campaigns;
CREATE POLICY "ads_customer_read" ON public.ad_campaigns
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ads_admin_all" ON public.ad_campaigns;
CREATE POLICY "ads_admin_all" ON public.ad_campaigns
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. FINANCIAL RECORDS (Gelir/Gider Takibi)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.customer_companies(id) ON DELETE SET NULL,

  record_type TEXT NOT NULL
    CHECK (record_type IN ('income','expense')),
  category TEXT NOT NULL
    CHECK (category IN (
      -- Gelir
      'marketplace_sales','direct_sales','refund_received','other_income',
      -- Gider
      'warehouse_rent','warehouse_labor','shipping_domestic','shipping_international',
      'customs_duty','customs_clearance','packaging','product_cost',
      'marketplace_fees','advertising','social_media_management',
      'llc_formation','llc_annual_fee','registered_agent','bookkeeping',
      'tax_filing','insurance','software_tools','bank_fees',
      'return_processing','other_expense'
    )),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- İlişkili kayıtlar
  marketplace_id UUID REFERENCES public.marketplace_accounts(id) ON DELETE SET NULL,
  ad_campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- Belge
  receipt_url TEXT,
  invoice_ref TEXT,

  -- Onay
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  notes TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_records_user ON public.financial_records(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON public.financial_records(record_type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON public.financial_records(category);
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON public.financial_records(transaction_date DESC);
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_customer_read" ON public.financial_records;
CREATE POLICY "finance_customer_read" ON public.financial_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "finance_admin_all" ON public.financial_records;
CREATE POLICY "finance_admin_all" ON public.financial_records
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. WAREHOUSE ITEMS (Depo Yönetimi — ABD Deposu)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.warehouse_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,

  warehouse_location TEXT NOT NULL DEFAULT 'US_MAIN',  -- depo lokasyonu
  bin_number TEXT,                                      -- raf/bölüm numarası
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_type TEXT DEFAULT 'piece'
    CHECK (unit_type IN ('piece','box','pallet','kg','lbs')),

  -- Maliyet
  storage_cost_monthly NUMERIC(10,2) DEFAULT 0,
  last_counted_at TIMESTAMPTZ,
  last_movement_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock','reserved','shipping','returned','damaged','disposed')),

  sku TEXT,
  barcode TEXT,
  notes TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_items_user ON public.warehouse_items(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_product ON public.warehouse_items(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_status ON public.warehouse_items(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_sku ON public.warehouse_items(sku);
ALTER TABLE public.warehouse_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouse_customer_read" ON public.warehouse_items;
CREATE POLICY "warehouse_customer_read" ON public.warehouse_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "warehouse_admin_all" ON public.warehouse_items;
CREATE POLICY "warehouse_admin_all" ON public.warehouse_items
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. SHIPMENTS (Kargo/Sevkiyat Takibi — TR→US, US→Müşteri)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  shipment_type TEXT NOT NULL
    CHECK (shipment_type IN ('turkey_to_us','us_domestic','us_to_customer','return')),
  carrier TEXT,                                    -- FedEx, UPS, USPS, DHL, vb.
  tracking_number TEXT,
  tracking_url TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending','picked_up','in_transit','customs_clearance',
      'out_for_delivery','delivered','returned','lost'
    )),

  -- Adresler
  origin_address TEXT,
  destination_address TEXT,

  -- Maliyet
  shipping_cost NUMERIC(10,2),
  insurance_cost NUMERIC(10,2) DEFAULT 0,
  customs_cost NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Ağırlık / Boyut
  weight_kg NUMERIC(8,2),
  dimensions TEXT,                                 -- "30x20x15 cm"

  -- Tarihler
  shipped_at TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  notes TEXT,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_user ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.shipments(tracking_number);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipments_customer_read" ON public.shipments;
CREATE POLICY "shipments_customer_read" ON public.shipments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shipments_admin_all" ON public.shipments;
CREATE POLICY "shipments_admin_all" ON public.shipments
  FOR ALL USING ((SELECT auth.jwt()->'app_metadata'->>'user_role') IN ('admin','super_admin'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'customer_companies','marketplace_accounts','social_media_accounts',
    'ad_campaigns','financial_records','warehouse_items','shipments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- REALTIME (Anlık güncelleme)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_accounts;
EXCEPTION WHEN others THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_campaigns;
EXCEPTION WHEN others THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
EXCEPTION WHEN others THEN NULL;
END; $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- BİTTİ! 7 yeni tablo, indexler, RLS policy'leri ve trigger'lar uygulandı.
-- ═══════════════════════════════════════════════════════════════════════════════
