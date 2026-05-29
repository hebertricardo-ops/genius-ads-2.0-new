import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const UPLOAD_POST_BASE = "https://api.upload-post.com/api";

// ── Função compartilhada: busca toda a mídia + métricas por post ─────────────
async function fetchAllPostsWithMetrics(
  targetPlatforms: string[],
  username: string,
  upHeaders: Record<string, string>,
  supabaseAdmin: any,
  userId: string,
  brand_id?: string,
) {
  const [mediaResults, calendarResult] = await Promise.all([
    Promise.all(
      targetPlatforms.map(async (p) => {
        try {
          const mediaRes = await fetch(
            `${UPLOAD_POST_BASE}/uploadposts/media?platform=${encodeURIComponent(p)}&user=${encodeURIComponent(username)}`,
            { headers: upHeaders },
          );
          if (!mediaRes.ok) {
            console.warn(`get-analytics: media ${p} ${mediaRes.status}`);
            return [] as any[];
          }
          const data = await mediaRes.json();
          return (data.media ?? []).map((item: any) => ({ ...item, platform: p }));
        } catch (e) {
          console.warn(`get-analytics: media fetch error for ${p}:`, e);
          return [] as any[];
        }
      }),
    ),
    // content_calendar para image_url estável (URLs do Instagram expiram)
    (async () => {
      let q = supabaseAdmin
        .from("content_calendar")
        .select("upload_post_request_id, title, image_url")
        .eq("user_id", userId)
        .not("upload_post_request_id", "is", null);
      if (brand_id) q = q.eq("brand_id", brand_id);
      const { data } = await q;
      return data ?? [];
    })(),
  ]);

  const allMedia: any[] = mediaResults.flat();

  const postsWithMetrics = await Promise.all(
    allMedia.map(async (item: any) => {
      const isVideo = item.media_type === "VIDEO" || item.media_type === "REEL";
      const imageUrl = isVideo
        ? (item.thumbnail_url ?? item.media_url ?? null)
        : (item.media_url ?? item.thumbnail_url ?? null);
      const dateStr = item.timestamp ? (item.timestamp as string).split("T")[0] : null;

      const basePost = {
        id: `${item.platform}_${item.id}`,
        platform_post_id: item.id as string,
        media_type: (item.media_type as string | null) ?? null,
        title: null as string | null,
        image_url: imageUrl as string | null,
        scheduled_date: dateStr,
        platform: item.platform as string,
        caption: (item.caption as string | null) ?? null,
        upload_post_request_id: null as string | null,
        post_url: (item.permalink as string | null) ?? null,
        metrics: null as any,
        engagement_score: 0,
      };

      try {
        const aUrl = new URL(`${UPLOAD_POST_BASE}/uploadposts/post-analytics`);
        aUrl.searchParams.set("platform_post_id", item.id);
        aUrl.searchParams.set("platform", item.platform);
        aUrl.searchParams.set("user", username);

        const aRes = await fetch(aUrl.toString(), { headers: upHeaders });
        if (!aRes.ok) return basePost;

        const aData = await aRes.json();
        const platData = aData?.platforms?.[item.platform];
        if (!platData?.success) return basePost;

        const m = platData.post_metrics ?? {};
        const pLikes = Number(m.likes) || 0;
        const pComments = Number(m.comments) || 0;
        const pViews = Number(m.views) || 0;
        const pReach = Number(m.reach) || 0;
        const pImpressions = Number(m.impressions) || 0;
        const pShares = Number(m.shares) || 0;
        const pSaves = Number(m.saves) || 0;
        const engagement_score = pLikes + pComments + pShares + pSaves + pViews;

        return {
          ...basePost,
          post_url: platData.post_url ?? item.permalink ?? null,
          metrics: { likes: pLikes, comments: pComments, views: pViews, reach: pReach, impressions: pImpressions, shares: pShares, saves: pSaves },
          engagement_score,
        };
      } catch {
        return basePost;
      }
    }),
  );

  postsWithMetrics.sort((a, b) => (b.engagement_score ?? 0) - (a.engagement_score ?? 0));
  return postsWithMetrics;
}

