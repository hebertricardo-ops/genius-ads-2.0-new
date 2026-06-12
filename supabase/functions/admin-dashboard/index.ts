import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "hebertricardo@gmail.com";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getInterval(period: string): string {
  const map: Record<string, string> = {
    "24h": "24 hours",
    "7d":  "7 days",
    "30d": "30 days",
    "all": "100 years",
  };
  return map[period] ?? "30 days";
}

function parsePeriodToMs(period: string): number {
  const map: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d":  7  * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "all": 365 * 24 * 60 * 60 * 1000,
  };
  return map[period] ?? map["30d"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth + admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) return json({ error: "Não autenticado" }, 401);
    if (user.email !== ADMIN_EMAIL) return json({ error: "Acesso não autorizado" }, 403);

    const body_raw = await req.json();
    const { section, period } = body_raw;
    const extra = (body_raw.extra ?? {}) as Record<string, unknown>;
    const interval = getInterval(period);

    // OVERVIEW
    if (section === "overview") {
      const { data, error } = await supabaseAdmin.rpc("admin_overview", { p_interval: interval });
      if (error) throw error;
      return json({ overview: data });
    }

    // USERS
    if (section === "users") {
      // profiles e subscriptions não têm FK direta — query separada
      const [profilesRes, creditsRes, subsRes, authData] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("user_id, name, email, whatsapp, created_at, is_admin")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("user_credits")
          .select("user_id, credits_balance, subscription_credits, extra_credits"),
        supabaseAdmin
          .from("subscriptions")
          .select("user_id, status, plan_id, plans ( name, slug )"),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const authMap = new Map(
        (authData.data?.users ?? []).map((u) => [u.id, {
          email_confirmed_at: u.email_confirmed_at,
          last_sign_in_at:    u.last_sign_in_at,
        }])
      );
      const creditsMap = new Map(
        (creditsRes.data ?? []).map((c) => [c.user_id, c])
      );
      const subsMap = new Map(
        (subsRes.data ?? []).map((s) => [s.user_id, s])
      );

      const users = (profilesRes.data ?? []).map((p) => {
        const auth = authMap.get(p.user_id) ?? {};
        const uc   = creditsMap.get(p.user_id) ?? {};
        const sub  = subsMap.get(p.user_id);
        const activeSub = sub?.status === "active" ? sub : null;
        const subscriptionTotal = (uc.subscription_credits ?? 0) + (uc.extra_credits ?? 0);
        const total = subscriptionTotal > 0
          ? subscriptionTotal
          : (uc.credits_balance ?? 0);
        const avail = uc.credits_balance ?? 0;

        return {
          user_id:           p.user_id,
          name:              p.name,
          email:             p.email,
          whatsapp:          p.whatsapp,
          is_admin:          p.is_admin ?? false,
          plan_name:         activeSub?.plans?.name ?? "Free",
          plan_slug:         activeSub?.plans?.slug ?? "free",
          total_credits:     total,
          used_credits:      Math.max(0, total - avail),
          available_credits: avail,
          status:            auth.email_confirmed_at ? "ativo" : "pendente",
          member_since:      p.created_at,
          last_sign_in:      auth.last_sign_in_at ?? null,
        };
      });

      return json({ users });
    }

    // COSTS
    if (section === "costs") {
      const [summaryRes, byDayRes, byUserRes] = await Promise.all([
        supabaseAdmin
          .from("api_cost_log")
          .select("api_provider, model, operation, cost_usd, total_tokens, images_count")
          .gte("created_at", new Date(Date.now() - parsePeriodToMs(period)).toISOString()),
        supabaseAdmin.rpc("admin_costs_by_day",  { p_interval: interval }),
        supabaseAdmin.rpc("admin_costs_by_user", { p_interval: interval }),
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (byDayRes.error)   throw byDayRes.error;
      if (byUserRes.error)  throw byUserRes.error;

      // Agrega por provider/model/operation
      const aggregate: Record<string, any> = {};
      for (const row of (summaryRes.data ?? [])) {
        const key = `${row.api_provider}|${row.model}|${row.operation}`;
        if (!aggregate[key]) {
          aggregate[key] = {
            api_provider:  row.api_provider,
            model:         row.model,
            operation:     row.operation,
            calls:         0,
            cost_usd:      0,
            total_tokens:  0,
            images_count:  0,
          };
        }
        aggregate[key].calls        += 1;
        aggregate[key].cost_usd     += Number(row.cost_usd);
        aggregate[key].total_tokens += Number(row.total_tokens ?? 0);
        aggregate[key].images_count += Number(row.images_count ?? 0);
      }

      return json({
        summary: Object.values(aggregate),
        byDay:   byDayRes.data ?? [],
        byUser:  byUserRes.data ?? [],
      });
    }

    // GENERATIONS
    if (section === "generations") {
      const [byUserRes, byDayRes] = await Promise.all([
        supabaseAdmin.rpc("admin_generations_by_user"),
        supabaseAdmin.rpc("admin_generations_by_day", { p_interval: interval }),
      ]);

      if (byUserRes.error) throw byUserRes.error;
      if (byDayRes.error)  throw byDayRes.error;

      return json({
        byUser: byUserRes.data ?? [],
        byDay:  byDayRes.data ?? [],
      });
    }

    // BRANDS
    if (section === "brands") {
      // Passo 1 — buscar todas as marcas
      const { data: brands } = await supabaseAdmin
        .from("brands")
        .select("id, name, source, is_active, created_at, user_id")
        .order("created_at", { ascending: false });

      if (!brands?.length) {
        return json({ brands: [], by_user: [], total: 0 });
      }

      // Passo 2 — buscar profiles dos user_ids únicos
      const userIds = [...new Set(brands.map((b) => b.user_id))];

      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      const enriched = brands.map((b) => ({
        ...b,
        user_name: profileMap.get(b.user_id)?.name  ?? "—",
        email:     profileMap.get(b.user_id)?.email ?? "—",
      }));

      const byUserMap = enriched.reduce((acc: any, brand: any) => {
        const uid = brand.user_id;
        if (!acc[uid]) {
          acc[uid] = {
            user_id:   uid,
            user_name: brand.user_name,
            email:     brand.email,
            brands:    [],
            total:     0,
          };
        }
        acc[uid].brands.push({
          id:         brand.id,
          name:       brand.name,
          source:     brand.source,
          is_active:  brand.is_active,
          created_at: brand.created_at,
        });
        acc[uid].total++;
        return acc;
      }, {});

      return json({
        brands:  enriched,
        by_user: Object.values(byUserMap),
        total:   enriched.length,
      });
    }

    // CREATIVES
    if (section === "creatives") {
      const page: number     = Number(extra.page ?? 1);
      const perPage          = 30;
      const offset           = (page - 1) * perPage;
      const onlyFeatured     = extra.only_featured === true;
      const filterUserId     = (extra.user_id as string | null) ?? null;

      let query = supabaseAdmin
        .from("generated_creatives")
        .select(
          "id, image_url, credits_used, is_featured, " +
          "featured_at, featured_note, created_at, user_id, " +
          "brand_id, copy_data",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + perPage - 1);

      if (onlyFeatured) query = query.eq("is_featured", true);
      if (filterUserId) query = query.eq("user_id", filterUserId);
      if (period !== "all") {
        query = query.gte(
          "created_at",
          new Date(Date.now() - parsePeriodToMs(period)).toISOString()
        );
      }

      const { data: creatives, count } = await query;

      if (!creatives?.length) {
        return json({ creatives: [], total: 0, page, total_pages: 0 });
      }

      // PASSO 2 — buscar profiles dos user_ids únicos
      const userIds = [...new Set(creatives.map((c) => c.user_id))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      // PASSO 3 — enriquecer criativos com dados do perfil
      const enriched = creatives.map((c) => ({
        ...c,
        user_name:  profileMap.get(c.user_id)?.name  ?? "—",
        user_email: profileMap.get(c.user_id)?.email ?? "—",
      }));

      return json({
        creatives:   enriched,
        total:       count ?? 0,
        page,
        total_pages: Math.ceil((count ?? 0) / perPage),
      });
    }

    // TOGGLE_FEATURED
    if (section === "toggle_featured") {
      const { creative_id, is_featured: feat, featured_note: note } = extra as any;
      if (!creative_id) return json({ error: "creative_id obrigatório" }, 400);

      const { error } = await supabaseAdmin
        .from("generated_creatives")
        .update({
          is_featured:   feat,
          featured_at:   feat ? new Date().toISOString() : null,
          featured_note: note ?? null,
        })
        .eq("id", creative_id);

      if (error) throw error;
      return json({ ok: true });
    }

    // FAL_USAGE
    if (section === "fal_usage") {
      const startDate = new Date(Date.now() - parsePeriodToMs(period)).toISOString();
      const falRes = await fetch(
        `https://api.fal.ai/v1/models/usage?endpoint_id=openai/gpt-image-2&start=${startDate}&expand=summary,time_series&timeframe=day`,
        { headers: { Authorization: `Key ${Deno.env.get("FAL_KEY")}` } }
      );
      const falData = await falRes.json();
      return json({ fal_official: falData });
    }

    return json({ error: `Seção inválida: ${section}` }, 400);
  } catch (e) {
    console.error("[admin-dashboard] error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
