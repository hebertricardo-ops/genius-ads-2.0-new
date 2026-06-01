import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { ensureSupportedFormat } from "../_shared/image-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FORMAT_TO_IMAGE_SIZE: Record<string, string> = {
  "1:1": "square_hd",
  "4:5": "portrait_4_3",
  "9:16": "portrait_16_9",
  "16:9": "landscape_16_9",
};

function buildPrompt(data: {
  product_name: string;
  promise?: string;
  pains?: string;
  benefits?: string;
  objections?: string;
  format: string;
  headline: string;
  body: string;
  cta: string;
  color_palette?: string[];
  has_logo?: boolean;
  additional_instructions?: string;
  image_instructions?: string[];
  visual_option: {
    visual_description: string;
    element_distribution: string;
    composition: string;
    visual_hierarchy: string;
    layout_style: string;
    cta_highlight: string;
    thematic_elements?: string;
  };
}): string {
  const { visual_option: vo } = data;

  const toLines = (text?: string) =>
    text ? text.split("\n").map(l => l.trim()).filter(Boolean) : [];

  // imagens_referencia block
  const imagens_referencia: Record<string, string> = {
    instrucao: "usar as imagens fornecidas como base principal da composição, preservando identidade visual e contexto da marca/produto, sempre priorizar layout da marca",
  };
  if (data.has_logo) {
    imagens_referencia.logo = "A ÚLTIMA imagem fornecida é o logotipo da marca — deve aparecer na composição final em posição proeminente (ex: topo-esquerda, topo-direita ou centro-inferior). Preservar forma, cores e proporções originais exatamente — não distorcer, recolorir ou cortar.";
  }
  if (data.image_instructions && data.image_instructions.some(i => i.trim())) {
    imagens_referencia.instrucoes_por_imagem = data.image_instructions
      .map((inst, idx) =>
        `imagem ${idx + 1}: ${inst.trim() || "usar como foto do produto na composição principal"}`
      )
      .join("; ");
  }

  // instrucoes_extras — base + condicionais
  const instrucoes_extras: string[] = [
    "manter design clean, premium e informativo",
    "garantir legibilidade em telas mobile",
    "priorizar contraste forte entre elementos principais e fundo",
    "usar as imagens de referência como elementos centrais da composição",
    "não adicionar texto renderizado na imagem; apenas compor o visual",
    "evitar poluição visual e manter acabamento profissional",
    "criar background elaborado com elementos visuais que façam referência ao produto e nicho, evitar fundos de cor única ou gradientes puros — usar texturas, gradientes com inclusão de elementos, padrões ou elementos contextuais",
    "incluir efeitos tecnológicos como linhas geométricas finas, gradientes sutis, elementos em transparência, overlays e formas abstratas que deem um visual moderno e tecnológico ao criativo",
    "a headline deve ocupar de 30% a 40% da área da imagem, com tipografia grande e impactante; aplicar cor de destaque (contraste forte ou cor de acento da paleta) nas palavras ou trechos-chave da headline para criar hierarquia visual e aumentar o impacto",
  ];

  if (data.color_palette && data.color_palette.length > 0) {
    const [primary, secondary, accent] = data.color_palette;
    const parts = [
      primary ? `primária: ${primary}` : null,
      secondary ? `secundária: ${secondary}` : null,
      accent ? `destaque: ${accent}` : null,
    ].filter(Boolean);
    instrucoes_extras.push(`utilizar a seguinte paleta de cores da marca: ${parts.join(", ")}`);
  }

  if (vo.thematic_elements) {
    instrucoes_extras.push(`incluir elementos visuais temáticos alinhados ao nicho: ${vo.thematic_elements}`);
  }

  if (data.additional_instructions) {
    instrucoes_extras.push(`orientações adicionais do usuário: ${data.additional_instructions}`);
  }

  const promptObj = {
    tipo: "criativo_publicitario_estatico",
    formato: data.format,
    idioma_textos: "português do Brasil",
    objetivo: "anuncio_meta_ads",
    produto: {
      nome: data.product_name,
      promessa: data.promise || "",
    },
    conceito_criativo: {
      angulo: data.headline,
      dor_principal: toLines(data.pains),
      beneficios: toLines(data.benefits),
      objecoes_trabalhadas: toLines(data.objections),
    },
    imagens_referencia,
    layout: {
      estilo: vo.layout_style,
      composicao: vo.composition,
      hierarquia_visual: vo.visual_hierarchy,
      distribuicao_elementos: vo.element_distribution,
      destaque_cta: vo.cta_highlight,
    },
    textos: {
      headline: data.headline,
      subheadline: data.body,
      cta: data.cta,
    },
    direcao_visual: {
      descricao: vo.visual_description,
      atmosfera: "clean premium, conversão alta, estética realista de anúncio para Instagram/Facebook",
    },
    instrucoes_extras,
  };

  return JSON.stringify(promptObj, null, 2);
}

