import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const systemPrompt = `Você é um copywriter de elite, especialista em criativos estáticos de alta conversão para Meta Ads (Facebook e Instagram). Você gera copies em português do Brasil.

REGRAS OBRIGATÓRIAS:
- Headline com gancho forte e impactante
- Linguagem clara, persuasiva e direta — nada genérico
- Foco total em conversão
- CTA coerente com o que o usuário informou
- Textos curtos — pense em criativo estático de anúncio, não em artigo
- Subheadline é opcional — use apenas quando agregar valor
- Todas as copies em português do Brasil

DISTRIBUIÇÃO ESTRATÉGICA DOS 3 ÂNGULOS:
- Ângulo 1: Explorar a DOR PRINCIPAL do público
- Ângulo 2: Explorar o BENEFÍCIO / TRANSFORMAÇÃO
- Ângulo 3: Quebrar OBJEÇÃO / mostrar PRATICIDADE / RAPIDEZ / PROVA IMPLÍCITA

Cada ângulo deve ser genuinamente diferente dos outros em abordagem e tom.

CONCEITO VISUAL POR ÂNGULO:
Para cada ângulo, gere 1 CONCEITO VISUAL premium e harmonioso para o criativo estático.
O conceito deve ser rico em elementos gráficos e sofisticado, porém sempre equilibrado — visual impactante sem poluição.

PRINCÍPIOS OBRIGATÓRIOS DO CONCEITO VISUAL:
- Design premium com hierarquia visual clara e composição equilibrada
- Rico em elementos gráficos temáticos, mas cada elemento tem propósito — sem excesso
- Identifique o produto e nicho para sugerir elementos visuais alinhados (ícones, badges, selos, texturas, partículas)
- REGRA DE CTA — INSTRUÇÃO CRÍTICA: O CTA base fornecido pelo usuário é INTOCÁVEL e deve aparecer LITERALMENTE no CTA final. PROIBIDO substituir, parafrasear ou omitir qualquer palavra do CTA base. Formato obrigatório: [CTA BASE EXATO] + [complemento opcional com gatilho de urgência ou curiosidade]. EXEMPLO CORRETO (CTA base: "Clique em Saiba Mais"): ✅ "Clique em Saiba Mais e transforme sua criação de anúncios hoje" ✅ "Clique em Saiba Mais — seu próximo criativo leva 60 segundos" ✅ "Clique em Saiba Mais agora". EXEMPLO ERRADO — TERMINANTEMENTE PROIBIDO: ❌ "Clique e mude sua forma de fazer anúncios agora" ❌ "Descubra como criar anúncios em 60 segundos" ❌ Qualquer CTA que não comece com as palavras exatas do CTA base. O CTA deve ser destacado com botão, faixa ou elemento visual chamativo.
- Exemplos por nicho: fitness → halteres, chamas, troféus; beleza → florais, brilhos, pétalas; educação → livros, lâmpadas, estrelas; tech → circuitos, partículas, gradientes; alimentação → ingredientes, vapor, texturas orgânicas`;

const tools = [
  {
    type: "function",
    function: {
      name: "generate_copies",
      description: "Return 3 ad copy angles, each with exactly 1 visual concept",
      parameters: {
        type: "object",
        properties: {
          angles: {
            type: "array",
            description: "Exatamente 3 ângulos de copy, cada um com 1 conceito visual",
            items: {
              type: "object",
              properties: {
                angle_name: { type: "string", description: "Nome do ângulo (ex: Dor Principal, Transformação, Quebra de Objeção)" },
                headline: { type: "string", description: "Gancho forte e impactante" },
                subheadline: { type: "string", description: "Complemento opcional da headline" },
                body: { type: "string", description: "Corpo curto e persuasivo" },
                cta: { type: "string", description: "Chamada para ação — DEVE conter o texto exato do CTA informado pelo usuário. Pode adicionar frase de gatilho antes ou depois, mas nunca alterar ou omitir o CTA original." },
                visual_concept: {
                  type: "object",
                  description: "Conceito visual premium e harmonioso para este ângulo",
                  properties: {
                    visual_description: { type: "string", description: "Descrição geral da linha visual e atmosfera do criativo" },
                    element_distribution: { type: "string", description: "Como os elementos (texto, produto, ícones) se distribuem no layout" },
                    composition: { type: "string", description: "Orientação de composição e uso do espaço" },
                    visual_hierarchy: { type: "string", description: "Ordem visual: o que o olhar vê primeiro, segundo e terceiro" },
                    layout_style: { type: "string", description: "Estilo e atmosfera do layout (cores, fundos, texturas)" },
                    cta_highlight: { type: "string", description: "Como o CTA é destacado visualmente" },
                    thematic_elements: { type: "string", description: "Ícones, badges, selos ou elementos temáticos alinhados ao produto e nicho — com propósito, sem excesso" },
                  },
                  required: ["visual_description", "element_distribution", "composition", "visual_hierarchy", "layout_style", "cta_highlight", "thematic_elements"],
                },
              },
              required: ["angle_name", "headline", "body", "cta", "visual_concept"],
            },
          },
        },
        required: ["angles"],
      },
    },
  },
];

