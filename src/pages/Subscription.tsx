import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, CreditCard, Coins, RefreshCw, Gift, Zap,
  ArrowUpCircle, Building2, ImageIcon, Images, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const FREEMIUM_CREDITS = 35;
const FREEMIUM_MAX_BRANDS = 1;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const Subscription = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { toast } = useToast();

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: allPlans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .order("price_monthly");
      return data ?? [];
    },
  });

  const { data: brandsCount } = useQuery({
    queryKey: ["brands-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("brands")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: rawGenerations } = useQuery({
    queryKey: ["generation-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_creatives")
        .select("id, brand_id, carousel_request_id, brands(name)")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const plan = (subscription as any)?.plans ?? null;
  const isFreemium = !subscription;

  const planName = plan?.name ?? "Freemium";
  const planMonthlyCredits = plan?.monthly_credits ?? FREEMIUM_CREDITS;
  const planMaxBrands: number | null = plan?.max_brands ?? FREEMIUM_MAX_BRANDS;

  const subscriptionCredits = credits?.subscription_credits ?? 0;
  const extraCredits = credits?.extra_credits ?? 0;
  const creditsBalance = credits?.credits_balance ?? 0;
  const creditsUsed = credits?.credits_used ?? 0;

  const { brandStats, totalCreatives, totalCarousels } = useMemo(() => {
    if (!rawGenerations) return { brandStats: [], totalCreatives: 0, totalCarousels: 0 };

    const brandMap = new Map<string, { name: string; creatives: number; carousels: Set<string> }>();

    for (const row of rawGenerations) {
      const brandId = (row.brand_id as string | null) ?? "__none__";
      const brandName = (row as any).brands?.name ?? "Sem marca";

      if (!brandMap.has(brandId)) {
        brandMap.set(brandId, { name: brandName, creatives: 0, carousels: new Set() });
      }

      const entry = brandMap.get(brandId)!;
      if ((row as any).carousel_request_id) {
        entry.carousels.add((row as any).carousel_request_id);
      } else {
        entry.creatives++;
      }
    }

    const stats = Array.from(brandMap.values())
      .map((v) => ({ name: v.name, creatives: v.creatives, carousels: v.carousels.size }))
      .sort((a, b) => (b.creatives + b.carousels) - (a.creatives + a.carousels));

    return {
      brandStats: stats,
      totalCreatives: stats.reduce((s, b) => s + b.creatives, 0),
      totalCarousels: stats.reduce((s, b) => s + b.carousels, 0),
    };
  }, [rawGenerations]);

  const upgradePlans = useMemo(() => {
    if (!allPlans) return [];
    if (isFreemium) return allPlans.filter((p: any) => p.price_monthly > 0);
    return allPlans.filter((p: any) => p.price_monthly > (plan?.price_monthly ?? 0));
  }, [allPlans, isFreemium, plan]);

  const isTopPlan = !isFreemium && allPlans != null && upgradePlans.length === 0;
  const nextPlan = upgradePlans[0] ?? null;

  const brandsProgress = planMaxBrands
    ? Math.min(((brandsCount ?? 0) / planMaxBrands) * 100, 100)
    : 0;

  if (subLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display text-foreground mb-2">Minha Assinatura</h1>
        <p className="text-muted-foreground">Gerencie seu plano, créditos e histórico de uso.</p>
      </div>

      {/* Plan + Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Plan card */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">Seu Plano</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Zap className="w-3 h-3" />
              {planName}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-display text-foreground">{planName}</h2>
              <p className="text-sm text-muted-foreground">
                {isFreemium ? "Gratuito" : subscription?.billing_cycle === "annual" ? "Anual" : "Mensal"}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Início do plano</span>
              <span className="text-foreground">
                {subscription?.current_period_start
                  ? formatDate(subscription.current_period_start)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {subscription ? "Próxima renovação" : "Agendamento"}
              </span>
              <span className="text-foreground">
                {subscription?.current_period_end
                  ? formatDate(subscription.current_period_end)
                  : "Não disponível"}
              </span>
            </div>
          </div>

          {!isTopPlan && nextPlan && (
            <Button
              variant="hero"
              className="w-full"
              onClick={() =>
                toast({ title: "Em breve!", description: "Upgrade de plano estará disponível em breve." })
              }
            >
              <ArrowUpCircle className="w-4 h-4" />
              {isFreemium ? "Assinar um plano" : `Fazer Upgrade para ${nextPlan.name}`}
            </Button>
          )}
        </div>

        {/* Credits card */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
          <p className="text-sm text-muted-foreground mb-4">Seus Créditos</p>

          <div className="rounded-xl bg-muted/40 border border-border p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Total Disponível</p>
            <p className="text-4xl font-display text-foreground">{creditsBalance}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Créditos do Plano</span>
              </div>
              <p className="text-xl font-display text-foreground">
                {subscriptionCredits}
                <span className="text-sm text-muted-foreground font-normal"> / {planMonthlyCredits}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">🔄 Renovam mensalmente</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-muted-foreground">Créditos Extras</span>
              </div>
              <p className="text-xl font-display text-foreground">{extraCredits}</p>
              <p className="text-xs text-muted-foreground mt-1">🎁 Nunca expiram</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Usados neste período</span>
            <span className="text-sm font-medium text-amber-500">{creditsUsed} créditos</span>
          </div>
        </div>
      </div>

      {/* Plan limits */}
      <div className="gradient-card rounded-2xl border border-border shadow-card p-6 mb-6 animate-fade-in">
        <h3 className="font-display text-foreground mb-1">Limites do Plano</h3>
        <p className="text-sm text-muted-foreground mb-6">Seu uso atual das funcionalidades</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Marcas cadastradas</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {brandsCount ?? 0}
                {planMaxBrands ? ` / ${planMaxBrands}` : ""}
              </span>
            </div>
            <Progress value={planMaxBrands ? brandsProgress : 30} className="h-2" />
            {!planMaxBrands && (
              <p className="text-xs text-muted-foreground mt-1">Ilimitado</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Criativos gerados</span>
              </div>
              <span className="text-sm font-medium text-foreground">{totalCreatives}</span>
            </div>
            <Progress value={totalCreatives > 0 ? 100 : 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">Total acumulado</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Images className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Carrosséis gerados</span>
              </div>
              <span className="text-sm font-medium text-foreground">{totalCarousels}</span>
            </div>
            <Progress value={totalCarousels > 0 ? 100 : 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">Total acumulado</p>
          </div>
        </div>
      </div>

      {/* Generation stats by brand */}
      <div className="gradient-card rounded-2xl border border-border shadow-card p-6 mb-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-display text-foreground">Gerações por Marca</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Detalhamento de criativos e carrosséis por marca
        </p>

        {brandStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma geração encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium pb-3 pr-4">Marca</th>
                  <th className="text-right text-xs text-muted-foreground font-medium pb-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <ImageIcon className="w-3 h-3" />
                      Criativos
                    </div>
                  </th>
                  <th className="text-right text-xs text-muted-foreground font-medium pb-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Images className="w-3 h-3" />
                      Carrosséis
                    </div>
                  </th>
                  <th className="text-right text-xs text-muted-foreground font-medium pb-3 pl-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {brandStats.map((b, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 text-sm text-foreground font-medium">{b.name}</td>
                    <td className="py-3 px-4 text-right text-sm text-foreground">{b.creatives}</td>
                    <td className="py-3 px-4 text-right text-sm text-foreground">{b.carousels}</td>
                    <td className="py-3 pl-4 text-right text-sm font-semibold text-primary">
                      {b.creatives + b.carousels}
                    </td>
                  </tr>
                ))}
                {brandStats.length > 1 && (
                  <tr className="bg-muted/30 rounded-lg">
                    <td className="py-3 pr-4 text-sm text-muted-foreground font-medium rounded-l-lg pl-2">
                      Total
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-foreground">
                      {totalCreatives}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-foreground">
                      {totalCarousels}
                    </td>
                    <td className="py-3 pl-4 pr-2 text-right text-sm font-semibold text-primary rounded-r-lg">
                      {totalCreatives + totalCarousels}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade card — only when not on top plan */}
      {!isTopPlan && upgradePlans.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle className="w-5 h-5 text-primary" />
            <h3 className="font-display text-foreground">Fazer Upgrade</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upgradePlans.map((p: any) => (
              <div
                key={p.id}
                className={`gradient-card rounded-2xl border shadow-card p-6 ${
                  p.slug === "advanced" ? "border-primary/60" : "border-border"
                }`}
              >
                {p.slug === "advanced" && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                    Recomendado
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-display text-foreground">{p.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      R$ {Number(p.price_monthly).toFixed(2).replace(".", ",")}/mês
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 mb-5">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Coins className="w-3.5 h-3.5 text-primary shrink-0" />
                    {p.monthly_credits} créditos por mês
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {p.max_brands ? `Até ${p.max_brands} marcas` : "Marcas ilimitadas"}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                    Renovação mensal automática
                  </li>
                </ul>
                <Button
                  variant={p.slug === "advanced" ? "hero" : "outline"}
                  className="w-full"
                  onClick={() =>
                    toast({ title: "Em breve!", description: "Assinatura de plano estará disponível em breve." })
                  }
                >
                  Assinar plano {p.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
