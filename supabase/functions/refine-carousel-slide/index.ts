import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { calcOpenAICost, logCost } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    } catch {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { slide, instruction, product_name, objective } = await req.json();

    if (!slide || !instruction?.trim()) {
      return new Response(
        JSON.stringify({ error: "Campos 'slide' e 'instruction' são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Log para diagnóstico
    console.log("[refine-carousel-slide] slide.cta original:", JSON.stringify(slide.cta));
    console.log("[refine-carousel-slide] tipo:", typeof slide.cta);

    const hadCta = slide.cta !== null &&
                   slide.cta !== undefined &&
                   String(slide.cta).trim() !== "";

    const ctaInstruction = hadCta
      ? `Este slide TEM CTA: "${slide.cta}". Ajuste o CTA apenas se a instrução pedir explicitamente.`
      : `Este slide NÃO TEM CTA. É PROIBIDO adicionar CTA. Retorne cta: null obrigatoriamente.`;

    const systemPrompt = `Você é um copywriter especialista em carrosséis para redes sociais.

Você receberá o conteúdo atual de UM slide de carrossel e uma instrução do usuário. Sua tarefa é APENAS ajustar o conteúdo deste slide conforme a instrução — sem alterar o slide_role, sem adicionar novos campos.

REGRAS CRÍTICAS:
- Retorne APENAS os campos que existem no slide original
- Se o slide original NÃO tem CTA (cta === null), NÃO adicione CTA — retorne cta: null
- Se o slide tem CTA, você pode ajustá-lo apenas se a instrução pedir explicitamente
- Mantenha o slide_role e slide_number inalterados
- Siga EXATAMENTE a instrução do usuário para o ajuste solicitado
- Retorne APENAS JSON válido, sem markdown, sem explicações

Formato de retorno:
{
  "slide_number": [mesmo número],
  "slide_role": "[mesmo role]",
  "headline": "[headline ajustada]",
  "subtext": "[subtext ajustado]",
  "cta": "[cta ajustado OU null se não havia CTA]"
}`;

    const userMessage = `Produto/Marca: ${product_name ?? "Não informado"}
Objetivo: ${objective === "engajamento" ? "engajamento" : "venda"}

SLIDE ATUAL:
- slide_number: ${slide.slide_number}
- slide_role: ${slide.slide_role}
- headline: ${slide.headline}
- subtext: ${slide.subtext}
- ${ctaInstruction}

INSTRUÇÃO DO USUÁRIO: ${instruction}

Retorne o slide ajustado.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[refine-carousel-slide] OpenAI error:", response.status, errText.slice(0, 200));
      throw new Error(`OpenAI error ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Resposta vazia da IA");

    const refined = JSON.parse(content);

    // Forçar no código: se slide original não tinha CTA real, zerar
    if (!hadCta) refined.cta = null;

    const usage = data.usage;
    if (usage) {
      await logCost(supabaseAdmin, {
        user_id:           userId,
        api_provider:      "openai",
        model:             "gpt-4.1-mini",
        operation:         "refine_carousel_slide",
        prompt_tokens:     usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens:      usage.total_tokens,
        cost_usd:          calcOpenAICost(usage.prompt_tokens, usage.completion_tokens),
      });
    }

    console.log("[refine-carousel-slide] OK slide:", slide.slide_number, "role:", slide.slide_role);

    return new Response(
      JSON.stringify({ slide: refined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[refine-carousel-slide] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
