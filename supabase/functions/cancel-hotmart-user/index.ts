import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Campo obrigatório: email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Passo 1 — Buscar usuário pelo email
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
    console.log(`cancel-hotmart-user: cancelling user ${userId} (${email})`);

    // Passo 2 — Cancelar assinatura ativa
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status:       "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "active");

    // Passo 3 — Zerar créditos
    await supabaseAdmin
      .from("user_credits")
      .update({
        credits_balance:      0,
        subscription_credits: 0,
        extra_credits:        0,
      })
      .eq("user_id", userId);

    // Passo 4 — Excluir usuário do auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`Erro ao excluir usuário: ${deleteError.message}`);

    console.log(`cancel-hotmart-user: user ${userId} (${email}) removed successfully`);

    return new Response(
      JSON.stringify({ success: true, message: "Assinatura cancelada e usuário removido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cancel-hotmart-user error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
