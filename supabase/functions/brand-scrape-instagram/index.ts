import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { calcOpenAICost, logCost } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

function normalizeUsername(input: string): string {
  let u = input.trim();
  // Extract from full URL: instagram.com/usuario or https://instagram.com/usuario/...
  const urlMatch = u.match(/instagram\.com\/([^/?#\s]+)/i);
  if (urlMatch) u = urlMatch[1];
  // Remove @ prefix
  u = u.replace(/^@+/, "");
  // Remove trailing slashes
  u = u.replace(/\/+$/, "");
  return u;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) throw new Error("APIFY_API_KEY not configured");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Auth
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawInstagram: string = body?.instagram ?? "";

    const username = normalizeUsername(rawInstagram);
    if (!username) {
      return new Response(JSON.stringify({ error: "Informe o username do Instagram" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`brand-scrape-instagram: scraping @${username}`);

    // ── Step 1: Apify Instagram Profile Scraper ──────────────────────────
    const apifyController = new AbortController();
    const apifyTimeout = setTimeout(() => apifyController.abort(), 45_000);

    let apifyResponse: Response;
    try {
      apifyResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usernames: [username],
            resultsLimit: 12,
            scrapePostsUntilDate: "",
          }),
          signal: apifyController.signal,
        },
      );
    } catch (fetchErr: any) {
      clearTimeout(apifyTimeout);
      if (fetchErr?.name === "AbortError") {
        return new Response(JSON.stringify({ error: "A análise demorou demais. Tente novamente." }), {
          status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw fetchErr;
    }
    clearTimeout(apifyTimeout);

    if (!apifyResponse.ok) {
      const errText = await apifyResponse.text();
      console.error(`brand-scrape-instagram: Apify error ${apifyResponse.status}: ${errText}`);
      throw new Error(`Apify error (${apifyResponse.status})`);
    }

    const apifyData = await apifyResponse.json();
    const [profileData] = Array.isArray(apifyData) ? apifyData : [apifyData];

    if (!profileData || !profileData.username) {
      return new Response(JSON.stringify({
        error: "Perfil não encontrado. Verifique se o username está correto e o perfil é público.",
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const followers  = profileData.followersCount ?? profileData.followers ?? 0;
    const postsCount = profileData.latestPosts?.length ?? profileData.postsCount ?? 0;
    const biography  = (profileData.biography ?? "").trim();

    if (followers === 0 && postsCount === 0 && !biography) {
      return new Response(JSON.stringify({
        error: "Perfil não encontrado ou sem informações públicas. Verifique o @ e tente novamente.",
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (profileData.private === true || profileData.isPrivate === true) {
      return new Response(JSON.stringify({
        error: "Este perfil é privado. Use um perfil público para configurar a marca.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`brand-scrape-instagram: found @${profileData.username}, posts=${profileData.latestPosts?.length ?? 0}`);

    // ── Step 2: OpenAI extraction ──────────────────────────────────────
    const postsContext = profileData.latestPosts
      ?.slice(0, 12)
      .map((p: any, i: number) => `Post ${i + 1}: ${p.caption || "(sem legenda)"}`)
      .join("\n") ?? "Sem posts disponíveis";

    const prompt = `Analise o perfil do Instagram abaixo e extraia as informações da marca no formato JSON especificado.
Responda APENAS com o JSON, sem texto adicional, sem markdown.

=== PERFIL ===
Nome: ${profileData.fullName ?? profileData.username}
Bio: ${profileData.biography ?? "não informada"}
Website: ${profileData.externalUrl ?? "não informado"}
Seguidores: ${profileData.followersCount ?? 0}

=== ÚLTIMOS POSTS ===
${postsContext}

=== FORMATO DE RESPOSTA OBRIGATÓRIO ===
{
  "name": "nome do produto ou serviço principal",
  "description": "descrição do que é o produto/serviço (2-3 frases)",
  "benefits": ["benefício 1", "benefício 2", "benefício 3"],
  "differentials": "diferenciais inferidos pelo conteúdo",
  "objective": "vender | engajamento | autoridade | leads",
  "audience_age_min": 18,
  "audience_age_max": 45,
  "audience_gender": "masculino | feminino | todos",
  "audience_interests": ["interesse 1", "interesse 2"],
  "audience_pains": ["dor 1", "dor 2", "dor 3"],
  "audience_desires": ["desejo 1", "desejo 2", "desejo 3"],
  "visual_style": "um dos slugs: moderno-tecnologico | moderno-profissional | clean-minimalista | premium-luxuoso | vibrante-chamativo | claro-light-minimalista | tecnologico-futurista | infantil-ludico | romantico-minimalista | maternidade-premium | divertido-artistico",
  "tone_of_voice": ["tom1", "tom2"],
  "formality_level": "informal | equilibrado | formal",
  "color_primary": null,
  "color_secondary": null,
  "color_accent": null,
  "confidence": {
    "audience": "high | medium | low",
    "tone": "high | medium | low",
    "overall": "high | medium | low"
  }
}

Para cores não há dados suficientes no Instagram — retorne null para color_primary, color_secondary e color_accent.
Para campos que não for possível inferir, use null.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em análise de marcas e marketing digital. Analise perfis do Instagram e extraia informações estruturadas da marca. Responda APENAS com JSON válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error(`brand-scrape-instagram: OpenAI error ${openaiRes.status}: ${errText}`);
      return new Response(JSON.stringify({ error: "Não foi possível analisar o perfil." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiJson = await openaiRes.json();

    const usage = openaiJson.usage;
    if (usage) {
      await logCost(supabaseAdmin, {
        user_id:           user.id,
        api_provider:      "openai",
        model:             "gpt-4.1-mini",
        operation:         "brand_scrape",
        prompt_tokens:     usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens:      usage.total_tokens,
        cost_usd:          calcOpenAICost(usage.prompt_tokens, usage.completion_tokens),
      });
    }

    const rawContent = openaiJson.choices?.[0]?.message?.content?.trim() ?? "";

    let extracted: Record<string, unknown>;
    try {
      // Strip markdown code fences if present
      const clean = rawContent.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      extracted = JSON.parse(clean);
    } catch {
      console.error("brand-scrape-instagram: failed to parse OpenAI JSON:", rawContent.slice(0, 200));
      return new Response(JSON.stringify({ error: "Não foi possível analisar o perfil." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confidence = (extracted.confidence ?? {}) as Record<string, string>;

    const profile = {
      username: profileData.username,
      full_name: profileData.fullName ?? profileData.username,
      followers: profileData.followersCount ?? 0,
      profile_pic_url: profileData.profilePicUrl ?? profileData.profilePicUrlHD ?? null,
    };

    console.log(`brand-scrape-instagram: success @${username} confidence=${JSON.stringify(confidence)}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extracted,
          logo_url: profile.profile_pic_url,
          source_url: `https://instagram.com/${username}`,
        },
        profile,
        source_url: `https://instagram.com/${username}`,
        confidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("brand-scrape-instagram error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao analisar o perfil do Instagram" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
