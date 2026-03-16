-- =============================================================================
-- ATLAS PLATFORM — Kapsamlı Test Verisi (Seed Data)
-- =============================================================================
-- 
-- KULLANIM:
--   psql -h <HOST> -U postgres -d postgres -f supabase/seed.sql
--   VEYA Supabase Dashboard → SQL Editor → bu dosyayı çalıştır
--
-- ÖNEMLİ:
--   1. Bu seed dosyası local/dev ortamı için auth.users test kayıtlarını da üretir.
--   2. Production/remote ortamda auth kullanıcıları admin API üzerinden açılmalıdır.
--   3. Aşağıdaki UUID'ler tekrar üretilebilir demo verisi içindir.
-- =============================================================================

-- Temiz başlangıç (sıralama FK bağımlılıklarına göre)
TRUNCATE public.order_items CASCADE;
TRUNCATE public.inventory_movements CASCADE;
TRUNCATE public.orders CASCADE;
TRUNCATE public.products CASCADE;
TRUNCATE public.process_tasks CASCADE;
TRUNCATE public.support_tickets CASCADE;
TRUNCATE public.user_subscriptions CASCADE;
TRUNCATE public.invitations CASCADE;
TRUNCATE public.contact_submissions CASCADE;
TRUNCATE public.user_roles CASCADE;
TRUNCATE public.users CASCADE;

DELETE FROM auth.refresh_tokens
WHERE user_id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003'
);

DELETE FROM auth.users
WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003'
);

-- =============================================================================
-- SABIT UUID'LER (Tekrar Üretilebilir Demo Verisi)
-- =============================================================================
-- Admin: Elif Öztürk
--   auth UUID: a1000000-0000-0000-0000-000000000001
-- Admin: Burak Arslan
--   auth UUID: a1000000-0000-0000-0000-000000000002
-- Customer: Ahmet Yılmaz (Yılmaz Tekstil)
--   auth UUID: c1000000-0000-0000-0000-000000000001
-- Customer: Fatma Demir (Demir Gıda)
--   auth UUID: c1000000-0000-0000-0000-000000000002
-- Customer: Mehmet Kaya (Kaya Elektronik)
--   auth UUID: c1000000-0000-0000-0000-000000000003

