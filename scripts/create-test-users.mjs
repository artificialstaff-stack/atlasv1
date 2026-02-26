// =============================================================================
// ATLAS — Test Kullanıcı Oluşturma Scripti (Seed Verisi İçin)
// =============================================================================
//
// Kullanım:
//   node scripts/create-test-users.mjs
//
// Bu script, seed.sql'deki sabit UUID'lere sahip test kullanıcıları oluşturur.
// Supabase Admin API kullanır (service_role key gereklidir).
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local'da tanımlı olmalı!");
  process.exit(1);
}

const TEST_USERS = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    email: "elif@atlaslojitr.com",
    password: "Atlas2025!",
    role: "super_admin",
    metadata: { first_name: "Elif", last_name: "Öztürk", company_name: "Atlas Lojistik" },
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    email: "burak@atlaslojitr.com",
    password: "Atlas2025!",
    role: "admin",
    metadata: { first_name: "Burak", last_name: "Arslan", company_name: "Atlas Lojistik" },
  },
  {
    id: "c1000000-0000-0000-0000-000000000001",
    email: "ahmet@yilmaztekstil.com",
    password: "Musteri2025!",
    role: "customer",
    metadata: { first_name: "Ahmet", last_name: "Yılmaz", company_name: "Yılmaz Tekstil Ltd." },
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    email: "fatma@demirgida.com",
    password: "Musteri2025!",
    role: "customer",
    metadata: { first_name: "Fatma", last_name: "Demir", company_name: "Demir Gıda A.Ş." },
  },
  {
    id: "c1000000-0000-0000-0000-000000000003",
    email: "mehmet@kayaelektronik.com",
    password: "Musteri2025!",
    role: "customer",
    metadata: { first_name: "Mehmet", last_name: "Kaya", company_name: "Kaya Elektronik" },
  },
];

async function createUser(user) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
      app_metadata: { user_role: user.role },
      user_metadata: user.metadata,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    if (err.msg?.includes("already been registered") || err.message?.includes("already been registered")) {
      console.log(`  ℹ️  ${user.email} zaten mevcut — atlanıyor`);
      return true;
    }
    console.error(`  ❌ ${user.email} oluşturulamadı:`, err.msg || err.message);
    return false;
  }

  console.log(`  ✅ ${user.email} (${user.role}) oluşturuldu — ID: ${user.id}`);
  return true;
}

async function main() {
  console.log("🚀 ATLAS Test Kullanıcıları Oluşturuluyor...\n");
  console.log(`   Supabase: ${SUPABASE_URL}\n`);

  let success = 0;
  let failed = 0;

  for (const user of TEST_USERS) {
    const ok = await createUser(user);
    if (ok) success++;
    else failed++;
  }

  console.log(`\n📊 Sonuç: ${success} başarılı, ${failed} başarısız`);
  console.log("\n💡 Sonraki adım: Supabase SQL Editor'da seed.sql dosyasını çalıştırın.");
  console.log("   Veya: psql -h <HOST> -U postgres -d postgres -f supabase/seed.sql\n");
}

main().catch(console.error);
