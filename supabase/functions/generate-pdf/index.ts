// supabase/functions/generate-pdf/index.ts
// Deploy: supabase functions deploy generate-pdf

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, data, userId } = await req.json();

    // PDF generation stub — production'da @react-pdf/renderer veya puppeteer kullanılır
    const pdfContent = {
      type,
      userId,
      generatedAt: new Date().toISOString(),
      data,
      pages: 1,
      format: "A4",
    };

    return new Response(JSON.stringify({ success: true, pdf: pdfContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
