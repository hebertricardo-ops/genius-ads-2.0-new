import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const UPLOAD_POST_BASE = "https://api.upload-post.com/api";

function extractPlatforms(profile: any): string[] {
  const socialAccounts = profile?.social_accounts;
  if (!socialAccounts || typeof socialAccounts !== "object") return [];

  return Object.entries(socialAccounts)
    .filter(([, value]) => value && typeof value === "object" && Object.keys(value as object).length > 0)
    .map(([platform]) => platform.toLowerCase());
}

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

    const { brand_id } = await req.json().catch(() => ({}));
    if (!brand_id) {
      return new Response(
        JSON.stringify({ error: "brand_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Buscar perfil da marca específica
    const { data: localProfile } = await supabaseAdmin
      .from("social_profiles")
      .select("upload_post_username")
      .eq("user_id", userId)
      .eq("brand_id", brand_id)
      .maybeSingle();

    if (!localProfile) {
      return new Response(
        JSON.stringify({ is_connected: false, connected_platforms: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const username = localProfile.upload_post_username;

    // 2. Buscar perfil no Upload-Post
    const res = await fetch(
      `${UPLOAD_POST_BASE}/uploadposts/users/${encodeURIComponent(username)}`,
      { headers: { Authorization: `Apikey ${UPLOAD_POST_API_KEY}` } },
    );

    // 404 = perfil já não existe no Upload-Post — tratar como sem conexões
    if (res.status === 404) {
      console.log(`social-sync-status: Upload-Post profile not found for username=${username} — cleaning local record`);
      await supabaseAdmin
        .from("social_profiles")
        .delete()
        .eq("user_id", userId)
        .eq("brand_id", brand_id);

      return new Response(
        JSON.stringify({
          is_connected: false,
          connected_platforms: [],
          profile_deleted: true,
          message: "Perfil não encontrado no Upload-Post — registro local removido",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!res.ok) {
      // Erros não-404 (401, 403, 5xx): logar e retornar estado atual do banco
      // sem lançar erro — pode ocorrer após "Logout" no Upload-Post
      const errText = await res.text();
      console.error(`social-sync-status: Upload-Post get user warning (${res.status}): ${errText}`);

      const { data: currentProfile } = await supabaseAdmin
        .from("social_profiles")
        .select("is_connected, connected_platforms")
        .eq("user_id", userId)
        .eq("brand_id", brand_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          is_connected: currentProfile?.is_connected ?? false,
          connected_platforms: currentProfile?.connected_platforms ?? [],
          sync_warning: true,
          message: "Não foi possível verificar o status no momento. Tente novamente.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await res.json();
    const profile = body?.profile ?? body;

    // 3. Extrair plataformas conectadas
    const connectedPlatforms = extractPlatforms(profile);
    const isConnected = connectedPlatforms.length > 0;

    console.log(`social-sync-status: user=${userId} brand=${brand_id} connected=${isConnected} platforms=${connectedPlatforms.join(",")}`);

    // 4. Se todas as plataformas foram desconectadas: deletar perfil e liberar licença
    if (!isConnected) {
      console.log(`social-sync-status: no platforms connected for user=${userId} brand=${brand_id} — deleting profile`);

      // Deletar perfil no Upload-Post para liberar a licença
      try {
        const deleteRes = await fetch(`${UPLOAD_POST_BASE}/uploadposts/users`, {
          method: "DELETE",
          headers: {
            Authorization: `Apikey ${UPLOAD_POST_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        });

        if (deleteRes.ok || deleteRes.status === 404) {
          const deleteBody = deleteRes.ok ? await deleteRes.json().catch(() => ({})) : { not_found: true };
          console.log("social-sync-status: Upload-Post profile deleted:", JSON.stringify(deleteBody));
        } else {
          const errText = await deleteRes.text();
          console.error(`social-sync-status: Upload-Post delete warning (${deleteRes.status}):`, errText);
          // Não bloquear — continuar e limpar o registro local mesmo assim
        }
      } catch (deleteErr) {
        console.error("social-sync-status: Upload-Post delete error:", deleteErr);
        // Não bloquear
      }

      // Deletar registro local — será recriado ao reconectar
      await supabaseAdmin
        .from("social_profiles")
        .delete()
        .eq("user_id", userId)
        .eq("brand_id", brand_id);

      return new Response(
        JSON.stringify({
          is_connected: false,
          connected_platforms: [],
          profile_deleted: true,
          message: "Todas as redes foram desconectadas e a licença foi liberada",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Ainda tem plataformas — atualizar registro
    await supabaseAdmin
      .from("social_profiles")
      .update({
        is_connected: true,
        connected_platforms: connectedPlatforms,
        last_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("brand_id", brand_id);

    return new Response(
      JSON.stringify({ is_connected: true, connected_platforms: connectedPlatforms }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("social-sync-status error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao verificar status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
