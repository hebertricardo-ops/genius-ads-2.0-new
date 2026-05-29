import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = "938533942519150";
const GRAPH_API_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const META_PIXEL_API_TOKEN = Deno.env.get("META_PIXEL_API_TOKEN");
    if (!META_PIXEL_API_TOKEN) throw new Error("META_PIXEL_API_TOKEN not configured");

    const { event_name = "PageView", event_id, event_source_url } = await req.json();

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? req.headers.get("x-real-ip")
      ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url,
          action_source: "website",
          user_data: {
            ...(clientIp   && { client_ip_address: clientIp }),
            ...(userAgent  && { client_user_agent: userAgent }),
          },
        },
      ],
      access_token: META_PIXEL_API_TOKEN,
    };

    const res = await fetch(GRAPH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("meta-capi: Graph API error", result);
      return new Response(
        JSON.stringify({ error: result }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, events_received: result.events_received }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("meta-capi error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
