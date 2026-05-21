import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em análise de marcas e copywriting.
Analise o conteúdo do site abaixo e extraia as informações da marca no formato JSON especificado.
Responda APENAS com o JSON, sem texto adicional, sem markdown.

Formato de resposta obrigatório:
{
  "name": "nome do produto ou serviço principal",
  "description": "descrição clara do que é o produto/serviço (2-3 frases)",
  "benefits": ["benefício 1", "benefício 2", "benefício 3"],
  "differentials": "o que diferencia esse produto/serviço dos concorrentes",
  "objective": "vender | engajamento | autoridade | leads",
  "audience_age_min": 18,
  "audience_age_max": 45,
  "audience_gender": "masculino | feminino | todos",
  "audience_interests": ["interesse 1", "interesse 2"],
  "audience_pains": ["dor 1", "dor 2", "dor 3"],
  "audience_desires": ["desejo 1", "desejo 2", "desejo 3"],
  "visual_style": "slug do estilo mais próximo entre: moderno-tecnologico | moderno-profissional | clean-minimalista | premium-luxuoso | vibrante-chamativo | claro-light-minimalista | tecnologico-futurista | infantil-ludico | romantico-minimalista | maternidade-premium | divertido-artistico",
  "tone_of_voice": ["tom1", "tom2"],
  "formality_level": "informal | equilibrado | formal",
  "confidence": {
    "audience": "high | medium | low",
    "overall": "high | medium | low"
  }
}

Para campos que não for possível inferir com segurança, use null.
Não inclua campos de cores.`;

const VISION_COLOR_PROMPT = `Analise este screenshot do site e extraia as cores principais da identidade visual da marca.

Regras:
- Foque nas cores mais características e marcantes (botões, cabeçalhos, destaques, logo)
- Ignore branco puro, preto puro e cinzas neutros (a menos que sejam claramente a cor de marca)
- Retorne exatamente 3 cores em hex #rrggbb
- Se não houver 3 cores distintas, repita a principal ou use null

