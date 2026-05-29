import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBrandContext } from "@/contexts/BrandContext";
import { useAuth } from "./useAuth";

export type AnalyticsPeriod = "last_week" | "last_month" | "last_3months" | "all_time";
export type AnalyticsPlatform = "all" | "instagram" | "facebook";

export interface AnalyticsSummary {
  followers: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
}

export interface TimeseriesPoint {
  date: string;
  reach: number;
  impressions: number;
}

export interface EngagementDetails {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  views: number;
  reach: number;
  impressions: number;
  shares: number;
  saves: number;
}

export interface AnalyticsPost {
  id: string;
  platform_post_id?: string;
  media_type?: string | null;
  title: string | null;
  image_url: string | null;
  scheduled_date: string | null;
  platform: string | null;
  caption: string | null;
  upload_post_request_id: string | null;
  post_url: string | null;
  metrics: PostMetrics | null;
  engagement_score: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  timeseries: TimeseriesPoint[];
  engagement_details: EngagementDetails;
  connected_platforms: string[];
}

export interface PostSummary {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  postCount: number;
}

const PERIOD_DAYS: Record<AnalyticsPeriod, number | null> = {
  last_week:    7,
  last_month:   30,
  last_3months: 90,
  all_time:     null,
};

export const useAnalytics = () => {
  const { user } = useAuth();
  const { selectedBrand } = useBrandContext();
  const [period, setPeriod] = useState<AnalyticsPeriod>("last_month");
  const [platform, setPlatform] = useState<AnalyticsPlatform>("all");

  // Query principal: apenas seguidores + plataformas conectadas
  const { data, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ["analytics", user?.id, selectedBrand?.id, period, platform],
    queryFn: async () => {
      const { data: res, error: fnError } = await supabase.functions.invoke("get-analytics", {
        body: { brand_id: selectedBrand?.id, period, platform },
      });
      if (fnError) throw new Error(fnError.message ?? "Erro ao buscar analytics");
      if (res?.error) throw new Error(res.error);
      return res as AnalyticsData;
    },
    enabled: !!user && !!selectedBrand,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Query independente: todos os posts com métricas
  const { data: topPostsData, isLoading: topPostsLoading } = useQuery<{ posts: AnalyticsPost[] }>({
    queryKey: ["analytics-top-posts", user?.id, selectedBrand?.id],
    queryFn: async () => {
      const { data: res, error: fnError } = await supabase.functions.invoke("get-analytics", {
        body: { brand_id: selectedBrand?.id, posts_only: true },
      });
      if (fnError) throw new Error(fnError.message ?? "Erro ao buscar posts");
      if (res?.error) throw new Error(res.error);
      return res as { posts: AnalyticsPost[] };
    },
    enabled: !!user && !!selectedBrand,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const allPosts = topPostsData?.posts ?? [];

  // Filtra posts pelo período selecionado via scheduled_date
  const periodPosts = useMemo(() => {
    const days = PERIOD_DAYS[period];
    if (days === null) return allPosts;
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
    return allPosts.filter((p) => !p.scheduled_date || p.scheduled_date >= cutoff);
  }, [allPosts, period]);

  // Agrega métricas dos posts do período
  const postSummary = useMemo<PostSummary>(() => ({
    reach:       periodPosts.reduce((s, p) => s + (p.metrics?.reach ?? 0), 0),
    impressions: periodPosts.reduce((s, p) => s + (p.metrics?.impressions ?? p.metrics?.views ?? 0), 0),
    likes:       periodPosts.reduce((s, p) => s + (p.metrics?.likes ?? 0), 0),
    comments:    periodPosts.reduce((s, p) => s + (p.metrics?.comments ?? 0), 0),
    shares:      periodPosts.reduce((s, p) => s + (p.metrics?.shares ?? 0), 0),
    saves:       periodPosts.reduce((s, p) => s + (p.metrics?.saves ?? 0), 0),
    postCount:   periodPosts.filter((p) => p.metrics !== null).length,
  }), [periodPosts]);

  // Timeseries por data de publicação dos posts do período
  const postTimeseries = useMemo<TimeseriesPoint[]>(() => {
    const byDate: Record<string, { reach: number; impressions: number }> = {};
    for (const p of periodPosts) {
      if (!p.scheduled_date || !p.metrics) continue;
      const d = p.scheduled_date;
      if (!byDate[d]) byDate[d] = { reach: 0, impressions: 0 };
      byDate[d].reach       += p.metrics.reach ?? 0;
      byDate[d].impressions += p.metrics.impressions ?? p.metrics.views ?? 0;
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [periodPosts]);

  return {
    data,
    isLoading,
    error,
    period,
    setPeriod,
    platform,
    setPlatform,
    refetch,
    topPosts: allPosts,
    topPostsLoading,
    postSummary,
    postTimeseries,
  };
};