-- =============================================================================
-- 0. AUTH USERS — Local geliştirme giriş kayıtları
-- =============================================================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token,
  email_change
)
VALUES
  (
    NULL,
    'a1000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'elif@atlaslojitr.com',
    crypt('Atlas2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"super_admin"}'::jsonb,
    '{"first_name":"Elif","last_name":"Öztürk","company_name":"Atlas Lojistik"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    NULL,
    'a1000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'burak@atlaslojitr.com',
    crypt('Atlas2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"admin"}'::jsonb,
    '{"first_name":"Burak","last_name":"Arslan","company_name":"Atlas Lojistik"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    NULL,
    'c1000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'ahmet@yilmaztekstil.com',
    crypt('Musteri2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"customer"}'::jsonb,
    '{"first_name":"Ahmet","last_name":"Yılmaz","company_name":"Yılmaz Tekstil Ltd."}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    NULL,
    'c1000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'fatma@demirgida.com',
    crypt('Musteri2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"customer"}'::jsonb,
    '{"first_name":"Fatma","last_name":"Demir","company_name":"Demir Gıda A.Ş."}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    NULL,
    'c1000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'mehmet@kayaelektronik.com',
    crypt('Musteri2025!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"customer"}'::jsonb,
    '{"first_name":"Mehmet","last_name":"Kaya","company_name":"Kaya Elektronik"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  aud = EXCLUDED.aud,
  role = EXCLUDED.role,
  encrypted_password = EXCLUDED.encrypted_password,
  confirmed_at = EXCLUDED.confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- =============================================================================
-- 1. USERS — Profil Kayıtları
-- =============================================================================
INSERT INTO public.users (id, email, first_name, last_name, company_name, tax_id, phone, onboarding_status)
VALUES
  -- Adminler
  ('a1000000-0000-0000-0000-000000000001', 'elif@atlaslojitr.com', 'Elif', 'Öztürk', 'Atlas Lojistik', '1234567890', '+905301112233', 'active'),
  ('a1000000-0000-0000-0000-000000000002', 'burak@atlaslojitr.com', 'Burak', 'Arslan', 'Atlas Lojistik', '1234567891', '+905302223344', 'active'),
  -- Müşteriler
  ('c1000000-0000-0000-0000-000000000001', 'ahmet@yilmaztekstil.com', 'Ahmet', 'Yılmaz', 'Yılmaz Tekstil Ltd.', 'TR1234567', '+905551234567', 'active'),
  ('c1000000-0000-0000-0000-000000000002', 'fatma@demirgida.com', 'Fatma', 'Demir', 'Demir Gıda A.Ş.', 'TR7654321', '+905559876543', 'onboarding'),
  ('c1000000-0000-0000-0000-000000000003', 'mehmet@kayaelektronik.com', 'Mehmet', 'Kaya', 'Kaya Elektronik', 'TR9999999', '+905557654321', 'verifying')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. USER_ROLES — RBAC Rolleri
-- =============================================================================
INSERT INTO public.user_roles (user_id, role, is_active)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'super_admin', true),
  ('a1000000-0000-0000-0000-000000000002', 'admin', true),
  ('c1000000-0000-0000-0000-000000000001', 'customer', true),
  ('c1000000-0000-0000-0000-000000000002', 'customer', true),
  ('c1000000-0000-0000-0000-000000000003', 'customer', true)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- 3. USER_SUBSCRIPTIONS — Abonelik Kayıtları
-- =============================================================================
INSERT INTO public.user_subscriptions (user_id, plan_tier, payment_status, amount, started_at, valid_until, notes)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'professional', 'cleared', 499.00,
    NOW() - INTERVAL '45 days', NOW() + INTERVAL '320 days',
    'Yıllık ödeme — havale ile yapıldı'),
  ('c1000000-0000-0000-0000-000000000002', 'growth', 'pending', 299.00,
    NOW() - INTERVAL '5 days', NOW() + INTERVAL '360 days',
    'Ödeme bekleniyor'),
  ('c1000000-0000-0000-0000-000000000003', 'starter', 'pending', 149.00,
    NOW() - INTERVAL '2 days', NOW() + INTERVAL '363 days',
    'Doğrulama aşamasında')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. CONTACT_SUBMISSIONS — CRM Lead Verileri
-- =============================================================================
INSERT INTO public.contact_submissions (name, email, phone, company_name, message, status, admin_notes, created_at)
VALUES
  ('Zeynep Aydın', 'zeynep@aydinmoda.com', '+905321110022', 'Aydın Moda',
    'Tekstil ürünlerimizi Amazon ABD''de satışa sunmak istiyoruz. Depolama ve fulfillment hizmetleriniz hakkında bilgi almak istiyorum.',
    'new', NULL, NOW() - INTERVAL '1 hour'),

  ('Hasan Çelik', 'hasan@celikinsaat.com', '+905441234567', 'Çelik İnşaat Malzemeleri',
    'İnşaat aksesuarları için ABD pazar araştırması yapıyoruz. Gümrükleme ve lojistik süreçleri hakkında detay istiyorum.',
    'new', NULL, NOW() - INTERVAL '3 hours'),

  ('Ayşe Korkut', 'ayse@naturelkozmetik.com', '+905551112233', 'Naturel Kozmetik',
    'Doğal kozmetik ürünlerimizi ABD''ye ihraç etmek istiyoruz. FDA süreçleri ve depolama hizmetleri konusunda danışmanlık lazım.',
    'new', NULL, NOW() - INTERVAL '6 hours'),

  ('Ali Şahin', 'ali@sahinsport.com', '+905339876543', 'Şahin Spor Giyim',
    'Spor giyim markamızı ABD pazarına taşımak istiyoruz. Shopify mağazası kurulumu ve fulfillment desteği arıyoruz.',
    'contacted', 'İlk görüşme yapıldı, ürün görselleri istendi. Hafta sonu tekrar aranacak.',
    NOW() - INTERVAL '2 days'),

  ('Deniz Yıldız', 'deniz@yildizseramik.com', '+905557778899', 'Yıldız Seramik',
    'El yapımı seramik ürünlerimizi Etsy üzerinden satmak istiyoruz. Kırılgan ürünler için özel paketleme hizmetiniz var mı?',
    'contacted', 'Özel paketleme çözümü sunuldu, fiyat teklifi hazırlanıyor.',
    NOW() - INTERVAL '3 days'),

  ('Berk Tuncer', 'berk@tuncerteknoloji.com', '+905446667788', 'Tuncer Teknoloji',
    'IoT cihazlarımızı Amazon FBA ile satmak istiyoruz. FCC sertifikasyonu ve gümrük süreçleri konusunda desteğe ihtiyacımız var.',
    'qualified', 'FCC sertifikası mevcut. Ürün uygunluk değerlendirmesi yapıldı. Davet gönderilecek.',
    NOW() - INTERVAL '5 days'),

  ('Ahmet Yılmaz', 'ahmet@yilmaztekstil.com', '+905551234567', 'Yılmaz Tekstil Ltd.',
    'Amazon FBA ile ABD pazarına açılmak istiyoruz. Paket fiyatlandırma hakkında bilgi almak istiyorum.',
    'converted', 'Professional plan ile müşteri oldu. Onboarding başladı.',
    NOW() - INTERVAL '50 days'),

  ('Can Güneş', 'can@gunesinsaat.com', '+905552223344', 'Güneş İnşaat',
    'Beton karıştırıcı makinelerini ABD''ye göndermek istiyoruz.',
    'rejected', 'Ürün boyutu ve ağırlığı mevcut depo kapasitemizle uyumsuz. Alternatif yönlendirildi.',
    NOW() - INTERVAL '10 days'),

  ('Fatma Demir', 'fatma@demirgida.com', '+905559876543', 'Demir Gıda A.Ş.',
    'Virginia deposunda ürünlerimizi depolamak ve Shopify üzerinden satış yapmak istiyoruz.',
    'converted', 'Growth plan ile müşteri oldu.',
    NOW() - INTERVAL '15 days'),

  ('Mehmet Kaya', 'mehmet@kayaelektronik.com', '+905557654321', 'Kaya Elektronik',
    'LLC kurulumu ve EIN kaydı süreçleri hakkında detaylı bilgi talep ediyorum.',
    'converted', 'Starter plan ile kayıt başlatıldı, doğrulama aşamasında.',
    NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. INVITATIONS — Davet Linkleri
-- =============================================================================
INSERT INTO public.invitations (email, token, plan_tier, status, expires_at, accepted_at)
VALUES
  ('ahmet@yilmaztekstil.com', 'inv-ahmet-001-accepted', 'professional', 'accepted',
    NOW() + INTERVAL '6 days', NOW() - INTERVAL '44 days'),
  ('fatma@demirgida.com', 'inv-fatma-002-accepted', 'growth', 'accepted',
    NOW() + INTERVAL '2 days', NOW() - INTERVAL '4 days'),
  ('mehmet@kayaelektronik.com', 'inv-mehmet-003-accepted', 'starter', 'accepted',
    NOW() + INTERVAL '5 days', NOW() - INTERVAL '1 day'),
  ('berk@tuncerteknoloji.com', 'inv-berk-004-pending', 'growth', 'pending',
    NOW() + INTERVAL '7 days', NULL),
  ('eski@firma.com', 'inv-expired-005', 'starter', 'expired',
    NOW() - INTERVAL '3 days', NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 6. PRODUCTS — Ürün Kataloğu (15 ürün, 3 müşteri)
-- =============================================================================
INSERT INTO public.products (id, owner_id, name, sku, hs_code, description, base_price, stock_turkey, stock_us, is_active)
VALUES
  -- Ahmet (Yılmaz Tekstil)
  ('p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
    'Premium Pamuklu T-Shirt', 'YT-TSH-001', '6109.10.00',
    '%100 Türk pamuğu, erkek basic t-shirt. S-XXL bedenler.', 12.50, 500, 120, true),
  ('p1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
    'Organik Havlu Seti (4lü)', 'YT-TWL-002', '6302.60.00',
    'GOTS sertifikalı organik pamuk havlu seti.', 24.00, 300, 75, true),
  ('p1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001',
    'Keten Masa Örtüsü', 'YT-TBL-003', '6302.51.00',
    'El dokuması Anadolu keten masa örtüsü. 150x220cm.', 35.00, 200, 45, true),
  ('p1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001',
    'Pamuklu Çorap (6lı Paket)', 'YT-SOC-004', '6115.95.00',
    'Antibakteriyel, nefes alabilir günlük çorap seti.', 8.50, 1000, 250, true),
  ('p1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001',
    'İpek Eşarp', 'YT-SCF-005', '6214.10.00',
    'Bursa ipeği, elle boyanmış kadın eşarp.', 45.00, 150, 5, true),
  -- Fatma (Demir Gıda)
  ('p1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000002',
    'Doğal Zeytinyağı (500ml)', 'DG-OIL-001', '1509.10.90',
    'Soğuk sıkım, extra virgin Ege zeytinyağı.', 14.00, 800, 200, true),
  ('p1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000002',
    'Organik Bal (450g)', 'DG-HON-002', '0409.00.00',
    'Anzer yaylası organik çiçek balı.', 22.00, 400, 90, true),
  ('p1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000002',
    'Antep Fıstığı (250g)', 'DG-PIS-003', '0802.51.00',
    'Gaziantep kavrulmuş tuzsuz Antep fıstığı.', 18.50, 600, 150, true),
  ('p1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000002',
    'Türk Lokumu Karışık (500g)', 'DG-DEL-004', '1704.90.00',
    'Geleneksel Türk lokumu, 6 çeşit karışık kutu.', 11.00, 1200, 300, true),
  ('p1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000002',
    'Baharat Seti (8li)', 'DG-SPC-005', '0910.99.00',
    'Sumak, pul biber, kekik, kimyon ve daha fazlası.', 16.00, 350, 8, true),
  -- Mehmet (Kaya Elektronik)
  ('p1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000003',
    'Akıllı Priz Wi-Fi', 'KE-PLG-001', '8536.69.00',
    'Alexa/Google uyumlu akıllı priz, enerji izleme.', 15.00, 2000, 400, true),
  ('p1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000003',
    'LED Şerit Işık (5m)', 'KE-LED-002', '9405.40.00',
    'RGB 16 milyon renk, uzaktan kumanda, Wi-Fi.', 19.00, 1500, 350, true),
  ('p1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000003',
    'USB-C Çoklu Hub', 'KE-HUB-003', '8471.60.00',
    '7-in-1: HDMI, USB 3.0 x3, SD, TF, PD 100W.', 28.00, 800, 180, true),
  ('p1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000003',
    'Kablosuz Şarj Standı', 'KE-CHR-004', '8504.40.00',
    '15W Qi kablosuz şarj, iPhone/Android uyumlu.', 22.00, 600, 140, true),
  ('p1000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000003',
    'Bluetooth Kulaklık', 'KE-EAR-005', '8518.30.00',
    'ANC destekli, 30 saat pil ömrü, IPX5.', 35.00, 400, 3, true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. INVENTORY_MOVEMENTS — Stok Hareketleri (30+)
-- =============================================================================
INSERT INTO public.inventory_movements (product_id, quantity_delta, movement_type, location, note, recorded_by, recorded_at)
VALUES
  -- Ahmet — US depo
  ('p1000000-0000-0000-0000-000000000001', 150, 'inbound_receipt', 'US',
    'İlk sevkiyat — Virginia depo, Konteyner #ATL-2024-001',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '40 days'),
  ('p1000000-0000-0000-0000-000000000001', -30, 'order_fulfillment', 'US',
    'Amazon FBA siparişleri — Ocak batch',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days'),
  ('p1000000-0000-0000-0000-000000000002', 100, 'inbound_receipt', 'US',
    'Havlu seti sevkiyatı — Virginia depo',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '38 days'),
  ('p1000000-0000-0000-0000-000000000002', -25, 'order_fulfillment', 'US',
    'Shopify siparişleri',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days'),
  ('p1000000-0000-0000-0000-000000000003', 50, 'inbound_receipt', 'US',
    'Masa örtüsü koleksiyonu — ilk parti',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '35 days'),
  ('p1000000-0000-0000-0000-000000000004', 300, 'inbound_receipt', 'US',
    'Çorap seti büyük sevkiyat',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days'),
  ('p1000000-0000-0000-0000-000000000004', -50, 'order_fulfillment', 'US',
    'Amazon + Walmart siparişleri',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'),
  ('p1000000-0000-0000-0000-000000000005', 20, 'inbound_receipt', 'US',
    'İpek eşarp — özel koleksiyon',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '28 days'),
  ('p1000000-0000-0000-0000-000000000005', -15, 'order_fulfillment', 'US',
    'Etsy siparişleri — premium segment',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'),
  -- Fatma — US depo
  ('p1000000-0000-0000-0000-000000000006', 250, 'inbound_receipt', 'US',
    'Zeytinyağı ilk parti — FDA onaylı etiket',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '12 days'),
  ('p1000000-0000-0000-0000-000000000006', -50, 'order_fulfillment', 'US',
    'Shopify Direct siparişleri',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days'),
  ('p1000000-0000-0000-0000-000000000007', 100, 'inbound_receipt', 'US',
    'Organik bal sevkiyatı',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days'),
  ('p1000000-0000-0000-0000-000000000008', 200, 'inbound_receipt', 'US',
    'Antep fıstığı — FDA sertifikalı ambalaj',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days'),
  ('p1000000-0000-0000-0000-000000000008', -50, 'order_fulfillment', 'US',
    'Amazon siparişleri',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days'),
  ('p1000000-0000-0000-0000-000000000009', 400, 'inbound_receipt', 'US',
    'Lokum büyük parti',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '8 days'),
  ('p1000000-0000-0000-0000-000000000009', -100, 'order_fulfillment', 'US',
    'Amazon + Etsy siparişleri',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
  ('p1000000-0000-0000-0000-000000000010', 50, 'inbound_receipt', 'US',
    'Baharat seti — deneme partisi',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '6 days'),
  ('p1000000-0000-0000-0000-000000000010', -42, 'order_fulfillment', 'US',
    'Hızlı satış — stok azalıyor',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day'),
  -- Mehmet — US depo
  ('p1000000-0000-0000-0000-000000000011', 500, 'inbound_receipt', 'US',
    'Akıllı priz ilk konteyner',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days'),
  ('p1000000-0000-0000-0000-000000000011', -100, 'order_fulfillment', 'US',
    'Amazon FBA siparişleri',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '8 days'),
  ('p1000000-0000-0000-0000-000000000012', 400, 'inbound_receipt', 'US',
    'LED şerit ışık sevkiyatı',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '18 days'),
  ('p1000000-0000-0000-0000-000000000012', -50, 'order_fulfillment', 'US',
    'Shopify siparişleri',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
  ('p1000000-0000-0000-0000-000000000013', 200, 'inbound_receipt', 'US',
    'USB-C hub — FCC sertifikalı',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'),
  ('p1000000-0000-0000-0000-000000000014', 150, 'inbound_receipt', 'US',
    'Kablosuz şarj standı',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days'),
  ('p1000000-0000-0000-0000-000000000015', 20, 'inbound_receipt', 'US',
    'Bluetooth kulaklık — deneme partisi',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days'),
  ('p1000000-0000-0000-0000-000000000015', -17, 'order_fulfillment', 'US',
    'Amazon siparişleri — stok kritik',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'),
  -- TR depo girişleri
  ('p1000000-0000-0000-0000-000000000001', 500, 'inbound_receipt', 'TR',
    'Üretimden gelen stok',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '45 days'),
  ('p1000000-0000-0000-0000-000000000006', 800, 'inbound_receipt', 'TR',
    'Ege bölgesi hasat — yeni sezon',
    'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '14 days'),
  ('p1000000-0000-0000-0000-000000000011', 2000, 'inbound_receipt', 'TR',
    'Fabrikadan gelen stok',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days'),
  -- TR→US transferler
  ('p1000000-0000-0000-0000-000000000001', -150, 'transfer_out', 'TR',
    'Virginia deposuna sevk — AWB: TK-2024-001',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '42 days'),
  ('p1000000-0000-0000-0000-000000000011', -500, 'transfer_out', 'TR',
    'Virginia deposuna sevk — AWB: TK-2024-005',
    'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '22 days')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 8. ORDERS — Sipariş Kayıtları (14 sipariş)
-- =============================================================================
INSERT INTO public.orders (id, user_id, platform, platform_order_id, destination, status, tracking_ref, carrier, total_amount, notes, created_at, shipped_at, delivered_at)
VALUES
  ('o1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
    'amazon', 'AMZ-114-2847593', '1234 Oak Street, Apt 5B, New York, NY 10001',
    'delivered', '1Z999AA10123456784', 'UPS', 125.00, 'Prime müşteri — hızlı teslimat',
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '25 days'),
  ('o1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
    'amazon', 'AMZ-114-3948271', '5678 Pine Avenue, Los Angeles, CA 90001',
    'shipped', '9400111899223100012345', 'USPS', 72.00, NULL,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NULL),
  ('o1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001',
    'shopify', 'SHP-1042', '910 Elm Road, Chicago, IL 60601',
    'processing', NULL, NULL, 210.50, 'Toplu sipariş — 3 farklı ürün',
    NOW() - INTERVAL '2 days', NULL, NULL),
  ('o1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001',
    'etsy', 'ETSY-29384756', '222 Walnut Lane, Portland, OR 97201',
    'packing', NULL, NULL, 80.00, 'Hediye paketi istendi',
    NOW() - INTERVAL '1 day', NULL, NULL),
  ('o1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001',
    'walmart', 'WM-7788990011', '333 Birch Drive, Houston, TX 77001',
    'received', NULL, NULL, 51.00, NULL,
    NOW() - INTERVAL '6 hours', NULL, NULL),
  ('o1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000002',
    'shopify', 'SHP-2001', '444 Maple Street, Miami, FL 33101',
    'delivered', '9261290100130428369402', 'USPS', 156.00, 'Gıda ürünleri — soğuk zincir gerekmiyor',
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days'),
  ('o1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000002',
    'amazon', 'AMZ-220-1928374', '555 Cedar Avenue, San Francisco, CA 94102',
    'shipped', '1Z999BB10987654321', 'UPS', 88.00, NULL,
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NULL),
  ('o1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000002',
    'direct', NULL, '666 Spruce Road, Denver, CO 80201',
    'processing', NULL, NULL, 264.00, 'Toptan sipariş — restoran müşterisi',
    NOW() - INTERVAL '1 day', NULL, NULL),
  ('o1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000002',
    'etsy', 'ETSY-55667788', '777 Ash Court, Seattle, WA 98101',
    'received', NULL, NULL, 44.00, 'Baharat seti — hediyelik paket',
    NOW() - INTERVAL '4 hours', NULL, NULL),
  ('o1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000003',
    'amazon', 'AMZ-330-5647382', '888 Willow Way, Austin, TX 78701',
    'delivered', '1Z999CC10111213141', 'FedEx', 195.00, 'Elektronik ürünler — kırılabilir',
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '13 days'),
  ('o1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000003',
    'shopify', 'SHP-3001', '999 Poplar Street, Boston, MA 02101',
    'shipped', 'FX-123456789012', 'FedEx', 112.00, NULL,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NULL),
  ('o1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000003',
    'amazon', 'AMZ-330-9876543', '111 Cherry Lane, Phoenix, AZ 85001',
    'packing', NULL, NULL, 57.00, NULL,
    NOW() - INTERVAL '1 day', NULL, NULL),
  ('o1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000001',
    'walmart', 'WM-1122334455', '444 Dead End Road, Nowhere, KS 67401',
    'cancelled', NULL, NULL, 34.00, 'Müşteri iptal talebi — iade yapıldı',
    NOW() - INTERVAL '15 days', NULL, NULL),
  ('o1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000002',
    'amazon', 'AMZ-220-RETURN', '777 Return Ave, Nashville, TN 37201',
    'returned', '1Z999DD10RETURN001', 'UPS', 66.00, 'Hasarlı ürün — iade kabul edildi',
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 9. ORDER_ITEMS — Sipariş Kalemleri (22 kalem)
-- =============================================================================
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
VALUES
  ('o1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 5, 12.50),
  ('o1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000004', 5, 8.50),
  ('o1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000002', 3, 24.00),
  ('o1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000003', 2, 35.00),
  ('o1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000001', 6, 12.50),
  ('o1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000002', 2, 24.00),
  ('o1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000005', 2, 45.00),
  ('o1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000004', 6, 8.50),
  ('o1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000006', 6, 14.00),
  ('o1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000007', 3, 22.00),
  ('o1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000008', 2, 18.50),
  ('o1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000009', 4, 11.00),
  ('o1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000006', 12, 14.00),
  ('o1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000007', 4, 22.00),
  ('o1000000-0000-0000-0000-000000000009', 'p1000000-0000-0000-0000-000000000010', 3, 16.00),
  ('o1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000011', 4, 15.00),
  ('o1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000012', 3, 19.00),
  ('o1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000013', 2, 28.00),
  ('o1000000-0000-0000-0000-000000000011', 'p1000000-0000-0000-0000-000000000014', 3, 22.00),
  ('o1000000-0000-0000-0000-000000000011', 'p1000000-0000-0000-0000-000000000013', 2, 28.00),
  ('o1000000-0000-0000-0000-000000000012', 'p1000000-0000-0000-0000-000000000011', 4, 15.00),
  ('o1000000-0000-0000-0000-000000000013', 'p1000000-0000-0000-0000-000000000004', 4, 8.50),
  ('o1000000-0000-0000-0000-000000000014', 'p1000000-0000-0000-0000-000000000007', 3, 22.00)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 10. PROCESS_TASKS — Süreç Görevleri (18 görev, 3 müşteri x 6)
-- =============================================================================
INSERT INTO public.process_tasks (user_id, task_name, task_category, task_status, sort_order, notes, completed_at)
VALUES
  -- Ahmet (active) — çoğu tamamlandı
  ('c1000000-0000-0000-0000-000000000001', 'LLC Kurulumu', 'legal', 'completed', 1,
    'Wyoming LLC — EIN: 88-1234567', NOW() - INTERVAL '42 days'),
  ('c1000000-0000-0000-0000-000000000001', 'EIN Kaydı', 'tax', 'completed', 2,
    'IRS onayı alındı', NOW() - INTERVAL '38 days'),
  ('c1000000-0000-0000-0000-000000000001', 'Banka Hesabı Açılışı', 'tax', 'completed', 3,
    'Mercury Bank — hesap aktif', NOW() - INTERVAL '35 days'),
  ('c1000000-0000-0000-0000-000000000001', 'Gümrük Broker Ataması', 'customs', 'completed', 4,
    'CBP Power of Attorney tamamlandı', NOW() - INTERVAL '30 days'),
  ('c1000000-0000-0000-0000-000000000001', 'Pazar Yeri Entegrasyonu', 'marketplace', 'in_progress', 5,
    'Amazon Seller Central aktif, Walmart application submitted', NULL),
  ('c1000000-0000-0000-0000-000000000001', 'İlk Ürün Depo Kabul', 'logistics', 'completed', 6,
    'Virginia depo — 5 ürün tümü kabul edildi', NOW() - INTERVAL '28 days'),
  -- Fatma (onboarding) — yarısı tamamlandı
  ('c1000000-0000-0000-0000-000000000002', 'LLC Kurulumu', 'legal', 'completed', 1,
    'Delaware LLC', NOW() - INTERVAL '10 days'),
  ('c1000000-0000-0000-0000-000000000002', 'EIN Kaydı', 'tax', 'completed', 2,
    'Fax ile başvuru yapıldı, EIN alındı', NOW() - INTERVAL '8 days'),
  ('c1000000-0000-0000-0000-000000000002', 'Banka Hesabı Açılışı', 'tax', 'in_progress', 3,
    'Mercury Bank başvurusu yapıldı — onay bekleniyor', NULL),
  ('c1000000-0000-0000-0000-000000000002', 'Gümrük Broker Ataması', 'customs', 'pending', 4,
    'Banka hesabı sonrası başlayacak', NULL),
  ('c1000000-0000-0000-0000-000000000002', 'FDA Kayıt & Etiketleme', 'customs', 'in_progress', 5,
    'Gıda ürünleri için FDA FFR kaydı yapılıyor', NULL),
  ('c1000000-0000-0000-0000-000000000002', 'İlk Ürün Depo Kabul', 'logistics', 'pending', 6,
    'Zeytinyağı ve bal ilk sevkiyat planlanıyor', NULL),
  -- Mehmet (verifying) — henüz başlamadı
  ('c1000000-0000-0000-0000-000000000003', 'LLC Kurulumu', 'legal', 'pending', 1,
    'Wyoming LLC tercih edildi — belgeler hazırlanıyor', NULL),
  ('c1000000-0000-0000-0000-000000000003', 'EIN Kaydı', 'tax', 'pending', 2,
    NULL, NULL),
  ('c1000000-0000-0000-0000-000000000003', 'Banka Hesabı Açılışı', 'tax', 'pending', 3,
    NULL, NULL),
  ('c1000000-0000-0000-0000-000000000003', 'FCC Sertifikasyon', 'customs', 'in_progress', 4,
    'Akıllı priz ve LED için FCC sertifika başvurusu yapıldı', NULL),
  ('c1000000-0000-0000-0000-000000000003', 'Pazar Yeri Entegrasyonu', 'marketplace', 'pending', 5,
    NULL, NULL),
  ('c1000000-0000-0000-0000-000000000003', 'İlk Ürün Depo Kabul', 'logistics', 'pending', 6,
    NULL, NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 11. SUPPORT_TICKETS — Destek Talepleri (8 ticket)
-- =============================================================================
INSERT INTO public.support_tickets (user_id, subject, description, status, priority, admin_response, resolved_at, created_at)
VALUES
  ('c1000000-0000-0000-0000-000000000001',
    'Amazon listeleme sorunu',
    'AMZ-114-2847593 siparişindeki T-shirt listesinde fiyat hatası var. $12.50 yerine $125.00 olarak görünüyor. Acil düzeltme gerekiyor.',
    'resolved', 'high',
    'Fiyat düzeltildi, Amazon Seller Central üzerinden güncelleme yapıldı.',
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '22 days'),
  ('c1000000-0000-0000-0000-000000000001',
    'Virginia depo stok sayımı',
    'Havlu seti stoğu sistemde 75 adet görünüyor ama fiziksel sayımda 73 adet olduğunu bildirdiniz. Fark kontrolü istiyorum.',
    'investigating', 'medium',
    'Depo ekibi ile kontrol ediliyor. Shrinkage olarak işleyip stoku düzelteceğiz.',
    NULL, NOW() - INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000001',
    'Walmart Marketplace onay süreci',
    'Walmart Seller başvurusu 2 haftadır "under review" durumunda. Takip edebilir misiniz?',
    'open', 'low',
    NULL, NULL, NOW() - INTERVAL '1 day'),
  ('c1000000-0000-0000-0000-000000000002',
    'FDA etiketleme gereksinimleri',
    'Zeytinyağı ve bal ürünleri için ABD pazarına uygun etiket tasarımı gerekiyor. Nutrition Facts formatı ve ingredientes listesi konusunda rehberlik lazım.',
    'waiting_customer', 'high',
    'FDA etiketleme kılavuzunu e-posta ile gönderdik. Lütfen ürün içerik listelerini Türkçe ve İngilizce olarak paylaşın.',
    NULL, NOW() - INTERVAL '5 days'),
  ('c1000000-0000-0000-0000-000000000002',
    'Banka hesabı gecikmesi',
    'Mercury Bank başvurusu 5 gündür onay bekliyor. Normal süre nedir? Alternatif banka önerisi var mı?',
    'open', 'medium',
    NULL, NULL, NOW() - INTERVAL '2 days'),
  ('c1000000-0000-0000-0000-000000000003',
    'FCC sertifika durumu',
    'Akıllı priz ve LED şerit ışık için FCC test sürecinin ne aşamada olduğunu öğrenmek istiyorum.',
    'investigating', 'medium',
    'Test laboratuvarı ile iletişime geçildi. Sonuçlar 5-7 iş günü içinde gelecek.',
    NULL, NOW() - INTERVAL '4 days'),
  ('c1000000-0000-0000-0000-000000000003',
    'LLC belgeleri hakkında soru',
    'Wyoming LLC için Articles of Organization belgesini ne zaman alabilirim? Bank hesabı açmak için gerekiyor.',
    'resolved', 'low',
    'Belgeler e-posta ile gönderildi. Wyoming Secretary of State tarafından onaylanan resmi kopya ektedir.',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000001',
    'Kırılan ürün — hasar talebi',
    'Son sevkiyattaki masa örtüsü kolisinden 3 adet ürün hasarlı çıkmış. Fotoğrafları ekte. Kargo sigortası devrede mi?',
    'open', 'urgent',
    NULL, NULL, NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED TAMAMLANDI
-- 5 kullanıcı, 5 rol, 3 abonelik, 10 lead, 5 davet, 15 ürün,
-- 31 stok hareketi, 14 sipariş, 23 sipariş kalemi, 18 süreç görevi,
-- 8 destek talebi — toplam 130+ gerçekçi kayıt.
-- =============================================================================