Responda APENAS com este JSON, sem texto adicional:
{"primary":"#rrggbb","secondary":"#rrggbb ou null","accent":"#rrggbb ou null"}`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedColors {
  primary: string | null;
  secondary: string | null;
  accent: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidHex(s: unknown): boolean {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);
}

function normalizeHex(s: unknown): string | null {
  if (!isValidHex(s)) return null;
  return (s as string).toLowerCase();
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Color extraction via OpenAI Vision ───────────────────────────────────────

async function extractColorsFromVision(
  imageUrl: string,
  openaiKey: string,
): Promise<ExtractedColors> {
  const empty: ExtractedColors = { primary: null, secondary: null, accent: null };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
              { type: "text", text: VISION_COLOR_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[brand-scrape-website] vision error:", res.status, await res.text());
      return empty;
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    console.log("[brand-scrape-website] vision colors result:", parsed);

    return {
      primary:   normalizeHex(parsed.primary),
      secondary: normalizeHex(parsed.secondary),
      accent:    normalizeHex(parsed.accent),
    };
  } catch (e) {
    console.error("[brand-scrape-website] vision parse error:", e);
    return empty;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return errorResponse("Unauthorized", 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  let url: string;
  try {
    const body = await req.json();
    url = body.url?.trim();
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      return errorResponse("URL inválida", 400);
    }
  } catch {
    return errorResponse("URL inválida", 400);
  }

  const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

  if (!FIRECRAWL_KEY || !OPENAI_KEY) {
    return errorResponse("Configuração do servidor incompleta", 500);
  }

  const timeout = new Promise<Response>((_, reject) =>
    setTimeout(() => reject(new Error("TIMEOUT")), 50000)
  );

  const main = async (): Promise<Response> => {
    // ── Step 1: Firecrawl scrape ──────────────────────────────────────────────
    const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "branding", "screenshot@fullPage"],
        onlyMainContent: false,
        maxAge: 0,
      }),
    });

    if (!firecrawlResponse.ok) {
      const errText = await firecrawlResponse.text();
      console.error("[brand-scrape-website] firecrawl error:", firecrawlResponse.status, errText);
      return errorResponse(
        "Não foi possível acessar o site. Verifique se a URL está correta e o site está no ar.",
        422
      );
    }

    // deno-lint-ignore no-explicit-any
    const firecrawlData: any = await firecrawlResponse.json();

    if (!firecrawlData.success) {
      console.error("[brand-scrape-website] firecrawl success=false:", JSON.stringify(firecrawlData));
      return errorResponse(
        "Não foi possível acessar o site. Verifique se a URL está correta e o site está no ar.",
        422
      );
    }

    const markdown     = firecrawlData.data?.markdown ?? "";
    const screenshotUrl = firecrawlData.data?.screenshot ?? null;
    // deno-lint-ignore no-explicit-any
    const branding     = firecrawlData.data?.branding as any ?? null;

    // ── Debug logs ────────────────────────────────────────────────────────────
    console.log("=== FIRECRAWL RESPONSE KEYS ===");
    console.log("Keys in data:", Object.keys(firecrawlData.data ?? {}));
    console.log("Screenshot URL:", screenshotUrl);
    console.log("Has branding:", !!branding);
    console.log("Branding raw:", JSON.stringify(branding));

    if (!markdown || markdown.length < 50) {
      return errorResponse(
        "Não foi possível acessar o site. Verifique se a URL está correta e o site está no ar.",
        422
      );
    }

    // ── Step 2: Extrair cores do branding ─────────────────────────────────────
    const brandingColors: ExtractedColors = {
      primary:   normalizeHex(branding?.colors?.primary),
      secondary: normalizeHex(branding?.colors?.secondary),
      accent:    normalizeHex(branding?.colors?.accent),
    };
    const brandingLogoUrl: string | null = branding?.images?.logo ?? null;

    console.log("[brand-scrape-website] branding colors:", brandingColors);
    console.log("[brand-scrape-website] branding logo:", brandingLogoUrl);

    // ── Step 3: Brand info (text) via OpenAI + cores finais ───────────────────
    const hasBrandingColors = !!(brandingColors.primary && brandingColors.secondary);

    const [aiResult, colorsResult] = await Promise.allSettled([
      // Análise textual da marca
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `URL analisada: ${url}\n\nConteúdo do site:\n\n${markdown.slice(0, 12000)}`,
            },
          ],
        }),
      }).then(r => r.json()),

      // Cores: branding direto (sem custo Vision) ou Vision no screenshot
      hasBrandingColors
        ? Promise.resolve(brandingColors)
        : screenshotUrl
          ? extractColorsFromVision(screenshotUrl, OPENAI_KEY)
          : Promise.resolve({ primary: null, secondary: null, accent: null }),
    ]);

    // ── Parse resultado textual ───────────────────────────────────────────────
    let extracted: Record<string, unknown> = {};
    if (aiResult.status === "fulfilled") {
      try {
        const raw     = aiResult.value.choices?.[0]?.message?.content?.trim() ?? "";
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        extracted = JSON.parse(cleaned);
      } catch {
        return errorResponse("Não foi possível analisar o conteúdo do site.", 422);
      }
    } else {
      return errorResponse("Não foi possível analisar o conteúdo do site.", 422);
    }

    // ── Cores finais ──────────────────────────────────────────────────────────
    const finalColors: ExtractedColors =
      colorsResult.status === "fulfilled"
        ? colorsResult.value
        : { primary: null, secondary: null, accent: null };

    const colorConfidence = finalColors.primary !== null
      ? (hasBrandingColors ? "high" : "medium")
      : "low";

    const aiConf = (extracted.confidence as Record<string, string>) ?? {};
    const confidence = {
      colors:   colorConfidence,
      audience: aiConf.audience ?? "medium",
      overall:  aiConf.overall  ?? "medium",
    };

    console.log("[brand-scrape-website] final colors:", finalColors, "confidence:", colorConfidence);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extracted,
          logo_url:        brandingLogoUrl,
          color_primary:   finalColors.primary,
          color_secondary: finalColors.secondary,
          color_accent:    finalColors.accent,
        },
        source_url: url,
        confidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  };

  try {
    return await Promise.race([main(), timeout]);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "TIMEOUT") {
      return errorResponse("A análise demorou demais. Tente novamente.", 408);
    }
    console.error("[brand-scrape-website] unexpected error:", err);
    return errorResponse("Erro interno do servidor.", 500);
  }
});
