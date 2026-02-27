// supabase/functions/scheduled-reports/index.ts
// Deploy: supabase functions deploy scheduled-reports
// Cron: 0 8 * * 1 (her pazartesi 08:00)

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Aktif kullanıcıları getir
    const { data: users } = await supabase
      .from("users")
      .select("id, email, first_name")
      .eq("onboarding_status", "completed");

    const reportResults = [];

    for (const user of users ?? []) {
      // Son 7 günlük sipariş istatistikleri
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: orders, count } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", weekAgo);

      const totalRevenue = (orders ?? []).reduce(
        (sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0),
        0
      );

      reportResults.push({
        userId: user.id,
        email: user.email,
        ordersThisWeek: count ?? 0,
        revenue: totalRevenue,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reportsGenerated: reportResults.length,
        results: reportResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
