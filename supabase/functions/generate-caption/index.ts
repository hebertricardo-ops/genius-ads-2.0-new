import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const { product_name, headline, body, cta, benefits, pains } = await req.json();

    const parts: string[] = [];
    if (product_name) parts.push(`Produto: ${product_name}`);
    if (headline) parts.push(`Headline do criativo: ${headline}`);
    if (body) parts.push(`Desenvolvimento: ${body}`);
    if (cta) parts.push(`CTA: ${cta}`);
    if (benefits) parts.push(`Benefícios: ${benefits}`);
    if (pains) parts.push(`Dores/problemas do público: ${pains}`);

    const userPrompt = parts.join("\n");

    const systemPrompt = `Você é um especialista em copywriting para redes sociais no Brasil, especializado em Instagram e Facebook.

Gere uma legenda completa e persuasiva em Português do Brasil com base nas informações do criativo fornecidas, seguindo EXATAMENTE esta estrutura:

1) HEADLINE: frase de gancho forte e impactante que prende a atenção imediatamente (1 linha)

2) DESENVOLVIMENTO: conteúdo persuasivo em 2-3 frases curtas que aprofundam a mensagem e criam conexão com o público

3) CTA: chamada para ação clara e direta alinhada com o objetivo do post

4) HASHTAGS: exatamente 5 hashtags relevantes ao nicho e produto, separadas por espaço

A legenda deve fluir naturalmente entre as seções, sem rótulos ou títulos visíveis. Máximo 600 caracteres no total.

REGRAS PARA AS HASHTAGS:
- Escolha as 5 mais relevantes para o nicho do produto
- Misture 1-2 tags amplas de alto volume com 3-4 tags específicas do nicho
- Sem hashtags genéricas (#brasil, #like, #follow)

REGRAS GERAIS:
- Tom persuasivo, direto e humano
- Emojis usados com estratégia, não excessivamente
- Responda APENAS com o texto da legenda, sem explicações ou comentários adicionais`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 1200,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error (${res.status}): ${err}`);
    }

    const json = await res.json();
    const caption: string = json.choices?.[0]?.message?.content?.trim() ?? "";

    if (!caption) throw new Error("Nenhuma legenda gerada");

    return new Response(
      JSON.stringify({ caption }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-caption error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao gerar legenda" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
