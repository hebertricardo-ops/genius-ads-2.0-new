import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const UPLOAD_POST_BASE = "https://api.upload-post.com/api";

// Upload-Post status → content_calendar status
const STATUS_MAP: Record<string, string> = {
  success:   "published",
  failed:    "draft",     // volta para rascunho para reenvio
  scheduled: "scheduled",
  pending:   null!,       // mantém status atual (null = não atualizar)
};

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
    const { calendar_entry_id }: { calendar_entry_id: string } = await req.json();

    if (!calendar_entry_id) throw new Error("calendar_entry_id é obrigatório");

    // 1. Buscar entrada no content_calendar
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from("content_calendar")
      .select("id, status, upload_post_request_id")
      .eq("id", calendar_entry_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !entry) throw new Error("Entrada não encontrada no calendário");

    // 2. Status terminal — não chamar API
    if (entry.status === "published" || entry.status === "idea") {
      return new Response(
        JSON.stringify({
          calendar_entry_id,
          status: entry.status,
          upload_post_status: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!entry.upload_post_request_id) {
      return new Response(
        JSON.stringify({
          calendar_entry_id,
          status: entry.status,
          upload_post_status: null,
          message: "Nenhum request_id de publicação registrado",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Consultar status no Upload-Post
    const statusRes = await fetch(
      `${UPLOAD_POST_BASE}/uploadposts/status?request_id=${encodeURIComponent(entry.upload_post_request_id)}`,
      { headers: { Authorization: `Apikey ${UPLOAD_POST_API_KEY}` } },
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      throw new Error(`Upload-Post status error (${statusRes.status}): ${errText}`);
    }

    const statusData = await statusRes.json();
    const uploadPostStatus: string = (statusData.status ?? "pending").toLowerCase();

    console.log(`social-status: entry=${calendar_entry_id} upload_post_status=${uploadPostStatus}`);

    if (uploadPostStatus === "failed") {
      console.error(`social-status: post failed for entry=${calendar_entry_id}`, statusData);
    }

    // 4. Mapear e atualizar se necessário
    const newStatus = STATUS_MAP[uploadPostStatus];

    if (newStatus && newStatus !== entry.status) {
      await supabaseAdmin
        .from("content_calendar")
        .update({ status: newStatus })
        .eq("id", calendar_entry_id)
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        calendar_entry_id,
        status: newStatus ?? entry.status,
        upload_post_status: uploadPostStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("social-status error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao verificar status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
