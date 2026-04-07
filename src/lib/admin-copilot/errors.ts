export function formatCopilotError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;

  if (
    message.includes("Could not find the table 'public.ai_") ||
    message.includes("schema cache")
  ) {
    return "Admin Copilot tabloları eksik. `supabase/migrations/20260314000000_admin_copilot.sql` migration'ını veritabanına uygulayın.";
  }

  return message;
}
