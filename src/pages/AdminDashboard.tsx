import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin, AdminPeriod } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Users, DollarSign, Image, BarChart2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── KPI Cards ───────────────────────────────────────────────────────────────

const AdminKPICards = ({ overview, isLoading }: { overview: any; isLoading: boolean }) => {
  const USD_TO_BRL = 5.50;

  const cards = [
    {
      label: "Usuários cadastrados",
      value: overview?.total_users ?? "—",
      sub:   `+${overview?.new_users_period ?? 0} no período`,
      icon: Users, color: "text-blue-600", bg: "bg-blue-50",
    },
    {
      label: "Gerações totais",
      value: overview?.total_generations ?? "—",
      sub:   `${overview?.generations_period ?? 0} no período`,
      icon: Image, color: "text-teal-600", bg: "bg-teal-50",
    },
    {
      label: "Custo total (USD)",
      value: overview?.total_cost_usd
        ? `$${Number(overview.total_cost_usd).toFixed(4)}`
        : "—",
      sub: overview?.total_cost_usd
        ? `R$ ${(Number(overview.total_cost_usd) * USD_TO_BRL).toFixed(2)}`
        : "",
      icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50",
    },
    {
      label: "Custo no período",
      value: overview?.cost_period_usd
        ? `$${Number(overview.cost_period_usd).toFixed(4)}`
        : "—",
      sub: `OpenAI: $${Number(overview?.total_cost_openai_usd ?? 0).toFixed(4)} · FAL: $${Number(overview?.total_cost_fal_usd ?? 0).toFixed(4)}`,
      icon: BarChart2, color: "text-orange-600", bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
        <div key={label} className="gradient-card rounded-xl border border-border shadow-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </div>
          {isLoading
            ? <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            : <p className="text-2xl font-display font-bold">{value}</p>
          }
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

const AdminUsersTab = ({ users, isLoading }: { users: any[]; isLoading: boolean }) => {
  const [search, setSearch]             = useState("");
  const [filterPlan, setFilterPlan]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const PLAN_COLORS: Record<string, string> = {
    free:           "bg-gray-100 text-gray-700",
    pro:            "bg-blue-100 text-blue-700",
    advanced:       "bg-purple-100 text-purple-700",
    "social-media": "bg-orange-100 text-orange-700",
  };

  const filtered = (users ?? []).filter((u: any) => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchPlan   = filterPlan   === "all" || u.plan_slug === filterPlan;
    const matchStatus = filterStatus === "all" || u.status    === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
        >
          <option value="all">Todos os planos</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="advanced">Advanced</option>
          <option value="social-media">Social Media</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
        >
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} usuário{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Nome","Email","WhatsApp","Plano","Total","Usado","Disponível","Status","Membro desde"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              : filtered.map((u: any) => (
                  <tr key={u.user_id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.whatsapp ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${PLAN_COLORS[u.plan_slug] ?? PLAN_COLORS.free}`}>
                        {u.plan_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">{u.total_credits}</td>
                    <td className="px-4 py-3">{u.used_credits}</td>
                    <td className="px-4 py-3 font-medium text-primary">{u.available_credits}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.status === "ativo" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(u.member_since).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Costs Tab ────────────────────────────────────────────────────────────────

const AdminCostsTab = ({ costs, isLoading }: { costs: any; isLoading: boolean }) => {
  const USD_TO_BRL = 5.50;
  const totalOpenAI = (costs?.byUser ?? []).reduce((a: number, u: any) => a + Number(u.openai_cost_usd ?? 0), 0);
  const totalFal    = (costs?.byUser ?? []).reduce((a: number, u: any) => a + Number(u.fal_cost_usd    ?? 0), 0);
  const totalImgs   = (costs?.byUser ?? []).reduce((a: number, u: any) => a + Number(u.images_generated ?? 0), 0);
  const totalTokens = (costs?.byUser ?? []).reduce((a: number, u: any) => a + Number(u.tokens_used     ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "OpenAI total",    usd: totalOpenAI,            count: null,      tokens: null },
          { label: "FAL.AI total",    usd: totalFal,               count: null,      tokens: null },
          { label: "Custo combinado", usd: totalOpenAI + totalFal, count: null,      tokens: null },
          { label: "Imagens geradas", usd: null,                   count: totalImgs, tokens: totalTokens },
        ].map(({ label, usd, count, tokens }) => (
          <div key={label} className="gradient-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
            {usd !== null ? (
              <>
                <p className="text-xl font-display font-bold">${usd.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">R$ {(usd * USD_TO_BRL).toFixed(2)}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-display font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{Number(tokens).toLocaleString("pt-BR")} tokens</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Custo por usuário</h3>
        <div className="border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Usuário","Email","Imagens","Tokens","OpenAI USD","FAL.AI USD","Total USD","Total BRL"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                : (costs?.byUser ?? []).map((u: any) => (
                    <tr key={u.user_id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{u.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                      <td className="px-4 py-3">{u.images_generated}</td>
                      <td className="px-4 py-3">{Number(u.tokens_used).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">${Number(u.openai_cost_usd).toFixed(4)}</td>
                      <td className="px-4 py-3">${Number(u.fal_cost_usd).toFixed(4)}</td>
                      <td className="px-4 py-3 font-medium">${Number(u.total_cost_usd).toFixed(4)}</td>
                      <td className="px-4 py-3 text-muted-foreground">R$ {(Number(u.total_cost_usd) * USD_TO_BRL).toFixed(2)}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Generations Tab ──────────────────────────────────────────────────────────

const AdminGenerationsTab = ({ generations, isLoading }: { generations: any; isLoading: boolean }) => {
  const chartData = (generations?.byDay ?? [])
    .map((d: any) => ({
      date:      new Date(d.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      Total:     Number(d.total),
      Gerados:   Number(d.generated),
      Adaptados: Number(d.adapted),
      Editados:  Number(d.edited),
    }))
    .reverse();

  return (
    <div className="space-y-6">
      <div className="gradient-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-medium mb-4">Gerações por dia</h3>
        {isLoading ? (
          <div className="h-48 bg-muted animate-pulse rounded" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma geração no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#378ADD" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#378ADD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Total"     stroke="#378ADD" fill="url(#gTotal)" strokeWidth={2} />
              <Area type="monotone" dataKey="Gerados"   stroke="#f97316" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="Adaptados" stroke="#1D9E75" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="Editados"  stroke="#7F77DD" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Gerações por usuário</h3>
        <div className="border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Usuário","Email","24h","7 dias","30 dias","Total"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                : (generations?.byUser ?? []).map((u: any) => (
                    <tr key={u.user_id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{u.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        {Number(u.last_24h) > 0
                          ? <span className="font-medium text-primary">{u.last_24h}</span>
                          : <span className="text-muted-foreground">0</span>
                        }
                      </td>
                      <td className="px-4 py-3">{u.last_7d}</td>
                      <td className="px-4 py-3">{u.last_30d}</td>
                      <td className="px-4 py-3 font-medium">{u.total}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const navigate                      = useNavigate();
  const { isAdmin, fetchSection }     = useAdmin();
  const [period, setPeriod]           = useState<AdminPeriod>("30d");
  const [overview, setOverview]       = useState<any>(null);
  const [users, setUsers]             = useState<any[]>([]);
  const [costs, setCosts]             = useState<any>(null);
  const [generations, setGenerations] = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [activeTab, setActiveTab]     = useState("users");

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ov, us, co, ge] = await Promise.all([
        fetchSection("overview",    period),
        fetchSection("users",       period),
        fetchSection("costs",       period),
        fetchSection("generations", period),
      ]);
      setOverview(ov?.overview ?? ov);
      setUsers(us?.users ?? []);
      setCosts(co);
      setGenerations(ge);
    } catch (err) {
      console.error("Erro ao carregar admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [period, isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-lg font-display font-semibold">Admin — Genius ADS</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["24h", "7d", "30d", "all"] as AdminPeriod[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
            >
              {p === "all" ? "Tudo" : p === "24h" ? "24h" : p === "7d" ? "7 dias" : "30 dias"}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <AdminKPICards overview={overview} isLoading={isLoading} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="costs">
              <DollarSign className="h-4 w-4 mr-2" /> Custos de API
            </TabsTrigger>
            <TabsTrigger value="generations">
              <Image className="h-4 w-4 mr-2" /> Gerações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <AdminUsersTab users={users} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="costs" className="mt-4">
            <AdminCostsTab costs={costs} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="generations" className="mt-4">
            <AdminGenerationsTab generations={generations} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