async function falRequest(
  url: string,
  falKey: string,
  body: Record<string, unknown>,
  index: number,
  maxRetries = 3,
): Promise<{ url: string; falRequestId: string | undefined }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      if (attempt === maxRetries) {
        throw new Error("Limite de requisições atingido. Tente novamente em alguns minutos.");
      }
      const wait = Math.pow(2, attempt + 1) * 1000;
      console.log(`Rate limited (429) on image ${index}, waiting ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`fal.ai error (${res.status}): ${errText.substring(0, 500)}`);
    }

    const result = await res.json();
    const generatedUrl = result?.images?.[0]?.url;
    if (!generatedUrl) {
      throw new Error(`No image in fal.ai response for index ${index}: ${JSON.stringify(result).substring(0, 500)}`);
    }

    const falRequestId: string | undefined =
      result?.request_id ?? res.headers.get("x-fal-request-id") ?? undefined;

    return { url: generatedUrl, falRequestId };
  }
  throw new Error("Max retries exceeded");
}

function generateGptImage2(falKey: string, prompt: string, imageUrls: string[], imageSize: string, index: number) {
  return falRequest(
    "https://fal.run/openai/gpt-image-2/edit",
    falKey,
    { prompt, image_urls: imageUrls, image_size: imageSize, quality: "medium", num_images: 1, output_format: "png" },
    index,
  );
}

function generateNanoBanana(falKey: string, modelSlug: string, prompt: string, imageUrls: string[], aspectRatio: string, index: number) {
  const isNanoBanana2 = modelSlug === "nano-banana-2";
  return falRequest(
    `https://fal.run/fal-ai/${modelSlug}/edit`,
    falKey,
    {
      prompt: JSON.stringify({ prompt }),
      image_urls: imageUrls,
      aspect_ratio: aspectRatio,
      resolution: "1K",
      num_images: 1,
      output_format: "png",
      ...(isNanoBanana2 ? { limit_generations: true } : {}),
    },
    index,
  );
}

