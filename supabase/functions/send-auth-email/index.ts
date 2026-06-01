import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resposta vazia que o Supabase Auth espera para confirmar que o hook foi processado
const OK = new Response(JSON.stringify({}), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function getSignupEmailHtml({
  name,
  confirmLink,
}: {
  name: string;
  confirmLink: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#0f0f0f;padding:32px;text-align:center;">
            <img src="https://adsgenius.com.br/logo.png" alt="Genius ADS" height="40" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">
              Olá, ${name}! Confirme seu email 🎉
            </h1>
            <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
              Sua conta no Genius ADS foi criada com sucesso. Você ganhou
              <strong style="color:#f97316;">créditos grátis</strong> para começar.
              Clique no botão abaixo para confirmar seu email e ativar sua conta.
            </p>

            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px;">
                O que você pode fazer após confirmar:
              </p>
              <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.8;">
                ⚡ Gerar criativos de alta conversão em 60 segundos<br/>
                🎨 Criar carrosséis profissionais com IA<br/>
                📅 Agendar postagens nas redes sociais<br/>
                📊 Acompanhar analytics do perfil
              </p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:0 0 32px;">
                  <a href="${confirmLink}"
                     style="background:#f97316;color:#fff;text-decoration:none;
                            font-size:15px;font-weight:600;padding:14px 32px;
                            border-radius:8px;display:inline-block;">
                    Confirmar meu email →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0;">
              Se você não criou uma conta no Genius ADS, ignore este email.
              Este link expira em 24 horas.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              © 2026 Genius ADS ·
              <a href="https://adsgenius.com.br" style="color:#f97316;text-decoration:none;">
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
    const body = await req.json();
    const { user, email_data } = body;

    const email: string = user?.email ?? "";
    const name: string = user?.user_metadata?.name ?? email.split("@")[0];
    const actionType: string = email_data?.email_action_type ?? "";
    const tokenHash: string = email_data?.token_hash ?? "";
    const redirectTo: string = email_data?.redirect_to ?? "";
    const supabaseProjectUrl: string = Deno.env.get("SUPABASE_URL") ?? "";

    console.log(`send-auth-email: action=${actionType} email=${email}`);

    // Tratar apenas signup (confirmação de email do usuário free)
    // recovery já é tratado por send-reset-password-email chamado pelo frontend
    if (actionType !== "signup") {
      console.log(`send-auth-email: skipping action=${actionType} (handled elsewhere)`);
      return OK;
    }

    if (!email || !tokenHash) {
      console.error("send-auth-email: missing email or token_hash");
      return OK;
    }

    // Montar link de confirmação
    const confirmLink = `${supabaseProjectUrl}/auth/v1/verify?token=${tokenHash}&type=signup&redirect_to=${encodeURIComponent(redirectTo)}`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("send-auth-email: RESEND_API_KEY not configured");
      return OK; // Retorna OK para não bloquear o signup
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "Genius ADS <noreply@send.adsgenius.com.br>",
        to:      [email],
        subject: "Confirme seu email — Genius ADS",
        html:    getSignupEmailHtml({ name, confirmLink }),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error(`send-auth-email: Resend error ${emailRes.status}: ${errText.slice(0, 300)}`);
    } else {
      console.log(`send-auth-email: confirmation email sent to ${email}`);
    }

    // Sempre retorna OK para não bloquear o fluxo de signup do Supabase
    return OK;
  } catch (e) {
    console.error("send-auth-email error:", e);
    // Retorna OK mesmo em erro para não bloquear o signup
    return OK;
  }
});