async function callOpenAI(model: string, effectiveSystemPrompt: string, userPrompt: string, timeoutMs: number) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: effectiveSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_copies" } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const t = await response.text();
      console.error(`OpenAI error (${model}):`, response.status, t);
      if (response.status === 429) return { error: "Rate limit exceeded. Try again shortly.", status: 429 };
      if (response.status === 402) return { error: "Credits exhausted.", status: 402 };
      throw new Error(`OpenAI API error (${response.status})`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    return { result: JSON.parse(toolCall.function.arguments) };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      console.warn(`Timeout after ${timeoutMs}ms with model ${model}`);
      throw new Error("TIMEOUT");
    }
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { product_name, promise, pains, benefits, objections, cta, creative_style, additional_instructions } = await req.json();

    // Inject additional_instructions into system prompt as top-priority rule
    const effectiveSystemPrompt = additional_instructions
      ? `${systemPrompt}\n\n⚠️ INSTRUÇÃO PRIORITÁRIA DO USUÁRIO — DEVE SER APLICADA EM TODOS OS ÂNGULOS, COPIES E CONCEITOS VISUAIS:\n"${additional_instructions}"\nEsta instrução prevalece sobre qualquer outra diretriz. Não ignore. Não adapte. Aplique literalmente.`
      : systemPrompt;

    const userPrompt = `${additional_instructions ? `⚠️ ATENÇÃO — INSTRUÇÃO PRIORITÁRIA: "${additional_instructions}"\nAplique esta instrução em TODOS os ângulos de copy e conceitos visuais antes de qualquer outra consideração.\n\n` : ""}Gere 3 ângulos de copy, cada um com 1 conceito visual premium, para o seguinte produto:

Produto: ${product_name}
Promessa: ${promise}
Dores: ${pains}
Benefícios: ${benefits}
Objeções: ${objections || "Nenhuma informada"}
CTA base: ${cta || "Compre agora"}
${creative_style ? `Estilo visual desejado: ${creative_style}` : ""}

⚠️ REGRA DE CTA — OBRIGATÓRIA: O texto "${cta || "Compre agora"}" deve aparecer EXATAMENTE e INTEGRALMENTE no campo cta de cada ângulo. Você pode complementar com uma frase curta de gatilho (urgência ou curiosidade) posicionada antes ou depois, mas o texto original NÃO pode ser alterado, substituído ou parafraseado. Exemplos válidos: "Só hoje! ${cta || "Compre agora"}" ou "${cta || "Compre agora"} — vagas limitadas". Exemplos INVÁLIDOS: qualquer versão que não contenha "${cta || "Compre agora"}" literalmente.

${additional_instructions ? `\n\nLEMBRETE FINAL: A instrução prioritária "${additional_instructions}" deve estar refletida em todos os elementos gerados.` : ""}\n\nLEMBRETE CRÍTICO — INSTRUÇÃO INVIOLÁVEL: O CTA de TODOS os ângulos DEVE começar obrigatoriamente com as palavras exatas: "${cta || "Compre agora"}". É PROIBIDO usar qualquer outro CTA que não inicie com essa frase. Complementos são permitidos após as palavras do CTA base, mas as palavras originais devem estar presentes e inalteradas.`;

    let response;
    try {
      console.log("Attempting with gpt-4.1-mini...");
      response = await callOpenAI("gpt-4.1-mini", effectiveSystemPrompt, userPrompt, 90000);
    } catch (e) {
      if (e.message === "TIMEOUT") {
        console.log("Primary model timed out, retrying with gpt-4.1...");
        response = await callOpenAI("gpt-4.1", effectiveSystemPrompt, userPrompt, 120000);
      } else {
        throw e;
      }
    }

    if (response.error) {
      return new Response(JSON.stringify({ error: response.error }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(response.result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-copy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
