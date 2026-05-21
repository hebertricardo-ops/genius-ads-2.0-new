import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const UPLOAD_POST_BASE = "https://api.upload-post.com/api";

const STATUS_MAP: Record<string, string | null> = {
  completed:  "published",  // Upload-Post usa "completed", não "success"
  success:    "published",  // mantido por compatibilidade
  failed:     "draft",
  error:      "draft",
  scheduled:  null,         // ainda não chegou a hora — manter
  pending:    null,
  processing: null,
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
    const today = new Date().toISOString().split("T")[0];

    // 1. Buscar posts agendados com data já passada/hoje e com request_id
    const { data: entries, error: fetchError } = await supabaseAdmin
      .from("content_calendar")
      .select("id, status, upload_post_request_id, scheduled_date")
      .eq("user_id", userId)
      .eq("status", "scheduled")
      .not("upload_post_request_id", "is", null)
      .lte("scheduled_date", today);

    if (fetchError) throw fetchError;

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, updated: 0, results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: { id: string; old_status: string; new_status: string }[] = [];
    let updated = 0;

    // 2. Verificar status de cada entry no Upload-Post
    for (const entry of entries) {
      try {
        const statusRes = await fetch(
          `${UPLOAD_POST_BASE}/uploadposts/status?request_id=${encodeURIComponent(entry.upload_post_request_id)}`,
          { headers: { Authorization: `Apikey ${UPLOAD_POST_API_KEY}` } },
        );

        if (!statusRes.ok) {
          console.error(`social-sync-calendar: status check failed for ${entry.id} (${statusRes.status})`);
          continue;
        }

        const statusData = await statusRes.json();
        const uploadPostStatus: string = (statusData.status ?? "pending").toLowerCase();
        const newStatus = STATUS_MAP[uploadPostStatus] ?? null;

        console.log(`social-sync-calendar: entry=${entry.id} upload_status="${uploadPostStatus}" → newStatus="${newStatus ?? "sem alteração"}"`);

        if (newStatus && newStatus !== entry.status) {
          const updatePayload: Record<string, any> = { status: newStatus };
          // Se falhou, limpar o request_id para permitir reenvio
          if (newStatus === "draft") updatePayload.upload_post_request_id = null;

          const { error: updateError } = await supabaseAdmin
            .from("content_calendar")
            .update(updatePayload)
            .eq("id", entry.id)
            .eq("user_id", userId);

          if (!updateError) {
            results.push({ id: entry.id, old_status: entry.status, new_status: newStatus });
            updated++;
          }
        }
      } catch (entryErr) {
        console.error(`social-sync-calendar: error processing entry=${entry.id}`, entryErr);
      }
    }

    console.log(`social-sync-calendar: synced=${entries.length} updated=${updated}`);

    return new Response(
      JSON.stringify({ synced: entries.length, updated, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("social-sync-calendar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao sincronizar calendário" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
