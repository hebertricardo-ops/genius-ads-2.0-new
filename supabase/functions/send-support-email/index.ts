import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const userId = user.id;

    const { subject, email, message } = await req.json();

    if (!subject?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: subject, email, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Genius ADS Suporte <noreply@send.adsgenius.com.br>",
        to: ["suporte@adsgenius.com.br"],
        reply_to: email,
        subject: `[Suporte] ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#f97316;">Nova solicitação de suporte</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px;font-weight:bold;color:#374151;">Usuário ID:</td>
                <td style="padding:8px;color:#6b7280;">${userId}</td>
              </tr>
              <tr>
                <td style="padding:8px;font-weight:bold;color:#374151;">Email de contato:</td>
                <td style="padding:8px;color:#6b7280;">${email}</td>
              </tr>
              <tr>
                <td style="padding:8px;font-weight:bold;color:#374151;">Assunto:</td>
                <td style="padding:8px;color:#6b7280;">${subject}</td>
              </tr>
              <tr>
                <td style="padding:8px;font-weight:bold;color:#374151;vertical-align:top;">Mensagem:</td>
                <td style="padding:8px;color:#6b7280;white-space:pre-wrap;">${message}</td>
              </tr>
            </table>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("[send-support-email] Resend error:", resendRes.status, errText.slice(0, 200));
      throw new Error(`Resend error ${resendRes.status}`);
    }

    console.log("[send-support-email] Email sent from user:", userId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-support-email] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
