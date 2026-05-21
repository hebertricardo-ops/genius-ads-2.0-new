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

    const { name, description, benefits } = await req.json();
    if (!description && (!benefits || benefits.length === 0)) {
      throw new Error("Descrição ou benefícios da marca são necessários");
    }

    const benefitsList = Array.isArray(benefits) && benefits.length > 0
      ? benefits.join(", ")
      : null;

    const userPrompt = [
      name ? `Marca/Produto: ${name}` : null,
      description ? `Descrição: ${description}` : null,
      benefitsList ? `Principais benefícios: ${benefitsList}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em copywriting para anúncios digitais. Com base nas informações da marca/produto, gere uma PROMESSA PRINCIPAL detalhada para uso em anúncios no Meta Ads. O texto deve: descrever claramente O QUE o produto ou serviço faz e COMO ele funciona, especificar as principais funcionalidades ou mecanismos de entrega do resultado, mostrar a transformação concreta que o cliente experimenta, ter entre 3 e 5 frases, ser persuasivo e direto, estar em português do Brasil. Retorne APENAS o texto da promessa, sem aspas, sem títulos, sem explicações adicionais.",
          },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${err.substring(0, 200)}`);
    }

    const data = await response.json();
    const promise = data.choices?.[0]?.message?.content?.trim();
    if (!promise) throw new Error("Resposta inválida da OpenAI");

    return new Response(JSON.stringify({ promise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brand-promise error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
