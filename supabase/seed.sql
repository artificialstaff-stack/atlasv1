-- =============================================================================
-- ATLAS PLATFORM — Test Verisi (Seed Data)
-- Geliştirme ortamında kullanılır
-- =============================================================================

-- Not: Supabase auth.users tablosuna doğrudan INSERT yapılamaz.
-- Test kullanıcıları Supabase Dashboard veya Auth API ile oluşturulmalıdır.
-- Aşağıdaki seed verisi, auth.users kaydı zaten var olan test kullanıcıları için hazırlanmıştır.

-- Örnek admin rol ataması (auth.users'da karşılık var olmalıdır):
-- INSERT INTO public.user_roles (user_id, role) VALUES
--   ('ADMIN_UUID_HERE', 'super_admin');

-- Örnek contact submissions (CRM test verisi)
INSERT INTO public.contact_submissions (name, email, phone, company_name, message, status)
VALUES
  ('Ahmet Yılmaz', 'ahmet@example.com', '+905551234567', 'Yılmaz Tekstil Ltd.', 'Amazon FBA ile ABD pazarına açılmak istiyoruz. Paket fiyatlandırma hakkında bilgi almak istiyorum.', 'new'),
  ('Fatma Demir', 'fatma@example.com', '+905559876543', 'Demir Gıda A.Ş.', 'Virginia deposunda ürünlerimizi depolamak ve Shopify üzerinden satış yapmak istiyoruz.', 'contacted'),
  ('Mehmet Kaya', 'mehmet@example.com', '+905557654321', 'Kaya Elektronik', 'LLC kurulumu ve EIN kaydı süreçleri hakkında detaylı bilgi talep ediyorum.', 'qualified')
ON CONFLICT DO NOTHING;
