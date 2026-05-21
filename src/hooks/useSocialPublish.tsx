import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useBrandContext } from "@/contexts/BrandContext";
import { usePlan } from "./usePlan";

export interface SocialProfile {
  id: string;
  user_id: string;
  brand_id: string;
  upload_post_username: string;
  connected_platforms: string[];
  is_connected: boolean;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishData {
  calendar_entry_id?: string;
  creative_id?: string;
  brand_id?: string;
  image_url: string;
  caption: string;
  platforms: string[];
  title: string;
  scheduled_for?: string | null;
}

export const useSocialPublish = () => {
  const { user } = useAuth();
  const { selectedBrand } = useBrandContext();
  const queryClient = useQueryClient();
  const { maxSocialProfiles } = usePlan();

  const { data: socialProfile = null, isLoading: profileLoading } = useQuery({
    queryKey: ["social-profile", user?.id, selectedBrand?.id],
    queryFn: async () => {
      if (!selectedBrand) return null;
      const { data } = await (supabase as any)
        .from("social_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .eq("brand_id", selectedBrand.id)
        .maybeSingle();
      return (data as SocialProfile | null);
    },
    enabled: !!user && !!selectedBrand,
  });

  const isConnected = socialProfile?.is_connected ?? false;

  const connectSocialAccounts = async (): Promise<{ connect_url: string }> => {
    // Check social profile limit before opening popup
    if (maxSocialProfiles > 0) {
      const { count } = await (supabase as any)
        .from("social_profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_connected", true);
      if ((count ?? 0) >= maxSocialProfiles) {
        const err = new Error("SOCIAL_LIMIT_REACHED") as Error & { code: string };
        err.code = "SOCIAL_LIMIT_REACHED";
        throw err;
      }
    }

    // Abrir aba em branco sincronamente (no gesto do usuário) para evitar bloqueio de popup
    const newTab = window.open("", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("social-connect", {
        body: { brand_id: selectedBrand?.id },
      });
      if (error) throw new Error(error.message ?? "Falha ao gerar link de conexão");
      if (!data?.connect_url) throw new Error("URL de conexão não retornada");
      if (newTab) {
        newTab.location.href = data.connect_url;
      } else {
        window.open(data.connect_url, "_blank");
      }
      return data;
    } catch (err) {
      newTab?.close();
      throw err;
    }
  };

  const publishCreative = async (payload: PublishData) => {
    const { data, error } = await supabase.functions.invoke("social-publish", {
      body: payload,
    });
    if (error) throw new Error(error.message ?? "Falha ao publicar");
    if (data?.error) throw new Error(data.error);
    queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
    return data as { calendar_entry_id: string; request_id: string; status: string };
  };

  const checkPostStatus = async (calendarEntryId: string) => {
    const { data, error } = await supabase.functions.invoke("social-status", {
      body: { calendar_entry_id: calendarEntryId },
    });
    if (error) throw new Error(error.message ?? "Falha ao verificar status");
    queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
    return data as { calendar_entry_id: string; status: string; upload_post_status: string };
  };

  // Abre a interface de gerenciamento sem verificar limite de perfis.
  // Usada quando o usuário já tem um perfil conectado e quer gerenciar/desconectar.
  const manageConnections = async (): Promise<void> => {
    if (!selectedBrand?.id) return;
    const newTab = window.open("", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("social-connect", {
        body: { brand_id: selectedBrand.id },
      });
      if (error || !data?.connect_url) throw new Error(error?.message ?? "URL de conexão não retornada");
      if (newTab) {
        newTab.location.href = data.connect_url;
      } else {
        window.open(data.connect_url, "_blank");
      }
    } catch (err) {
      newTab?.close();
      throw err;
    }
  };

  const syncStatus = async (): Promise<{ is_connected: boolean; connected_platforms: string[] }> => {
    const { data, error } = await supabase.functions.invoke("social-sync-status", {
      body: { brand_id: selectedBrand?.id },
    });
    if (error) throw new Error(error.message ?? "Falha ao sincronizar status");
    queryClient.invalidateQueries({ queryKey: ["social-profile", user?.id, selectedBrand?.id] });
    return data;
  };

  return {
    socialProfile,
    isConnected,
    profileLoading,
    connectSocialAccounts,
    manageConnections,
    publishCreative,
    checkPostStatus,
    syncStatus,
  };
};
