import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { whatsapp } = await req.json();

    if (!whatsapp) {
      return new Response(JSON.stringify({ available: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const digits = String(whatsapp).replace(/\D/g, "");

    if (digits.length < 10) {
      return new Response(JSON.stringify({ available: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("whatsapp", digits)
      .maybeSingle();

    return new Response(JSON.stringify({ available: !data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-whatsapp-available error:", e);
    return new Response(JSON.stringify({ available: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
