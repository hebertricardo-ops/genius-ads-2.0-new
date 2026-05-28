import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FAL_ENDPOINT = "https://fal.run/openai/gpt-image-2/edit";
const CREDITS_PER_EDIT = 6;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FAL_KEY = Deno.env.get("FAL_KEY");
    if (!FAL_KEY) throw new Error("FAL_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Extrair userId do JWT
    let userId: string | null = null;
    try {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError) console.error("[edit-creative] getUser error:", authError.message);
      userId = user?.id || null;
    } catch (e) {
      console.error("[edit-creative] getUser exception:", e);
    }

    if (!userId) throw new Error("Unauthorized — token inválido ou expirado");

    const {
      original_creative_id,
      parent_edit_id,
      source_image_url,
      edit_element,
      user_message,
      brand_id,
      format,
    } = await req.json();

    if (!original_creative_id || !source_image_url || !user_message) {
      throw new Error("Missing required fields: original_creative_id, source_image_url, user_message");
    }

    // Verificar saldo antes de gerar
    const { data: creditData } = await supabaseAdmin
      .from("user_credits")
      .select("credits_balance")
      .eq("user_id", userId)
      .single();

    if (!creditData || creditData.credits_balance < CREDITS_PER_EDIT) {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Registrar edição com status processing
    const { data: editRecord, error: insertError } = await supabaseAdmin
      .from("creative_edits")
      .insert({
        user_id: userId,
        brand_id: brand_id ?? null,
        original_creative_id,
        parent_edit_id: parent_edit_id ?? null,
        source_image_url,
        edit_element: edit_element ?? null,
        edit_instruction: user_message,
        edit_prompt_raw: null,
        status: "processing",
        credits_used: CREDITS_PER_EDIT,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(`Failed to create edit record: ${insertError.message}`);
    const editId = editRecord.id;

    // Montar prompt para o fal.ai
    const elementContext = edit_element && edit_element !== "free"
      ? `Elemento a editar: ${edit_element}. `
      : "";
    const translatedPrompt = `${elementContext}Instrução de edição: ${user_message}. Mantenha todos os demais elementos visuais inalterados. Preservar identidade visual, paleta de cores e composição geral do criativo original.`;

    const FORMAT_TO_IMAGE_SIZE: Record<string, string> = {
      "1:1":  "square_hd",
      "4:5":  "portrait_4_3",
      "9:16": "portrait_16_9",
      "16:9": "landscape_16_9",
    };
    const imageSize = FORMAT_TO_IMAGE_SIZE[format ?? "1:1"] ?? "square_hd";

    // Chamar fal.ai — mesmo padrão do generate-creative
    const falPayload = {
      prompt:        translatedPrompt,
      image_urls:    [source_image_url],
      image_size:    imageSize,
      quality:       "medium",
      num_images:    1,
      output_format: "png",
    };

    console.log(`[edit-creative] Calling fal.ai for edit ${editId}...`);

    const falResponse = await fetch(FAL_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(falPayload),
    });

    if (!falResponse.ok) {
      const errText = await falResponse.text();
      await supabaseAdmin
        .from("creative_edits")
        .update({ status: "failed", error_message: `fal.ai error ${falResponse.status}: ${errText.slice(0, 300)}` })
        .eq("id", editId);
      throw new Error(`fal.ai error ${falResponse.status}: ${errText.slice(0, 300)}`);
    }

    const falResult = await falResponse.json();
    const generatedUrl = falResult?.images?.[0]?.url;

    if (!generatedUrl) {
      const raw = JSON.stringify(falResult).slice(0, 200);
      await supabaseAdmin
        .from("creative_edits")
        .update({ status: "failed", error_message: `fal.ai não retornou imagem: ${raw}` })
        .eq("id", editId);
      throw new Error(`fal.ai não retornou imagem: ${raw}`);
    }

    console.log(`[edit-creative] Image generated: ${generatedUrl.slice(0, 80)}...`);

    // Fazer upload para o Storage
    const imgRes = await fetch(generatedUrl);
    if (!imgRes.ok) throw new Error(`Failed to download generated image: ${imgRes.status}`);
    const arrayBuf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const fileName = `edit-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("generated-creatives")
      .upload(fileName, bytes, { contentType, upsert: false });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: urlData } = supabaseAdmin.storage
      .from("generated-creatives")
      .getPublicUrl(fileName);

    const resultImageUrl = urlData.publicUrl;

    // Atualizar registro com resultado
    await supabaseAdmin
      .from("creative_edits")
      .update({
        status: "completed",
        result_image_url: resultImageUrl,
        edit_prompt_raw: translatedPrompt,
      })
      .eq("id", editId);

    // Deduzir créditos de forma atômica após sucesso
    const { data: deductResult } = await supabaseAdmin.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: CREDITS_PER_EDIT,
    });

    if (!deductResult?.success) {
      console.error("Falha ao deduzir créditos:", deductResult?.error);
    } else {
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: userId,
        type: "usage",
        amount: -CREDITS_PER_EDIT,
        description: `Edição de criativo: ${edit_element ?? "livre"}`,
      });
      console.log(`[edit-creative] Deducted ${CREDITS_PER_EDIT} credits from user ${userId}`);
    }

    return new Response(
      JSON.stringify({ edit_id: editId, result_image_url: resultImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("edit-creative error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
