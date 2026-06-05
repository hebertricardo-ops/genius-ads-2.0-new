import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin, AdminPeriod } from "@/hooks/useAdmin";
import { useSortableTable } from "@/hooks/useSortableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Users, DollarSign, Image, BarChart2, Tag } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── SortableHeader ───────────────────────────────────────────────────────────

const SortableHeader = ({
  label, field, sortKey, sortDir, onSort,
}: {
  label:   string;
  field:   string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  onSort:  (field: string) => void;
}) => {
  const isActive = sortKey === field;
  return (
    <th
      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-[10px]">
          {!isActive ? "↕" : sortDir === "asc" ? "↑" : "↓"}
        </span>
      </span>
    </th>
  );
};

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

  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(filtered);

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
              <SortableHeader label="Nome"         field="name"              sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Email"        field="email"             sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="WhatsApp"     field="whatsapp"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Plano"        field="plan_name"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Total"        field="total_credits"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Usado"        field="used_credits"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Disponível"   field="available_credits" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Status"       field="status"            sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Membro desde" field="member_since"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
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
              : sorted.map((u: any) => (
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

  const { sorted: sortedUsers, sortKey: cSortKey, sortDir: cSortDir, handleSort: cHandleSort } =
    useSortableTable(costs?.byUser ?? []);

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
                <SortableHeader label="Usuário"   field="name"             sortKey={cSortKey} sortDir={cSortDir} onSort={cHandleSort} />
                <SortableHeader label="Email"     field="email"            sortKey={cSortKey} sortDir={cSortDir} onSort={cHandleSort} />
                <SortableHeader label="Imagens"   field="images_generated" sortKey={cSortKey} sortDir={cSortDir} onSort={cHandleSort} />
                <SortableHeader label="Tokens"    field="tokens_used"      sortKey={cSortKey} sortDir={cSortDir} onSort={cHandleSort} />
                <SortableHeader label="OpenAI"    field="openai_cost_usd"  sortKey={cSortKey} sortDir={cSortDir} onSort={cHandleSort} />
                <SortableHeader label="FAL.AI"    field="fal_cost_usd"     sortKey={cSortKey} sortDir={cSortDir} onSort={cHandleSort} />
                <SortableHeader label="Total USD" field="total_cost_usd"   sortKey={cSortKey} sortDir={cSortDir} onSort={cHandleSort} />
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">Total BRL</th>
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
                : sortedUsers.map((u: any) => (
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

  const { sorted: sortedGen, sortKey: gSortKey, sortDir: gSortDir, handleSort: gHandleSort } =
    useSortableTable(generations?.byUser ?? []);

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
                <SortableHeader label="Usuário" field="name"     sortKey={gSortKey} sortDir={gSortDir} onSort={gHandleSort} />
                <SortableHeader label="Email"   field="email"    sortKey={gSortKey} sortDir={gSortDir} onSort={gHandleSort} />
                <SortableHeader label="24h"     field="last_24h" sortKey={gSortKey} sortDir={gSortDir} onSort={gHandleSort} />
                <SortableHeader label="7 dias"  field="last_7d"  sortKey={gSortKey} sortDir={gSortDir} onSort={gHandleSort} />
                <SortableHeader label="30 dias" field="last_30d" sortKey={gSortKey} sortDir={gSortDir} onSort={gHandleSort} />
                <SortableHeader label="Total"   field="total"    sortKey={gSortKey} sortDir={gSortDir} onSort={gHandleSort} />
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
                : sortedGen.map((u: any) => (
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

// ─── Brands Tab ───────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  manual:    "Manual",
  website:   "Website",
  instagram: "Instagram",
};

const SOURCE_COLORS: Record<string, string> = {
  manual:    "bg-gray-100 text-gray-700",
  website:   "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
};

const AdminBrandsTab = ({ brands, isLoading }: { brands: any; isLoading: boolean }) => {
  const [search, setSearch] = useState("");
  const [view, setView]     = useState<"flat" | "by_user">("by_user");

  const byUser = (brands?.by_user ?? []).filter((u: any) =>
    !search ||
    u.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.brands?.some((b: any) => b.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const flat = (brands?.brands ?? []).filter((b: any) =>
    !search ||
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.profiles?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const { sorted: sortedBrands, sortKey: bSortKey, sortDir: bSortDir, handleSort: bHandleSort } =
    useSortableTable(flat);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar marca ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <span className="text-sm text-muted-foreground">
            {brands?.total ?? 0} marca{brands?.total !== 1 ? "s" : ""} no total
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={view === "by_user" ? "default" : "outline"} onClick={() => setView("by_user")}>
            Por usuário
          </Button>
          <Button size="sm" variant={view === "flat" ? "default" : "outline"} onClick={() => setView("flat")}>
            Todas as marcas
          </Button>
        </div>
      </div>

      {/* View: Por usuário */}
      {view === "by_user" && (
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
              ))
            : byUser.map((u: any) => (
                <div key={u.user_id} className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{u.user_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {u.brands.length} marca{u.brands.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {u.brands.map((b: any) => (
                      <div key={b.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">{b.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[b.source] ?? SOURCE_COLORS.manual}`}>
                            {SOURCE_LABELS[b.source] ?? b.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {b.is_active ? "Ativa" : "Inativa"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(b.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* View: Tabela flat */}
      {view === "flat" && (
        <div className="border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader label="Marca"    field="name"       sortKey={bSortKey} sortDir={bSortDir} onSort={bHandleSort} />
                <SortableHeader label="Origem"   field="source"     sortKey={bSortKey} sortDir={bSortDir} onSort={bHandleSort} />
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuário</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
                <SortableHeader label="Status"    field="is_active"  sortKey={bSortKey} sortDir={bSortDir} onSort={bHandleSort} />
                <SortableHeader label="Criada em" field="created_at" sortKey={bSortKey} sortDir={bSortDir} onSort={bHandleSort} />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                : sortedBrands.map((b: any) => (
                    <tr key={b.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[b.source] ?? SOURCE_COLORS.manual}`}>
                          {SOURCE_LABELS[b.source] ?? b.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">{b.profiles?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{b.profiles?.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {b.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(b.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}
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
  const [brands, setBrands]           = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [activeTab, setActiveTab]     = useState("users");

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ov, us, co, ge, br] = await Promise.all([
        fetchSection("overview",    period),
        fetchSection("users",       period),
        fetchSection("costs",       period),
        fetchSection("generations", period),
        fetchSection("brands",      period),
      ]);
      setOverview(ov?.overview ?? ov);
      setUsers(us?.users ?? []);
      setCosts(co);
      setGenerations(ge);
      setBrands(br);
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
            <TabsTrigger value="brands">
              <Tag className="h-4 w-4 mr-2" /> Marcas
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
          <TabsContent value="brands" className="mt-4">
            <AdminBrandsTab brands={brands} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