async function generateCaption(
  openaiKey: string,
  params: {
    product_name: string;
    headline: string;
    body: string;
    cta: string;
    pains?: string;
    benefits?: string;
  },
): Promise<string> {
  const userContent = [
    `Produto: ${params.product_name}`,
    `Headline do anúncio: ${params.headline}`,
    `Copy: ${params.body}`,
    `CTA: ${params.cta}`,
    params.pains ? `Dores do público: ${params.pains}` : null,
    params.benefits ? `Benefícios: ${params.benefits}` : null,
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é especialista em copywriting para redes sociais. Gere uma legenda completa para postagem no Instagram/Facebook em português do Brasil, seguindo EXATAMENTE esta estrutura e ordem (não inclua os títulos das seções no texto final):

1. HEADLINE — frase de abertura impactante baseada na copy do anúncio
(linha em branco)
2. DOR — 1 a 2 frases identificando o problema/frustração do público
(linha em branco)
3. TRANSFORMAÇÃO — 1 a 2 frases mostrando a mudança concreta que o produto proporciona
(linha em branco)
4. BENEFÍCIOS — 3 a 4 benefícios principais, cada um em uma linha, com emoji relevante no início
(linha em branco)
5. CTA — use EXATAMENTE o texto de CTA fornecido; pode adicionar uma frase curta de urgência ou curiosidade antes ou depois, mas o texto original do CTA deve aparecer íntegro
(linha em branco)
6. HASHTAGS — 10 a 15 hashtags relevantes ao produto e nicho

Retorne APENAS o texto formatado, sem títulos de seção, sem numeração.`,
        },
        { role: "user", content: userContent },
      ],
      max_tokens: 700,
      temperature: 0.75,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI caption error (${response.status}): ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function updateRequestStatus(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  productName: string,
  status: string,
) {
  try {
    const { data } = await supabaseAdmin
      .from("creative_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("product_name", productName)
      .eq("status", "processing")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.id) {
      await supabaseAdmin
        .from("creative_requests")
        .update({ status })
        .eq("id", data.id);
      console.log(`Updated request ${data.id} status to '${status}'`);
    }
  } catch (e) {
    console.error("Failed to update request status:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) throw new Error("FAL_KEY not configured");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const {
      image_urls,
      logo_url,
      product_name,
      promise,
      pains,
      benefits,
      objections,
      headline,
      body,
      cta,
      visual_option,
      format,
      color_palette,
      creative_style,
      additional_instructions,
      image_instructions,
      request_id,
      model,
      credits_override,
      save_data,
    } = await req.json();

    if (!image_urls?.length && !logo_url) throw new Error("At least one image or a logo is required");
    if (!product_name || !headline || !cta || !visual_option)
      throw new Error("Missing required fields");

    // Extract user_id from JWT
    let userId: string | null = null;
    try {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id || null;
    } catch { /* ignore */ }

    const CREDITS_PER_IMAGE = 10;
    const numImages = 1;
    const totalCost = credits_override ?? CREDITS_PER_IMAGE;
    const aspectRatio = FORMAT_TO_IMAGE_SIZE[format] || "square_hd";

    // Verificar saldo ANTES de chamar o fal.ai
    if (userId) {
      const { data: creditData } = await supabaseAdmin
        .from("user_credits")
        .select("credits_balance")
        .eq("user_id", userId)
        .single();

      if (!creditData || creditData.credits_balance < totalCost) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Converter SVGs para PNG antes de enviar ao fal.ai
    const safeImageUrls = userId
      ? await Promise.all(image_urls.map((url: string) => ensureSupportedFormat(url, supabaseAdmin, userId)))
      : image_urls;
    const safeLogoUrl = logo_url && userId
      ? await ensureSupportedFormat(logo_url, supabaseAdmin, userId)
      : logo_url;

    // Product images first, brand logo last (prompt references it as "last reference image")
    const allImageUrls: string[] = safeLogoUrl
      ? [...safeImageUrls, safeLogoUrl]
      : safeImageUrls;

    const prompt = buildPrompt({
      product_name,
      promise,
      pains,
      benefits,
      objections,
      format,
      headline,
      body,
      cta,
      color_palette,
      has_logo: !!safeLogoUrl,
      additional_instructions,
      image_instructions,
      visual_option,
    });

    // Start caption generation in parallel with image generation
    const captionPromise = generateCaption(openaiKey, { product_name, headline, body, cta, pains, benefits });

    console.log(`Generating ${numImages} image(s) via fal.ai model: ${model || "gpt-image-2"}, logo: ${!!logo_url}, colors: ${color_palette?.length ?? 0}`);
    const generatedImages: { url: string; falRequestId: string | undefined }[] = [];
    for (let i = 0; i < numImages; i++) {
      console.log(`Generating image ${i + 1}/${numImages}...`);
      let img: { url: string; falRequestId: string | undefined };
      if (model === "nano-banana-pro" || model === "nano-banana-2") {
        img = await generateNanoBanana(falKey, model, prompt, allImageUrls, format || "1:1", i);
      } else {
        img = await generateGptImage2(falKey, prompt, allImageUrls, aspectRatio, i);
      }
      if (img.falRequestId) console.log(`fal request_id image ${i + 1}: ${img.falRequestId}`);
      generatedImages.push(img);
    }

    console.log("Uploading", generatedImages.length, "images to storage...");

    const uploadedUrls = await Promise.all(
      generatedImages.map(async (img) => {
        const imgRes = await fetch(img.url);
        if (!imgRes.ok) throw new Error(`Failed to download generated image: ${imgRes.status}`);
        const arrayBuf = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);

        const contentType = imgRes.headers.get("content-type") || "image/png";
        const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error } = await supabaseAdmin.storage
          .from("generated-creatives")
          .upload(fileName, bytes, { contentType, upsert: false });

        if (error) throw new Error(`Storage upload failed: ${error.message}`);

        const { data: urlData } = supabaseAdmin.storage
          .from("generated-creatives")
          .getPublicUrl(fileName);

        return { url: urlData.publicUrl, falRequestId: img.falRequestId };
      })
    );

    // Await caption (runs concurrently with image generation/upload)
    let caption = "";
    try {
      caption = await captionPromise;
      console.log("Caption generated successfully");
    } catch (e) {
      console.error("Caption generation failed (non-fatal):", e);
    }

    // Deduzir créditos APÓS sucesso (operação atômica — sem race condition)
    if (userId && uploadedUrls.length > 0) {
      const amountToDeduct = totalCost * uploadedUrls.length;
      const { data: deductResult } = await supabaseAdmin.rpc("deduct_credits", {
        p_user_id: userId,
        p_amount: amountToDeduct,
      });
      if (!deductResult?.success) {
        console.error("Falha ao deduzir créditos:", deductResult?.error);
      } else {
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId,
          type: "usage",
          amount: -amountToDeduct,
          description: `Criativo gerado: ${product_name} (${uploadedUrls.length} imagem${uploadedUrls.length > 1 ? "ns" : ""})`,
        });
        console.log(`Deducted ${amountToDeduct} credits from user ${userId}`);
      }
    }

    console.log("Successfully generated and uploaded", uploadedUrls.length, "images");

    // INSERT em generated_creatives via supabaseAdmin (server-side, sem RLS, sem risco de sessão)
    let creativeId: string | null = null;
    if (userId && save_data && uploadedUrls.length > 0) {
      const { url: imageUrl, falRequestId } = uploadedUrls[0];
      const finalCopyData = { ...(save_data.copy_data ?? {}), caption };
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from("generated_creatives")
        .insert({
          user_id: userId,
          image_url: imageUrl,
          request_id: save_data.request_id ?? null,
          brand_id: save_data.brand_id ?? null,
          fal_request_id: falRequestId ?? null,
          copy_data: finalCopyData,
          credits_used: totalCost,
          source: save_data.source ?? "generated",
        })
        .select("id")
        .single();
      if (insertError) {
        console.error("Failed to insert generated_creative:", insertError.message);
      } else {
        creativeId = insertData.id;
        console.log(`Inserted generated_creative: ${creativeId}`);
      }
    }

    return new Response(JSON.stringify({
      creative_id: creativeId,
      image_url: uploadedUrls[0]?.url ?? null,
      fal_request_id: uploadedUrls[0]?.falRequestId ?? null,
      caption,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-creative error:", e);

    // Try to update request status to 'error'
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Find the most recent processing request and mark it as error
      const { data: processingRequests } = await supabaseAdmin
        .from("creative_requests")
        .select("id")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(5);

      if (processingRequests?.length) {
        for (const req of processingRequests) {
          await supabaseAdmin
            .from("creative_requests")
            .update({ status: "error" })
            .eq("id", req.id);
        }
        console.log(`Marked ${processingRequests.length} processing requests as error`);
      }
    } catch (statusErr) {
      console.error("Failed to update request status to error:", statusErr);
    }

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
