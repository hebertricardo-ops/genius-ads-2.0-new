import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "hebertricardo@gmail.com";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const n8nUrl = Deno.env.get("N8N_WEBHOOK_CAMPAIGN_URL");
    if (!n8nUrl) {
      return json({ error: "Secret N8N_WEBHOOK_CAMPAIGN_URL não configurado. Configure via: supabase secrets set N8N_WEBHOOK_CAMPAIGN_URL=https://..." }, 500);
    }

    const webhookSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth + admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) return json({ error: "Não autenticado" }, 401);
    if (user.email !== ADMIN_EMAIL) return json({ error: "Acesso não autorizado" }, 403);

    const body = await req.json();
    const { channel, template_key, subject, message, recipients } = body as {
      channel: string;
      template_key: string;
      subject?: string;
      message: string;
      recipients: Array<{
        user_id: string;
        email: string;
        name: string;
        whatsapp?: string;
      }>;
    };

    if (!channel || !template_key || !message || !Array.isArray(recipients) || recipients.length === 0) {
      return json({ error: "Campos obrigatórios: channel, template_key, message, recipients" }, 400);
    }

    // Criar registro da campanha com status 'sending'
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        admin_id:         user.id,
        channel,
        template_key,
        subject:          subject ?? null,
        message,
        recipients_count: recipients.length,
        status:           "sending",
      })
      .select("id")
      .single();

    if (campaignError || !campaign) throw campaignError ?? new Error("Erro ao criar campanha");

    const campaignId = campaign.id;

    // Montar array com mensagens já interpoladas por destinatário
    const recipientsPayload = recipients.map((r) => ({
      nome:        r.name,
      email:       r.email,
      whatsapp:    r.whatsapp ?? null,
      subject:     subject ?? null,
      mensagem:    message.replace(/\{\{nome\}\}/gi, r.name ?? ""),
      canal:       channel,
      campaign_id: campaignId,
    }));

    // Disparar UMA única requisição ao N8N com todos os destinatários
    let dispatchError: string | null = null;
    try {
      const res = await fetch(n8nUrl, {
        method:  "POST",
        headers: {
          "Content-Type":      "application/json",
          "Authorization":     `Bearer ${webhookSecret}`,
          "X-Campaign-Channel": channel,
        },
        body: JSON.stringify({ recipients: recipientsPayload }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`N8N retornou ${res.status}: ${text}`);
      }
    } catch (err) {
      dispatchError = err instanceof Error ? err.message : String(err);
    }

    if (dispatchError) {
      await supabaseAdmin
        .from("email_campaigns")
        .update({ status: "partial_error" })
        .eq("id", campaignId);

      return json({ error: `Falha ao contatar N8N: ${dispatchError}` }, 502);
    }

    // Registrar logs por destinatário (status 'sent' — N8N processa de forma assíncrona)
    const logs = recipients.map((r) => ({
      campaign_id:   campaignId,
      user_id:       r.user_id,
      user_email:    r.email,
      user_name:     r.name,
      user_whatsapp: r.whatsapp ?? null,
      channel,
      status:        "sent",
    }));

    await supabaseAdmin.from("email_campaign_logs").insert(logs);

    // Atualizar status final
    await supabaseAdmin
      .from("email_campaigns")
      .update({ status: "done" })
      .eq("id", campaignId);

    return json({
      campaign_id: campaignId,
      total:       recipients.length,
      sent:        recipients.length,
      errors:      0,
      status:      "done",
    });

  } catch (e) {
    console.error("[admin-send-campaign] error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
