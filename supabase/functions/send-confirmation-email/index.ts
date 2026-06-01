import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getConfirmationEmailHtml({
  name,
  confirmationLink,
}: {
  name: string;
  confirmationLink: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:8px;overflow:hidden;
                    border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#0f0f0f;padding:32px;text-align:center;">
            <img src="https://adsgenius.com.br/logo.png"
                 alt="Genius ADS" height="40" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="font-size:22px;font-weight:700;color:#111827;
                        margin:0 0 8px;">
              Olá, ${name}! 👋
            </h1>
            <p style="font-size:15px;color:#6b7280;line-height:1.6;
                       margin:0 0 24px;">
              Obrigado por se cadastrar no Genius ADS.
              Confirme seu email para ativar sua conta e começar
              a criar criativos de alta conversão.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:0 0 32px;">
                  <a href="${confirmationLink}"
                     style="background:#f97316;color:#fff;
                            text-decoration:none;font-size:15px;
                            font-weight:600;padding:14px 32px;
                            border-radius:8px;display:inline-block;">
                    Confirmar meu email →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Créditos grátis -->
            <div style="background:#fff7ed;border:1px solid #fed7aa;
                        border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="font-size:13px;color:#c2410c;margin:0 0 4px;
                         font-weight:600;">
                🎁 Você ganhou créditos grátis!
              </p>
              <p style="font-size:13px;color:#9a3412;margin:0;
                         line-height:1.5;">
                Após confirmar seu email, seus créditos estarão
                disponíveis para criar seus primeiros criativos.
              </p>
            </div>

            <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0;">
              Se você não criou uma conta no Genius ADS,
              ignore este email com segurança.
              Este link expira em <strong style="color:#6b7280;">
              24 horas</strong>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;
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

  try {
    const { email, name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://adsgenius.com.br";

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurado");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const displayName = (name as string)?.trim() || email.split("@")[0];

    // Gerar link de confirmação via admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: { redirectTo: `${SITE_URL}/auth/callback` },
    });

    if (linkError) {
      console.error("Erro ao gerar link:", linkError.message);
      return new Response(JSON.stringify({ error: "Não foi possível gerar o link de confirmação" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confirmationLink = linkData.properties.action_link;

    // Enviar email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "Genius ADS <noreply@send.adsgenius.com.br>",
        to:      [email],
        subject: "Confirme seu email — Genius ADS",
        html:    getConfirmationEmailHtml({ name: displayName, confirmationLink }),
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error(`send-confirmation-email: Resend error ${emailResponse.status}: ${errText.slice(0, 300)}`);
      return new Response(JSON.stringify({ error: "Erro ao enviar email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`send-confirmation-email: email sent to ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-confirmation-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
