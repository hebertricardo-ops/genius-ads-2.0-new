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

Gere uma legenda completa e persuasiva em Português do Brasil com base nas informações do criativo fornecidas.

ESTRUTURA OBRIGATÓRIA (siga exatamente nesta ordem):
1. Hook de abertura impactante (1 frase curta ou pergunta que prende atenção — baseada no headline)
2. Linha em branco
3. Parágrafo de problema/dor (1-2 frases identificando o problema que o público enfrenta)
4. Linha em branco
5. Parágrafo de solução (1-2 frases mostrando como o produto resolve o problema)
6. Linha em branco
7. De 4 a 5 bullets de benefícios/features, cada um com emoji relevante no início
8. Linha em branco
9. CTA (chamada para ação, urgente e direta — baseada no CTA do criativo)
10. Linha em branco
11. Exatamente 5 hashtags, separadas por espaço

REGRAS PARA AS HASHTAGS:
- Escolha apenas as 5 mais relevantes e com maior volume de uso para o nicho do produto
- Priorize hashtags que o público-alvo realmente busca e segue
- Misture 1-2 tags amplas de alto volume com 3-4 tags específicas do nicho
- Sem hashtags genéricas demais (#brasil, #like, #follow) que não agregam alcance qualificado

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
