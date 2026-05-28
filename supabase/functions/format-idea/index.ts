import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { idea, objective, product } = await req.json();

    if (!idea?.trim()) {
      return new Response(
        JSON.stringify({ error: "Campo 'idea' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um copywriter especialista em posts para redes sociais e anúncios digitais.
Receba a ideia bruta do usuário e transforme em uma estrutura clara para criação de post, seguindo o objetivo informado.
Retorne APENAS JSON válido sem markdown, sem explicações, sem texto adicional:
{
  "promise": "promessa principal extraída da ideia (1 frase objetiva e impactante)",
  "pains": "dores identificadas na ideia (separadas por vírgula, no máximo 3)",
  "benefits": "benefícios identificados na ideia (separados por vírgula, no máximo 3)",
  "angle": "ângulo criativo sugerido para o post (1 frase descritiva)",
  "summary": "resumo da ideia em 2-3 frases para o usuário revisar antes de continuar"
}`;

    const userMessage = `Produto: ${product || "Não informado"}
Objetivo do post: ${objective === "engajamento" ? "engajamento (curtidas, comentários, compartilhamentos)" : "venda (converter em cliente ou Meta ADS)"}
Ideia do usuário: ${idea}`;

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
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[format-idea] OpenAI error:", response.status, errText.slice(0, 200));
      throw new Error(`OpenAI error ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Resposta vazia da IA");

    let formatted: Record<string, string>;
    try {
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      formatted = JSON.parse(cleaned);
    } catch {
      throw new Error("Resposta da IA não é JSON válido");
    }

    console.log("[format-idea] OK for product:", product);

    return new Response(
      JSON.stringify({ formatted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[format-idea] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
