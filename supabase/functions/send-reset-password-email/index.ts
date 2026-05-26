import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getResetEmailHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background-color:#0f0f0f;padding:32px;text-align:center;">
            <img src="https://adsgenius.com.br/logo.png"
                 alt="Genius ADS" height="40"
                 style="display:inline-block;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 12px 0;">
              Redefinição de senha
            </h1>
            <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px 0;">
              Recebemos uma solicitação para redefinir a senha da sua conta
              no Genius ADS. Clique no botão abaixo para criar uma nova senha.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 32px 0;">
                  <a href="${resetLink}"
                     style="background-color:#f97316;color:#ffffff;text-decoration:none;
                            font-size:15px;font-weight:600;padding:14px 32px;
                            border-radius:8px;display:inline-block;">
                    Redefinir minha senha
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 8px 0;">
              Se você não solicitou a redefinição de senha, ignore este email.
              Sua senha permanece a mesma e nenhuma alteração foi feita.
            </p>
            <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">
              Este link expira em <strong style="color:#6b7280;">24 horas</strong>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f9fafb;padding:20px 32px;
                     border-top:1px solid #e5e7eb;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              © 2026 Genius ADS ·
              <a href="https://adsgenius.com.br"
                 style="color:#f97316;text-decoration:none;">
                adsgenius.com.br
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ok = new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://adsgenius.com.br";

    if (!RESEND_API_KEY) {
      console.error("[send-reset-password-email] RESEND_API_KEY not configured");
      return ok;
    }

    const body = await req.json().catch(() => ({}));
    const email: string = (body.email ?? "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      console.warn("[send-reset-password-email] Invalid email:", email);
      return ok;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
      },
    });

    if (linkError || !data?.properties?.action_link) {
      console.error("[send-reset-password-email] generateLink error:", linkError?.message ?? "no action_link");
      return ok;
    }

    const resetLink = data.properties.action_link;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Genius ADS <noreply@send.adsgenius.com.br>",
        to: [email],
        subject: "Redefinição de senha — Genius ADS",
        html: getResetEmailHtml(resetLink),
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("[send-reset-password-email] Resend error:", resendRes.status, errText.slice(0, 200));
    } else {
      console.log("[send-reset-password-email] Email sent to:", email);
    }
  } catch (e) {
    console.error("[send-reset-password-email] Unexpected error:", e);
  }

  return ok;
});
