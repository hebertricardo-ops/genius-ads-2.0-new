import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const UPLOAD_POST_BASE = "https://api.upload-post.com/api";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const UPLOAD_POST_API_KEY = Deno.env.get("UPLOAD_POST_API_KEY");
    if (!UPLOAD_POST_API_KEY) throw new Error("UPLOAD_POST_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const userId = user.id;

    const { brand_id } = await req.json();
    if (!brand_id) {
      return new Response(
        JSON.stringify({ error: "brand_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verificar propriedade da marca
    const { data: brand } = await supabaseAdmin
      .from("brands")
      .select("id, name")
      .eq("id", brand_id)
      .eq("user_id", userId)
      .single();

    if (!brand) {
      return new Response(
        JSON.stringify({ error: "Marca não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Verificar se já existe social_profile para esta marca
    const { data: existingProfile } = await supabaseAdmin
      .from("social_profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("brand_id", brand_id)
      .maybeSingle();

    // Username único por marca no Upload-Post
    const uploadPostUsername = existingProfile?.upload_post_username
      ?? `${userId.split("-")[0]}_${brand_id.split("-")[0]}`;

    // 2. Se não existe, criar usuário no Upload-Post e inserir perfil local
    if (!existingProfile) {
      const createUserRes = await fetch(`${UPLOAD_POST_BASE}/uploadposts/users`, {
        method: "POST",
        headers: {
          Authorization: `Apikey ${UPLOAD_POST_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: uploadPostUsername }),
      });

      // 409 = usuário já existe no Upload-Post — tudo certo, continuar
      if (!createUserRes.ok && createUserRes.status !== 409) {
        const errText = await createUserRes.text();
        if (createUserRes.status === 403) {
          return new Response(
            JSON.stringify({ error: "Limite de perfis atingido no plano" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        throw new Error(`Upload-Post create user error (${createUserRes.status}): ${errText}`);
      }

      await supabaseAdmin.from("social_profiles").insert({
        user_id: userId,
        brand_id: brand_id,
        upload_post_username: uploadPostUsername,
        is_connected: false,
      });
    }

    // 3. Gerar URL de conexão JWT do Upload-Post
    const jwtRes = await fetch(`${UPLOAD_POST_BASE}/uploadposts/users/generate-jwt`, {
      method: "POST",
      headers: {
        Authorization: `Apikey ${UPLOAD_POST_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: uploadPostUsername,
        redirect_url: `${req.headers.get("origin") || "https://adsgenius.com.br"}/social-accounts?connected=true`,
        logo_image: "https://adsgenius.com.br/logo.png",
        connect_title: `Conecte as redes de "${brand.name}"`,
        connect_description: `Vincule o Instagram e Facebook da marca ${brand.name} para publicar diretamente pelo Genius ADS`,
        platforms: ["instagram", "facebook"],
        show_calendar: false,
        redirect_button_text: "Salvar e voltar",
      }),
    });

    if (!jwtRes.ok) {
      const errText = await jwtRes.text();
      throw new Error(`Upload-Post JWT error (${jwtRes.status}): ${errText}`);
    }

    const jwtData = await jwtRes.json();
    const connectUrl = jwtData.access_url ?? jwtData.url ?? jwtData.connect_url;

    if (!connectUrl) throw new Error("Upload-Post não retornou URL de conexão");

    return new Response(
      JSON.stringify({
        connect_url: connectUrl,
        is_connected: existingProfile?.is_connected ?? false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("social-connect error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Não foi possível gerar o link de conexão" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