// ── Servidor ─────────────────────────────────────────────────────────────────
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

    const {
      brand_id,
      period = "last_month",
      platform = "all",
      posts_only = false,
    }: { brand_id?: string; period?: string; platform?: string; posts_only?: boolean } = await req.json();

    // 1. Buscar social profile
    let profileQuery = supabaseAdmin
      .from("social_profiles")
      .select("upload_post_username, connected_platforms, is_connected")
      .eq("user_id", user.id);
    if (brand_id) profileQuery = profileQuery.eq("brand_id", brand_id);

    const { data: socialProfile } = await profileQuery.maybeSingle();

    if (!socialProfile?.is_connected || !socialProfile.upload_post_username) {
      return new Response(
        JSON.stringify({ error: "NOT_CONNECTED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const username = socialProfile.upload_post_username;
    const connectedPlatforms: string[] = socialProfile.connected_platforms ?? [];

    const targetPlatforms = platform === "all"
      ? connectedPlatforms
      : connectedPlatforms.filter((p) => p === platform);

    if (targetPlatforms.length === 0) {
      return new Response(
        JSON.stringify({ error: "NOT_CONNECTED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upHeaders = {
      Authorization: `Apikey ${UPLOAD_POST_API_KEY}`,
      "Content-Type": "application/json",
    };

    // ── Modo posts_only: pula analytics de perfil, só busca mídia ────
    if (posts_only) {
      const posts = await fetchAllPostsWithMetrics(
        connectedPlatforms, // sempre todas as plataformas para top posts
        username,
        upHeaders,
        supabaseAdmin,
        user.id,
        brand_id,
      );
      return new Response(
        JSON.stringify({ posts, connected_platforms: connectedPlatforms }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Buscar page_id do Facebook
    let pageId: string | null = null;
    try {
      const profileRes = await fetch(
        `${UPLOAD_POST_BASE}/uploadposts/users/${encodeURIComponent(username)}`,
        { headers: upHeaders },
      );
      if (profileRes.ok) {
        const body = await profileRes.json();
        const upProfile = body?.profile ?? body;
        const fb = upProfile?.social_accounts?.facebook ?? upProfile?.social_accounts?.Facebook ?? {};
        pageId = fb?.page_id ?? fb?.pageId ?? fb?.id ?? null;
      }
    } catch (e) {
      console.warn("get-analytics: profile fetch failed:", e);
    }

    // ── Montar URLs ───────────────────────────────────────────────────
    const platformsParam = targetPlatforms.join(",");
    const platformFilter = platform !== "all" ? platform : undefined;

    const applyPeriod = (url: URL) => {
      if (period === "all_time") {
        url.searchParams.set("start_date", "2020-01-01");
        url.searchParams.set("end_date", new Date().toISOString().split("T")[0]);
      } else {
        url.searchParams.set("period", period);
      }
    };

    const analyticsUrl = new URL(`${UPLOAD_POST_BASE}/analytics/${encodeURIComponent(username)}`);
    analyticsUrl.searchParams.set("platforms", platformsParam);
    if (pageId && targetPlatforms.includes("facebook")) {
      analyticsUrl.searchParams.set("page_id", pageId);
    }

    const impressionsUrl = new URL(
      `${UPLOAD_POST_BASE}/uploadposts/total-impressions/${encodeURIComponent(username)}`,
    );
    applyPeriod(impressionsUrl);
    impressionsUrl.searchParams.set("breakdown", "true");
    if (platformFilter) impressionsUrl.searchParams.set("platform", platformFilter);

    const reachUrl = new URL(
      `${UPLOAD_POST_BASE}/uploadposts/total-impressions/${encodeURIComponent(username)}`,
    );
    applyPeriod(reachUrl);
    reachUrl.searchParams.set("metrics", "reach");
    reachUrl.searchParams.set("breakdown", "true");
    if (platformFilter) reachUrl.searchParams.set("platform", platformFilter);

    const engagementUrl = new URL(
      `${UPLOAD_POST_BASE}/uploadposts/total-impressions/${encodeURIComponent(username)}`,
    );
    applyPeriod(engagementUrl);
    engagementUrl.searchParams.set("metrics", "likes,comments,shares,saves");
    if (platformFilter) engagementUrl.searchParams.set("platform", platformFilter);

    const [analyticsRes, impressionsRes, reachRes, engagementRes] = await Promise.all([
      fetch(analyticsUrl.toString(), { headers: upHeaders }),
      fetch(impressionsUrl.toString(), { headers: upHeaders }),
      fetch(reachUrl.toString(), { headers: upHeaders }),
      fetch(engagementUrl.toString(), { headers: upHeaders }),
    ]);

    let analyticsData: Record<string, any> = {};
    let impressionsData: any = {};
    let reachData: any = {};
    let engagementData: any = {};

    if (analyticsRes.ok) analyticsData = await analyticsRes.json();
    else console.error(`analytics ${analyticsRes.status}:`, await analyticsRes.text());

    if (impressionsRes.ok) impressionsData = await impressionsRes.json();
    if (reachRes.ok) reachData = await reachRes.json();
    if (engagementRes.ok) engagementData = await engagementRes.json();

    // ── Métricas de resumo ────────────────────────────────────────────
    let followers = 0;
    let reach = 0;
    let impressions = 0;
    for (const p of targetPlatforms) {
      followers   += Number(analyticsData[p]?.followers)   || 0;
      reach       += Number(analyticsData[p]?.reach)       || 0;
      impressions += Number(analyticsData[p]?.impressions) || 0;
    }

    // Fallback: total-impressions endpoint quando analytics não retorna valores
    if (reach === 0)       reach       = Number(reachData?.metrics?.reach)         || 0;
    if (impressions === 0) impressions = Number(impressionsData?.total_impressions) || reach;

    const eng = engagementData?.metrics ?? {};
    const likes = Number(eng.likes) || 0;
    const comments = Number(eng.comments) || 0;
    const shares = Number(eng.shares) || 0;
    const saves = Number(eng.saves) || 0;
    const engagementRate = followers > 0
      ? ((likes + comments + shares + saves) / followers) * 100
      : 0;

    // ── Timeseries ────────────────────────────────────────────────────
    const reachByDate: Record<string, number> = {};
    const reachPerDay = reachData?.per_day?.reach ?? reachData?.per_day ?? {};
    for (const [date, val] of Object.entries(reachPerDay)) {
      reachByDate[date] = Number(val) || 0;
    }

    const impressionsByDate: Record<string, number> = {};
    const impressionsPerDay = impressionsData?.per_day ?? {};
    for (const [date, val] of Object.entries(impressionsPerDay)) {
      if (typeof val === "number") impressionsByDate[date] = val;
    }

    const allDates = new Set([...Object.keys(reachByDate), ...Object.keys(impressionsByDate)]);
    const timeseries = Array.from(allDates)
      .sort()
      .map((date) => ({
        date,
        reach: reachByDate[date] ?? 0,
        impressions: impressionsByDate[date] ?? 0,
      }));

    return new Response(
      JSON.stringify({
        summary: { followers, reach, impressions, engagement_rate: engagementRate },
        timeseries,
        engagement_details: { likes, comments, shares, saves },
        connected_platforms: connectedPlatforms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("get-analytics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao buscar analytics" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
