import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PlanFeatures {
  planName: string;
  planSlug: string;
  hasSubscription: boolean;
  isActive: boolean;
  hasCalendar: boolean;
  hasSocialMedia: boolean;
  maxBrands: number | null;
  maxSocialProfiles: number;
  monthlyCredits: number;
  isLoading: boolean;
}

const FREE_PLAN: Omit<PlanFeatures, "isLoading"> = {
  planName: "Gratuito",
  planSlug: "free",
  hasSubscription: false,
  isActive: false,
  hasCalendar: false,
  hasSocialMedia: false,
  maxBrands: 1,
  maxSocialProfiles: 0,
  monthlyCredits: 0,
};

export const usePlan = (): PlanFeatures => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["plan-features", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: sub } = await (supabase as any)
        .from("subscriptions")
        .select(`
          status,
          plans (
            name,
            slug,
            monthly_credits,
            max_brands,
            has_calendar,
            has_social_media,
            max_social_profiles
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      return sub ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return { ...FREE_PLAN, isLoading: true };
  if (!data || !data.plans) return { ...FREE_PLAN, isLoading: false };

  const plan = data.plans as any;
  return {
    planName: plan.name,
    planSlug: plan.slug,
    hasSubscription: true,
    isActive: data.status === "active",
    hasCalendar: plan.has_calendar ?? false,
    hasSocialMedia: plan.has_social_media ?? false,
    maxBrands: plan.max_brands ?? null,
    maxSocialProfiles: plan.max_social_profiles ?? 0,
    monthlyCredits: plan.monthly_credits ?? 0,
    isLoading: false,
  };
};
