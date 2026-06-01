import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  benefits: string[] | null;
  differentials: string | null;
  objective: string | null;
  audience_age_min: number | null;
  audience_age_max: number | null;
  audience_gender: string | null;
  audience_interests: string[] | null;
  audience_pains: string[] | null;
  audience_desires: string[] | null;
  logo_url: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  color_accent: string | null;
  visual_style: string | null;
  visual_style_custom: string | null;
  reference_image_url: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  source: string | null;
  source_url: string | null;
  generated_promise: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type BrandInsert = Omit<Brand, "id" | "user_id" | "created_at" | "updated_at">;

const db = supabase as any;

export const useBrands = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["brands", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["active-brand", user?.id] });
  };

  const brands = useQuery({
    queryKey: ["brands", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("brands")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Brand[];
    },
    enabled: !!user,
  });

  const activeBrand = useQuery({
    queryKey: ["active-brand", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("brands")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Brand | null;
    },
    enabled: !!user,
  });

  const createBrand = useMutation({
    mutationFn: async (data: BrandInsert) => {
      // Check brand limit from active subscription plan
      const { data: sub } = await db
        .from("subscriptions")
        .select("plan_id, plans(max_brands)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const maxBrands: number | null = sub?.plans?.max_brands ?? null;
      const freeLimit = 1;

      const { count } = await db
        .from("brands")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_deleted", false);

      const currentCount = count ?? 0;
      const effectiveLimit = sub ? maxBrands : freeLimit;

      if (effectiveLimit !== null && currentCount >= effectiveLimit) {
        const err = new Error("BRAND_LIMIT_REACHED") as Error & { code: string };
        err.code = "BRAND_LIMIT_REACHED";
        throw err;
      }

      const { data: result, error } = await db
        .from("brands")
        .insert({ ...data, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result as Brand;
    },
    onSuccess: invalidate,
  });

  const updateBrand = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Brand> }) => {
      const { data: result, error } = await db
        .from("brands")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as Brand;
    },
    onSuccess: invalidate,
  });

  const setActiveBrand = useMutation({
    mutationFn: async (id: string) => {
      await db.from("brands").update({ is_active: false }).eq("user_id", user!.id);
      const { data: result, error } = await db
        .from("brands")
        .update({ is_active: true })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as Brand;
    },
    onSuccess: invalidate,
  });

  const deleteBrand = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("brands").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { brands, activeBrand, createBrand, updateBrand, setActiveBrand, deleteBrand };
};
