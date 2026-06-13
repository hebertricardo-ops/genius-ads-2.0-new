import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, ArrowRight, Lightbulb, ImageIcon, Building2, CalendarDays, Plus, Clock, LayoutGrid } from "lucide-react";
import OnboardingDashboardDialog from "@/components/OnboardingDashboardDialog";
import logoIcon from "@/assets/logo-icon.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useBrandContext } from "@/contexts/BrandContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { selectedBrand, brands, isLoading: brandLoading } = useBrandContext();
  const hasBrand = !!selectedBrand;

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (location.state?.showOnboarding) {
      setTimeout(() => setShowOnboarding(true), 800);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (!brandLoading && brands.length === 0) {
      setShowWelcome(true);
    }
  }, [brandLoading, brands]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split("@")[0] || "usuário";
  const firstName = displayName.split(" ")[0];
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const avatarUrl = profile?.avatar_url ?? null;

  const { data: recentCreatives = [] } = useQuery({
    queryKey: ["recent-creatives", user?.id, selectedBrand?.id],
    queryFn: async () => {
      let q = supabase
        .from("generated_creatives")
        .select("id, image_url, source, copy_data, credits_used, created_at, request_id, carousel_request_id, brand_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (selectedBrand) q = q.eq("brand_id", selectedBrand.id);
      const { data, error } = await q;
      if (error) throw error;

      const seenCarousels = new Set<string>();
      const deduped: any[] = [];
      const MAX_ITEMS = 6;

      for (const item of data ?? []) {
        if (deduped.length >= MAX_ITEMS) break;
        if (!item.image_url) continue;
        if (item.carousel_request_id) {
          if (seenCarousels.has(item.carousel_request_id)) continue;
          seenCarousels.add(item.carousel_request_id);
        }
        deduped.push(item);
      }
      return deduped;
    },
    enabled: !!user && !!selectedBrand,
  });

  const { data: totalCreatives = 0 } = useQuery({
    queryKey: ["total-creatives", user?.id, selectedBrand?.id],
    queryFn: async () => {
      let q = supabase
        .from("generated_creatives")
        .select("*", { count: "exact", head: true });
      if (selectedBrand) q = q.eq("brand_id", selectedBrand.id);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && !!selectedBrand,
  });

  const { data: pautasCount = 0 } = useQuery({
    queryKey: ["pautas-count", user?.id, selectedBrand?.id],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString().split("T")[0];
      let q = (supabase as any)
        .from("content_calendar")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("scheduled_date", since);
      if (selectedBrand?.id) q = q.eq("brand_id", selectedBrand.id);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: agendadosCount = 0 } = useQuery({
    queryKey: ["agendados-count", user?.id, selectedBrand?.id],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString().split("T")[0];
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 }).toISOString().split("T")[0];
      let q = (supabase as any)
        .from("content_calendar")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "scheduled")
        .gte("scheduled_date", weekStart)
        .lte("scheduled_date", weekEnd);
      if (selectedBrand?.id) q = q.eq("brand_id", selectedBrand.id);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscriptions")
        .select("*, plans(name)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const planName: string = subscription?.plans?.name ?? "Gratuito";
  const creditsBalance = credits?.credits_balance ?? 0;

  const stats = [
    {
      label: "CRIATIVOS",
      value: totalCreatives,
      sub: "na biblioteca",
      icon: ImageIcon,
      iconColor: "text-blue-400",
    },
    {
      label: "POSTADOS",
      value: pautasCount,
      sub: "últimos 30 dias",
      icon: LayoutGrid,
      iconColor: "text-purple-400",
    },
    {
      label: "AGENDADOS",
      value: agendadosCount,
      sub: "para esta semana",
      icon: Clock,
      iconColor: "text-amber-400",
    },
    {
      label: "CRÉDITOS IA",
      value: creditsBalance,
      sub: planName,
      icon: Sparkles,
      iconColor: "text-primary",
      showBar: true,
    },
  ];

  const handleCreativeClick = (item: any) => {
    if (item.carousel_request_id) {
      navigate(`/carousel-results/${item.carousel_request_id}`);
      return;
    }
    if (item.request_id) {
      navigate(`/results/${item.request_id}`);
      return;
    }
    // edit_ia ou criativo sem request_id → abrir biblioteca
    navigate("/history");
  };

  return (
    <div>
      <Dialog open={showWelcome} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-sm mx-4 [&>button]:hidden"
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <div className="flex flex-col items-center text-center space-y-5 py-2">
            <img src={logoIcon} alt="Genius ADS" className="w-20 h-20 object-contain" />
            <div className="space-y-2">
              <h2 className="text-xl font-display font-normal text-foreground">
                Bem-vindo ao Genius ADS! 🎉
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Primeiro, vamos criar o perfil da sua marca, produto ou serviço.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                É bem rápido e você só precisa fazer uma vez.
              </p>
            </div>
            <Button
              className="w-full gradient-primary min-h-[48px] text-base"
              onClick={() => { setShowWelcome(false); navigate("/brands/new"); }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar minha marca
            </Button>
            <p className="text-xs text-muted-foreground">
              Leva menos de 2 minutos ⚡
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <OnboardingDashboardDialog
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/profile")} className="cursor-pointer shrink-0">
              <Avatar className="w-11 h-11 border-2 border-border hover:border-primary transition-colors">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-primary/20 text-primary font-display">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display text-foreground">Dashboard</h1>
                {hasBrand && (
                  <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 font-display font-normal gap-1 text-xs hidden sm:flex">
                    <Building2 className="w-3 h-3" />
                    {selectedBrand!.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Olá, {firstName} 👋 Pronto para criar posts e anúncios que convertem?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/calendario")} className="gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Agendamento
            </Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/create-select")} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Criar Post
            </Button>
          </div>
        </div>

        {/* Banner: sem marca selecionada */}
        {!hasBrand && !brandLoading && (
          <div className="mb-6 rounded-2xl border border-primary/40 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-foreground">Configure sua marca</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Defina a identidade da sua marca para que a IA gere criativos alinhados ao seu negócio.
                </p>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate("/brands/new")} className="shrink-0">
              Configurar Minha Marca
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-in">
          {stats.map(({ label, value, sub, icon: Icon, iconColor, showBar }) => (
            <div key={label} className="gradient-card rounded-2xl border border-border shadow-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {label}
                </span>
                <Icon className={cn("w-4 h-4", iconColor)} />
              </div>
              <span className="text-3xl font-display text-foreground">{value}</span>
              {showBar && (
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (Number(value) / 10) * 100)}%` }}
                  />
                </div>
              )}
              <span className="text-xs text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>

        {/* ── Dica Pro ── */}
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-display text-primary mb-0.5">Dica Pro</p>
            <p className="text-sm text-muted-foreground">
              Seja específico nas dores do seu cliente. A IA gera melhores ângulos quando entende o problema real.
            </p>
          </div>
        </div>

        {/* ── Últimas Criações ── */}
        <div className="bg-secondary/60 rounded-2xl overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display text-foreground">Últimas Criações</h2>
              <p className="text-sm text-muted-foreground">Seus últimos criativos gerados</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="text-xs gap-1.5 border-0">
              Ver Biblioteca
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {recentCreatives.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              Nenhum criativo gerado ainda. Comece criando seu primeiro!
            </div>
          ) : (
            <>
              {/* Desktop: grid */}
              <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
                {recentCreatives.map((item: any) => {
                  const isEdit     = item.source === "edit_ia" || (item.copy_data as any)?.is_edit;
                  const isCarousel = !!item.carousel_request_id;
                  const isIdeia    = (item.copy_data as any)?.method === "ideia";
                  const displayName = isEdit
                    ? ((item.copy_data as any)?.edit_label ?? "Edição IA")
                    : ((item.copy_data as any)?.headline ?? (item.copy_data as any)?.name ?? "Criativo");
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCreativeClick(item)}
                      className="group relative rounded-xl overflow-hidden cursor-pointer border border-border shadow-card hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                      <img src={item.image_url} alt={displayName} className="w-full aspect-square object-cover" loading="lazy" />
                      {isEdit && (
                        <span className="absolute top-2 left-2 text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">✨ Edição IA</span>
                      )}
                      {isCarousel && !isEdit && (
                        <span className="absolute top-2 left-2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">🎴 Carrossel</span>
                      )}
                      {isIdeia && !isEdit && !isCarousel && (
                        <span className="absolute top-2 left-2 text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-medium">💡 Ideia</span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-white text-xs font-medium truncate">{displayName}</p>
                        <p className="text-white/70 text-[10px] mt-0.5">{format(new Date(item.created_at), "dd/MM/yy")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile: carrossel */}
              <div className="sm:hidden p-4">
                <Carousel opts={{ align: "start", loop: true }} className="w-full">
                  <CarouselContent className="-ml-3">
                    {recentCreatives.map((item: any) => {
                      const isEdit     = item.source === "edit_ia" || (item.copy_data as any)?.is_edit;
                      const isCarousel = !!item.carousel_request_id;
                      const isIdeia    = (item.copy_data as any)?.method === "ideia";
                      const displayName = isEdit
                        ? ((item.copy_data as any)?.edit_label ?? "Edição IA")
                        : ((item.copy_data as any)?.headline ?? (item.copy_data as any)?.name ?? "Criativo");
                      return (
                        <CarouselItem key={item.id} className="pl-3 basis-[85%]">
                          <div
                            onClick={() => handleCreativeClick(item)}
                            className="group relative rounded-xl overflow-hidden cursor-pointer border border-border shadow-card"
                          >
                            <img src={item.image_url} alt={displayName} className="w-full aspect-square object-cover" loading="lazy" />
                            {isEdit && (
                              <span className="absolute top-2 left-2 text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">✨ Edição IA</span>
                            )}
                            {isCarousel && !isEdit && (
                              <span className="absolute top-2 left-2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">🎴 Carrossel</span>
                            )}
                            {isIdeia && !isEdit && !isCarousel && (
                              <span className="absolute top-2 left-2 text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-medium">💡 Ideia</span>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                              <p className="text-white text-xs font-medium truncate">{displayName}</p>
                              <p className="text-white/70 text-[10px] mt-0.5">{format(new Date(item.created_at), "dd/MM/yy")}</p>
                            </div>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="-left-3 bg-background/80 border-border" />
                  <CarouselNext className="-right-3 bg-background/80 border-border" />
                </Carousel>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
