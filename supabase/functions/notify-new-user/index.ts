import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, email, whatsapp } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL");

    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_WEBHOOK_URL não configurado");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name ?? "", email, whatsapp: whatsapp ?? null }),
      });
      console.log(`notify-new-user: webhook sent for ${email}`);
    } catch (err) {
      console.error("Erro ao notificar N8N:", err);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-new-user error:", e);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
