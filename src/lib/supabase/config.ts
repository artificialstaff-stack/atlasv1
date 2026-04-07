const FALLBACK_SUPABASE_URL = "https://bdkdidpiqtibfearlith.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJka2RpZHBpcXRpYmZlYXJsaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTkzNDYsImV4cCI6MjA4NzYzNTM0Nn0.Rs1cz7tPLGvy4tfzMVDKz8sz7PEAjgBUCjv_AsyxE84";

function isInvalidSupabaseUrl(value: string | undefined) {
  if (!value) return true;
  return (
    value.includes("127.0.0.1:54321") ||
    value.includes("localhost:54321") ||
    value.includes("your-project.supabase.co")
  );
}

function isInvalidPublishableKey(value: string | undefined) {
  if (!value) return true;
  return value === "your-anon-key";
}

export function getSupabasePublicConfig() {
  const url = isInvalidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? FALLBACK_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const publishableKey = isInvalidPublishableKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? FALLBACK_SUPABASE_PUBLISHABLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return {
    url,
    publishableKey,
  };
}
