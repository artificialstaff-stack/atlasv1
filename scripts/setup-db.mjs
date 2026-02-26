// =============================================================================
// ATLAS — Veritabanı kurulum + admin kullanıcı oluşturma scripti
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ .env.local bulunamadı veya anahtarlar eksik!");
  process.exit(1);
}

async function createAdminUser() {
  console.log("🔐 Admin kullanıcı oluşturuluyor...\n");

  // 1) Create auth user via Supabase Admin API
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email: "admin@atlas.com",
      password: "Atlas2025!",
      email_confirm: true,
      app_metadata: { user_role: "super_admin" },
      user_metadata: {
        first_name: "Atlas",
        last_name: "Admin",
        company_name: "ATLAS Platform",
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    if (err.msg?.includes("already been registered") || err.message?.includes("already been registered")) {
      console.log("ℹ️  Admin kullanıcı zaten mevcut, devam ediliyor...");
      // Get existing user
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      });
      const listData = await listRes.json();
      const existing = listData.users?.find((u) => u.email === "admin@atlas.com");
      if (existing) return existing;
      console.error("❌ Admin kullanıcı bulunamadı:", err);
      return null;
    }
    console.error("❌ Auth kullanıcı oluşturulamadı:", err);
    return null;
  }

  const user = await createRes.json();
  console.log(`✅ Auth kullanıcı oluşturuldu: ${user.id}`);
  return user;
}

async function insertPublicUser(user) {
  if (!user) return;

  // Insert into public.users table
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: user.id,
      email: "admin@atlas.com",
      first_name: "Atlas",
      last_name: "Admin",
      company_name: "ATLAS Platform",
      onboarding_status: "active",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("duplicate key") || err.includes("already exists")) {
      console.log("ℹ️  public.users kaydı zaten mevcut");
      return true;
    }
    console.error("❌ public.users insert hatası:", err);
    return false;
  }

  console.log("✅ public.users kaydı oluşturuldu");
  return true;
}

async function insertUserRole(userId) {
  if (!userId) return;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      role: "super_admin",
      is_active: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("duplicate key") || err.includes("already exists")) {
      console.log("ℹ️  user_roles kaydı zaten mevcut");
      return;
    }
    console.error("❌ user_roles insert hatası:", err);
    return;
  }

  console.log("✅ user_roles kaydı oluşturuldu (super_admin)");
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  ATLAS PLATFORM — Veritabanı Kurulumu");
  console.log("═══════════════════════════════════════════\n");

  // Step 1: Create the admin user in auth.users
  const user = await createAdminUser();

  // Step 2: Insert into public.users (requires the table to exist)
  if (user) {
    const ok = await insertPublicUser(user);
    if (ok) {
      await insertUserRole(user.id);
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  Kurulum tamamlandı!");
  console.log("═══════════════════════════════════════════");
  console.log("\n📧 Admin E-posta : admin@atlas.com");
  console.log("🔑 Admin Şifre   : Atlas2025!");
  console.log("🌐 Panel          : http://localhost:3000/login");
}

main().catch(console.error);
