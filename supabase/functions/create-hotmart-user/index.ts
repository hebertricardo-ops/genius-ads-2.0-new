import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento do nome do plano Hotmart → slug do banco + billing_cycle
interface PlanConfig {
  slug: string;
  billing_cycle: "monthly" | "annual" | "one-time";
  is_credits_package: boolean;
  credits?: number;
}

const PLAN_MAP: Record<string, PlanConfig> = {
  "PLANO MENSAL PRO":          { slug: "pro",          billing_cycle: "monthly",  is_credits_package: false },
  "PLANO MENSAL ADVANCED":     { slug: "advanced",     billing_cycle: "monthly",  is_credits_package: false },
  "PLANO MENSAL SOCIAL MEDIA": { slug: "social-media", billing_cycle: "monthly",  is_credits_package: false },
  "PLANO ANUAL PRO":           { slug: "pro",          billing_cycle: "annual",   is_credits_package: false },
  "PLANO ANUAL ADVANCED":      { slug: "advanced",     billing_cycle: "annual",   is_credits_package: false },
  "PLANO ANUAL SOCIAL MEDIA":  { slug: "social-media", billing_cycle: "annual",   is_credits_package: false },
  "PACOTE BASICO":             { slug: "creditos-pro",  billing_cycle: "one-time", is_credits_package: true, credits: 500  },
  "PACOTE PLUS":               { slug: "creditos-plus", billing_cycle: "one-time", is_credits_package: true, credits: 1000 },
};

function resolvePlan(planName: string): PlanConfig | null {
  return PLAN_MAP[planName.trim().toUpperCase()] ?? null;
}

function getWelcomeEmailHtml({
  name,
  planLabel,
  accessLink,
  credits,
}: {
  name: string;
  planLabel: string;
  accessLink: string;
  credits: number;
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
              Bem-vindo ao Genius ADS, ${name}! 🎉
            </h1>
            <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
              Sua assinatura do plano
              <strong style="color:#f97316;">${planLabel}</strong>
              foi ativada com sucesso. Você tem
              <strong>${credits} créditos</strong> disponíveis.
            </p>

            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;
                        padding:16px;margin-bottom:24px;">
              <p style="font-size:13px;color:#c2410c;margin:0 0 4px;font-weight:600;">
                Próximo passo — Crie sua senha de acesso
              </p>
              <p style="font-size:13px;color:#9a3412;margin:0;line-height:1.5;">
                Clique no botão abaixo para definir sua senha e acessar a plataforma.
              </p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:0 0 32px;">
                  <a href="${accessLink}"
                     style="background:#f97316;color:#fff;text-decoration:none;
                            font-size:15px;font-weight:600;padding:14px 32px;
                            border-radius:8px;display:inline-block;">
                    Criar minha senha e acessar →
                  </a>
                </td>
              </tr>
            </table>

            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px;">
                O que você pode fazer agora:
              </p>
              <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.8;">
                ⚡ Gerar criativos de alta conversão em 60 segundos<br/>
                🎨 Criar carrosséis profissionais com IA<br/>
                📅 Agendar postagens nas redes sociais<br/>
                📊 Acompanhar analytics do perfil
              </p>
            </div>

            <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0;">
              Este link expira em 24 horas. Se não solicitou este acesso, ignore este email.
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
    const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!expectedSecret || token !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://app.adsgenius.com.br";

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { email, name, plan: planName } = await req.json();

    if (!email || !planName) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planConfig = resolvePlan(planName);
    if (!planConfig) {
      return new Response(
        JSON.stringify({ error: `Plano não reconhecido: "${planName}". Valores válidos: ${Object.keys(PLAN_MAP).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const displayName = name ?? email.split("@")[0];

    // Passo 1 — Criar usuário confirmado
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: displayName, plan: planConfig.slug, source: "hotmart" },
    });
    if (createError) throw new Error(`Erro ao criar usuário: ${createError.message}`);
    const userId = newUser.user.id;

    console.log(`create-hotmart-user: created ${userId} plan="${planName}" → slug=${planConfig.slug} cycle=${planConfig.billing_cycle}`);

    // Passo 2 — Buscar plan_id na tabela plans
    const { data: planData, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, monthly_credits")
      .eq("slug", planConfig.slug)
      .single();
    if (planError || !planData) throw new Error(`Plano "${planConfig.slug}" não encontrado na tabela plans`);

    const planCredits = planData.monthly_credits ?? 0;

    // Passo 3 — Criar subscription (apenas planos recorrentes)
    if (!planConfig.is_credits_package) {
      const periodStart = new Date();
      const periodEnd = new Date();
      if (planConfig.billing_cycle === "annual") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await supabaseAdmin.from("subscriptions").insert({
        user_id:                 userId,
        plan_id:                 planData.id,
        status:                  "active",
        billing_cycle:           planConfig.billing_cycle,
        current_period_start:    periodStart.toISOString(),
        current_period_end:      periodEnd.toISOString(),
      });
    }

    // Passo 4 — Atualizar créditos (sobrescreve os 60 do trigger pelo valor do plano)
    await supabaseAdmin
      .from("user_credits")
      .update({
        credits_balance:      planCredits,
        subscription_credits: planCredits,
      })
      .eq("user_id", userId);

    // Passo 5 — Gerar link de recuperação (define senha)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/auth/callback?type=recovery` },
    });
    if (linkError) throw new Error(`Erro ao gerar link: ${linkError.message}`);
    const accessLink = linkData.properties.action_link;

    // Passo 6 — Enviar email de boas-vindas via Resend
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurado");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "Genius ADS <noreply@send.adsgenius.com.br>",
        to:      [email],
        subject: "Bem-vindo ao Genius ADS — Crie sua senha de acesso",
        html:    getWelcomeEmailHtml({ name: displayName, planLabel: planName, accessLink, credits: planCredits }),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error(`create-hotmart-user: Resend error ${emailRes.status}: ${errText}`);
      throw new Error(`Erro ao enviar email (${emailRes.status}): ${errText}`);
    }

    console.log(`create-hotmart-user: welcome email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, user_id: userId, message: "Usuário criado e email enviado" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-hotmart-user error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
