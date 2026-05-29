import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { email, plan: planName } = await req.json();

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

    // Buscar usuário pelo email
    let user = null;
    let page = 1;
    const perPage = 100;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const found = data?.users?.find((u: any) => u.email === email);
      if (found) { user = found; break; }
      if (!data?.users || data.users.length < perPage) break;
      page++;
    }

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`update-hotmart-user: user=${userId} plan="${planName}" → slug=${planConfig.slug} cycle=${planConfig.billing_cycle}`);

    // Pacote de créditos extras
    if (planConfig.is_credits_package) {
      const extraCredits = planConfig.credits ?? 0;

      const { data: current } = await supabaseAdmin
        .from("user_credits")
        .select("credits_balance, extra_credits")
        .eq("user_id", userId)
        .single();

      await supabaseAdmin
        .from("user_credits")
        .update({
          credits_balance: (current?.credits_balance ?? 0) + extraCredits,
          extra_credits:   (current?.extra_credits   ?? 0) + extraCredits,
        })
        .eq("user_id", userId);

      console.log(`update-hotmart-user: +${extraCredits} extra credits to ${userId}`);

      return new Response(
        JSON.stringify({ success: true, message: "Créditos extras adicionados", extra_credits: extraCredits }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atualização de plano recorrente
    const { data: planData, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, monthly_credits")
      .eq("slug", planConfig.slug)
      .single();
    if (planError || !planData) throw new Error(`Plano "${planConfig.slug}" não encontrado na tabela plans`);

    const periodStart = new Date();
    const periodEnd = new Date();
    if (planConfig.billing_cycle === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Upsert subscription
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_id:                 planData.id,
          billing_cycle:           planConfig.billing_cycle,
          current_period_start:    periodStart.toISOString(),
          current_period_end:      periodEnd.toISOString(),
          status:                  "active",
        })
        .eq("id", existingSub.id);
    } else {
      await supabaseAdmin.from("subscriptions").insert({
        user_id:                 userId,
        plan_id:                 planData.id,
        billing_cycle:           planConfig.billing_cycle,
        status:                  "active",
        current_period_start:    periodStart.toISOString(),
        current_period_end:      periodEnd.toISOString(),
      });
    }

    // Atualizar créditos preservando extra_credits
    const { data: current } = await supabaseAdmin
      .from("user_credits")
      .select("extra_credits")
      .eq("user_id", userId)
      .single();

    await supabaseAdmin
      .from("user_credits")
      .update({
        subscription_credits: planData.monthly_credits,
        credits_balance:      planData.monthly_credits + (current?.extra_credits ?? 0),
      })
      .eq("user_id", userId);

    console.log(`update-hotmart-user: plan updated slug=${planConfig.slug} cycle=${planConfig.billing_cycle} for ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Plano e créditos atualizados" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("update-hotmart-user error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
