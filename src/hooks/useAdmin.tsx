import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AdminSection =
  | "overview"
  | "users"
  | "costs"
  | "generations"
  | "brands"
  | "fal_usage"
  | "creatives"
  | "toggle_featured"
  | "campaigns"
  | "campaign_logs";

export type AdminPeriod = "24h" | "7d" | "30d" | "all";

export const useAdmin = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === "hebertricardo@gmail.com";

  const fetchSection = async (
    section: AdminSection,
    period: AdminPeriod = "30d",
    extra?: Record<string, unknown>
  ) => {
    const { data, error } = await supabase.functions.invoke(
      "admin-dashboard",
      { body: { section, period, extra } }
    );
    if (error) throw error;
    return data;
  };

  return { isAdmin, fetchSection };
};
