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

    const {
      calendar_entry_id,
      creative_id,
      brand_id,
      image_url,
      image_urls,
      is_carousel,
      caption,
      platforms,
      title,
      scheduled_for,
    }: {
      calendar_entry_id?: string;
      creative_id?: string;
      brand_id?: string;
      image_url: string;
      image_urls?: string[];
      is_carousel?: boolean;
      caption: string;
      platforms: string[];
      title: string;
      scheduled_for?: string | null;
    } = await req.json();

    if (!image_url || !caption || !platforms?.length || !title) {
      throw new Error("Campos obrigatórios: image_url, caption, platforms, title");
    }

    // 1. Buscar social_profile da marca específica
    let profileQuery = supabaseAdmin
      .from("social_profiles")
      .select("upload_post_username, is_connected")
      .eq("user_id", userId);

    if (brand_id) {
      profileQuery = profileQuery.eq("brand_id", brand_id);
    }

    const { data: socialProfile } = await profileQuery.maybeSingle();

    if (!socialProfile?.is_connected) {
      return new Response(
        JSON.stringify({ error: "Nenhuma rede social conectada para esta marca" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const uploadPostUsername = socialProfile.upload_post_username;

    // 2. Publicar / agendar via Upload-Post
    const photos = (image_urls && image_urls.length > 0)
      ? image_urls.filter(Boolean)
      : [image_url];

    const formData = new FormData();
    for (const url of photos) {
      formData.append("photos[]", url);
    }
    if (is_carousel && photos.length > 1) {
      formData.append("post_type", "carousel");
    }
    formData.append("user", uploadPostUsername);
    for (const platform of platforms) {
      formData.append("platform[]", platform);
    }
    formData.append("title", title.slice(0, 100));
    formData.append("description", caption);
    formData.append("async_upload", "true");
    if (scheduled_for) {
      formData.append("schedule_date", scheduled_for);
    }

    const publishRes = await fetch(`${UPLOAD_POST_BASE}/upload_photos`, {
      method: "POST",
      headers: { Authorization: `Apikey ${UPLOAD_POST_API_KEY}` },
      body: formData,
    });

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      console.error(`social-publish: Upload-Post error ${publishRes.status} | photos=${photos.length} | is_carousel=${is_carousel} | caption_len=${caption?.length} | body=${errText}`);
      throw new Error(`Erro ao publicar via Upload-Post (${publishRes.status}): ${errText}`);
    }

    const publishData = await publishRes.json();
    const uploadPostRequestId: string = publishData.request_id ?? publishData.id ?? "";

    const postStatus = scheduled_for ? "scheduled" : "published";
    const scheduledDate = scheduled_for
      ? scheduled_for.split("T")[0]
      : new Date().toISOString().split("T")[0];

    // 3a. Atualizar entrada existente no content_calendar
    let entryId = calendar_entry_id;

    if (entryId) {
      await supabaseAdmin
        .from("content_calendar")
        .update({
          status: postStatus,
          upload_post_request_id: uploadPostRequestId,
          image_url,
          caption,
          scheduled_date: scheduledDate,
          platform: platforms[0],
        })
        .eq("id", entryId)
        .eq("user_id", userId);
    } else {
      // 3b. Criar nova entrada
      const { data: newEntry, error: insertError } = await supabaseAdmin
        .from("content_calendar")
        .insert({
          user_id: userId,
          brand_id: brand_id ?? null,
          creative_id: creative_id ?? null,
          title,
          caption,
          image_url,
          platform: platforms[0],
          scheduled_date: scheduledDate,
          status: postStatus,
          upload_post_request_id: uploadPostRequestId,
          content_type: "post",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      entryId = newEntry.id;
    }

    console.log(`social-publish: ${postStatus} entry=${entryId} brand=${brand_id} request_id=${uploadPostRequestId}`);

    return new Response(
      JSON.stringify({
        calendar_entry_id: entryId,
        request_id: uploadPostRequestId,
        status: postStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("social-publish error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao publicar" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
