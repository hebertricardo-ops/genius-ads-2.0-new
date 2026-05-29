import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, Eye, TrendingUp, Heart, MessageCircle, Share2, Bookmark, BarChart2, Wifi, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlan } from "@/hooks/usePlan";
import { useAnalytics, AnalyticsPeriod, AnalyticsPlatform, AnalyticsPost } from "@/hooks/useAnalytics";
import { useSocialPublish } from "@/hooks/useSocialPublish";
import { useBrandContext } from "@/contexts/BrandContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import UpgradeDialog from "@/components/UpgradeDialog";

// ── Engagement score ─────────────────────────────────────────────

type EngagementLevel = "baixo" | "regular" | "bom" | "otimo" | "viral";

interface EngagementScore {
  score: number;
  level: EngagementLevel;
  label: string;
  weightedInteractions: number;
}

function calcEngagementScore(metrics: {
  likes: number; comments: number; shares: number; saves: number; reach: number;
}): EngagementScore {
  const { likes, comments, shares, saves, reach } = metrics;
  const weighted = saves * 5 + shares * 4 + comments * 3 + likes * 1;
  const reachBase = Math.max(reach, 1);
  const score = weighted / (reachBase / 1000);

  let level: EngagementLevel;
  let label: string;
  if (score >= 20)      { level = "viral";   label = "🔥 Viral"; }
  else if (score >= 10) { level = "otimo";   label = "🔵 Ótimo"; }
  else if (score >= 5)  { level = "bom";     label = "🟢 Bom"; }
  else if (score >= 2)  { level = "regular"; label = "🟡 Regular"; }
  else                  { level = "baixo";   label = "⚪ Baixo"; }

  return { score: Math.round(score * 10) / 10, level, label, weightedInteractions: weighted };
}

// ─────────────────────────────────────────────────────────────────

const formatValue = (value: number, type: "abbreviated" | "percent" | "number" = "abbreviated"): string => {
  if (type === "percent") return `${value.toFixed(1)}%`;
  if (type === "number") return value.toLocaleString("pt-BR");
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "last_week", label: "7 dias" },
  { value: "last_month", label: "30 dias" },
  { value: "last_3months", label: "90 dias" },
  { value: "all_time", label: "Todo período" },
];

const PLATFORMS: { value: AnalyticsPlatform; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
];

// ── Sub-components ───────────────────────────────────────────────

const KPICard = ({
  icon: Icon,
  label,
  value,
  valueType = "abbreviated",
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  valueType?: "abbreviated" | "percent" | "number";
  color?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className="text-2xl font-semibold text-foreground tabular-nums">
      {formatValue(value, valueType)}
    </span>
  </div>
);

const ReachChart = ({ timeseries }: { timeseries: { date: string; reach: number; impressions: number }[] }) => {
  const formatted = timeseries.map((p) => ({
    ...p,
    label: (() => {
      try { return format(parseISO(p.date), "dd/MM", { locale: ptBR }); } catch { return p.date; }
    })(),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground mb-4">Alcance e Impressões</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatValue(v)} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [formatValue(value, "number"), name === "reach" ? "Alcance" : "Impressões"]}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Area type="monotone" dataKey="impressions" stroke="#f97316" strokeWidth={1.5} fill="url(#impressionsGrad)" dot={false} />
          <Area type="monotone" dataKey="reach" stroke="#f97316" strokeWidth={2} fill="url(#reachGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const EngagementDetails = ({
  details,
}: {
  details: { likes: number; comments: number; shares: number; saves: number };
}) => {
  const items = [
    { icon: Heart, label: "Curtidas", value: details.likes },
    { icon: MessageCircle, label: "Comentários", value: details.comments },
    { icon: Share2, label: "Compartilhamentos", value: details.shares },
    { icon: Bookmark, label: "Salvamentos", value: details.saves },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Detalhes de Engajamento</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{formatValue(value, "number")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  IMAGE: "Imagem",
  VIDEO: "Reel",
  REEL: "Reel",
  CAROUSEL_ALBUM: "Carrossel",
  TEXT: "Texto",
};

const LEVEL_BADGE: Record<EngagementLevel, string> = {
  viral:   "bg-orange-100 text-orange-700",
  otimo:   "bg-blue-100 text-blue-700",
  bom:     "bg-green-100 text-green-700",
  regular: "bg-yellow-100 text-yellow-700",
  baixo:   "bg-gray-100 text-gray-600",
};

const PostCard = ({ post, rank }: { post: AnalyticsPost; rank: number }) => {
  const m = post.metrics;

  const engScore = calcEngagementScore({
    likes:    m?.likes    ?? 0,
    comments: m?.comments ?? 0,
    shares:   m?.shares   ?? 0,
    saves:    m?.saves    ?? 0,
    reach:    m?.reach    ?? m?.views ?? m?.impressions ?? 0,
  });

  const dateLabel = post.scheduled_date
    ? (() => { try { return format(parseISO(post.scheduled_date), "dd MMM yyyy", { locale: ptBR }); } catch { return ""; } })()
    : "";

  const mediaTypeLabel = post.media_type ? (MEDIA_TYPE_LABEL[post.media_type] ?? post.media_type) : null;
  const snippet = post.caption?.slice(0, 80) ?? post.title ?? "Post";
  const isTop = rank === 1;

  return (
    <div className={cn(
      "shrink-0 w-44 flex flex-col rounded-xl border bg-card overflow-hidden group",
      isTop ? "border-orange-500 ring-2 ring-orange-500/50" : "border-border",
    )}>
      {/* Imagem */}
      <div className="relative aspect-square w-full bg-muted">
        {post.image_url ? (
          <img src={post.image_url} alt={snippet} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BarChart2 className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Rank badge — top left */}
        <span className={cn(
          "absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold leading-none",
          isTop ? "bg-orange-500" : "bg-black/60",
        )}>
          #{rank}
        </span>

        {/* Media type badge — top right */}
        {mediaTypeLabel && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium leading-none">
            {mediaTypeLabel}
          </span>
        )}

        {/* Link overlay */}
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-5 h-5 text-white" />
          </a>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <p className="text-[11px] font-medium text-primary leading-snug line-clamp-2">{snippet}</p>

        {dateLabel && (
          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <span>📅</span>{dateLabel}
          </p>
        )}

        {/* Métricas detalhadas */}
        {m && (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-auto pt-0.5">
            {(m.reach || m.views || m.impressions) > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                👁️ {((m.reach || m.views || m.impressions) ?? 0).toLocaleString("pt-BR")}
              </span>
            )}
            {m.likes > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">❤️ {m.likes}</span>
            )}
            {m.comments > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">💬 {m.comments}</span>
            )}
            {m.shares > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">↗️ {m.shares}</span>
            )}
            {m.saves > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">🔖 {m.saves}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Card compacto para grade do dialog
const PostCardGrid = ({ post, rank }: { post: AnalyticsPost; rank: number }) => {
  const m = post.metrics;
  const reach = m ? (m.reach || m.views || m.impressions || 0) : 0;
  const engRate = m && reach > 0
    ? ((m.likes + m.comments + m.shares + m.saves) / reach) * 100
    : null;

  const dateLabel = post.scheduled_date
    ? (() => { try { return format(parseISO(post.scheduled_date), "dd MMM yyyy", { locale: ptBR }); } catch { return ""; } })()
    : "";

  const mediaTypeLabel = post.media_type ? (MEDIA_TYPE_LABEL[post.media_type] ?? post.media_type) : null;
  const snippet = post.caption?.slice(0, 100) ?? post.title ?? "Post";
  const isTop = rank === 1;

  return (
    <div className={cn(
      "flex flex-col rounded-xl border bg-card overflow-hidden group",
      isTop ? "border-orange-500 ring-2 ring-orange-500/40" : "border-border",
    )}>
      <div className="relative aspect-square w-full bg-muted">
        {post.image_url ? (
          <img src={post.image_url} alt={snippet} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BarChart2 className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        <span className={cn(
          "absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold leading-none",
          isTop ? "bg-orange-500" : "bg-black/60",
        )}>
          #{rank}
        </span>
        {mediaTypeLabel && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium leading-none">
            {mediaTypeLabel}
          </span>
        )}
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-5 h-5 text-white" />
          </a>
        )}
      </div>

      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">{snippet}</p>
        {dateLabel && (
          <p className="text-[10px] text-muted-foreground/60">{dateLabel}</p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {m && m.likes > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums">
              <Heart className="w-3 h-3 text-rose-400 shrink-0" />
              {formatValue(m.likes)}
            </span>
          )}
          {m && m.comments > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums">
              <MessageCircle className="w-3 h-3 text-sky-400 shrink-0" />
              {formatValue(m.comments)}
            </span>
          )}
          {engRate !== null && (
            <span className="ml-auto text-[11px] font-semibold text-primary tabular-nums">
              {engRate.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Dialog "Ver todos"
const TYPE_FILTER_OPTIONS = [
  { value: "all",            label: "Todos os tipos" },
  { value: "IMAGE",          label: "Imagem" },
  { value: "REEL",           label: "Reel" },
  { value: "CAROUSEL_ALBUM", label: "Carrossel" },
];

const SORT_OPTIONS = [
  { value: "eng_desc",  label: "Engajamento (maior)" },
  { value: "eng_asc",   label: "Engajamento (menor)" },
  { value: "date_desc", label: "Mais recente" },
  { value: "date_asc",  label: "Mais antigo" },
];

const postScore = (post: AnalyticsPost) =>
  calcEngagementScore({
    likes:    post.metrics?.likes    ?? 0,
    comments: post.metrics?.comments ?? 0,
    shares:   post.metrics?.shares   ?? 0,
    saves:    post.metrics?.saves    ?? 0,
    reach:    post.metrics?.reach ?? post.metrics?.views ?? post.metrics?.impressions ?? 0,
  }).score;

const AllPostsDialog = ({
  open,
  onClose,
  posts,
}: {
  open: boolean;
  onClose: () => void;
  posts: AnalyticsPost[];
}) => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("eng_desc");

  const filtered = [...posts]
    .filter((p) => {
      if (typeFilter === "all") return true;
      if (typeFilter === "REEL") return p.media_type === "REEL" || p.media_type === "VIDEO";
      return p.media_type === typeFilter;
    })
    .sort((a, b) => {
      if (sortOrder === "eng_desc") return postScore(b) - postScore(a);
      if (sortOrder === "eng_asc")  return postScore(a) - postScore(b);
      const dA = a.scheduled_date ?? "";
      const dB = b.scheduled_date ?? "";
      return sortOrder === "date_desc" ? dB.localeCompare(dA) : dA.localeCompare(dB);
    });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="flex-row items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold mr-auto">
            Todos os posts ({filtered.length})
          </DialogTitle>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="h-8 text-xs w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum post encontrado.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((post, idx) => (
                <PostCardGrid key={post.id} post={post} rank={idx + 1} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TopPostsSection = ({ posts, isLoading }: { posts: AnalyticsPost[]; isLoading: boolean }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isLoading && posts.length === 0) return null;

  const sorted = [...posts].sort((a, b) => postScore(b) - postScore(a));

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-medium text-foreground">Top posts por engajamento</h3>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Score calculado por: salvamentos (×5) + compartilhamentos (×4) + comentários (×3) + curtidas (×1),
                  normalizado por alcance. Reflete o valor real do engajamento para o algoritmo.
                </p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
          {!isLoading && (
            <button
              onClick={() => setDialogOpen(true)}
              className="ml-auto text-xs text-primary font-medium hover:underline"
            >
              Ver todos ({posts.length})
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shrink-0 w-44 rounded-xl border border-border bg-muted animate-pulse" style={{ height: 260 }} />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {sorted.map((post, idx) => (
              <PostCard key={post.id} post={post} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>

      <AllPostsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        posts={posts}
      />
    </>
  );
};

const FORMAT_CONFIG: {
  label: string;
  types: string[];
  barClass: string;
  badgeClass: string;
}[] = [
  { label: "Posts",   types: ["IMAGE", "CAROUSEL_ALBUM"], barClass: "bg-indigo-500",  badgeClass: "bg-indigo-100 text-indigo-700" },
  { label: "Reels",   types: ["VIDEO", "REEL"],           barClass: "bg-purple-500",  badgeClass: "bg-purple-100 text-purple-700" },
  { label: "Stories", types: ["STORY"],                   barClass: "bg-amber-400",   badgeClass: "bg-amber-100 text-amber-700" },
];

const ViewsByFormatCard = ({ posts }: { posts: AnalyticsPost[] }) => {
  const rows = FORMAT_CONFIG.map((cfg) => {
    const matching = posts.filter((p) => p.media_type && cfg.types.includes(p.media_type));
    const views = matching.reduce(
      (s, p) => s + (p.metrics?.views || p.metrics?.reach || p.metrics?.impressions || 0),
      0,
    );
    return { ...cfg, views, count: matching.length };
  }).filter((r) => r.count > 0);

  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.views, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-foreground">Visualizações por formato</h3>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Soma das views individuais de cada publicação, agrupadas por tipo de formato.
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribuição das views entre posts, reels e stories.
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total</p>
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {total.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Barra de progresso segmentada */}
      <div className="flex h-2 rounded-full overflow-hidden mb-5">
        {rows.map((r) => (
          <div
            key={r.label}
            className={r.barClass}
            style={{ width: `${total > 0 ? (r.views / total) * 100 : 0}%` }}
          />
        ))}
      </div>

      {/* Linhas por formato */}
      <div className="space-y-3">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.views / total) * 100) : 0;
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full w-16 text-center shrink-0", r.badgeClass)}>
                {r.label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-semibold text-foreground tabular-nums">
                    {r.views.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-xs text-muted-foreground">views</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{r.count} publicações</p>
              </div>
              <span className="text-sm font-medium text-foreground tabular-nums shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NotConnectedState = ({ onConnect }: { onConnect: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
      <Wifi className="w-7 h-7 text-muted-foreground" />
    </div>
    <div>
      <h3 className="text-base font-medium text-foreground mb-1">Nenhuma rede conectada</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Conecte suas redes sociais para visualizar os dados de analytics.
      </p>
    </div>
    <Button variant="hero" onClick={onConnect}>
      Conectar Redes Sociais
    </Button>
  </div>
);


// ── Main page ────────────────────────────────────────────────────

const Analytics = () => {
  const navigate = useNavigate();
  const { hasAnalytics, planName, isLoading: planLoading } = usePlan();
  const { selectedBrand } = useBrandContext();
  const { isConnected, connectSocialAccounts } = useSocialPublish();
  const { data, isLoading, error, period, setPeriod, platform, setPlatform, topPosts, topPostsLoading, postSummary, postTimeseries } = useAnalytics();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!planLoading && !hasAnalytics) setUpgradeOpen(true);
  }, [planLoading, hasAnalytics]);

  if (planLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );

  if (!hasAnalytics) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => { setUpgradeOpen(false); navigate(-1); }}
        feature="analytics"
        currentPlan={planName}
      />
    </div>
  );

  const notConnected = !isConnected || error?.message === "NOT_CONNECTED";

  if (notConnected) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <NotConnectedState onConnect={() => {
        connectSocialAccounts().catch(() => navigate("/social-accounts"));
      }} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-normal text-foreground">Analytics</h1>
          <p className="text-xs text-muted-foreground">{selectedBrand?.name ?? "Selecione uma marca"}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 text-xs transition-colors",
                period === p.value
                  ? "bg-primary text-white"
                  : "bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPlatform(p.value)}
              className={cn(
                "px-3 py-1.5 text-xs transition-colors",
                platform === p.value
                  ? "bg-primary text-white"
                  : "bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || topPostsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPI Cards — followers da API, restante calculado dos posts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard icon={Users} label="Seguidores" value={data.summary.followers} />
            <KPICard icon={Eye} label="Alcance" value={postSummary.reach} />
            <KPICard icon={BarChart2} label="Impressões" value={postSummary.impressions} />
            <KPICard
              icon={TrendingUp}
              label="Engajamento"
              value={
                data.summary.followers > 0
                  ? ((postSummary.likes + postSummary.comments + postSummary.shares + postSummary.saves) / data.summary.followers) * 100
                  : 0
              }
              valueType="percent"
            />
          </div>

          {/* Chart — timeseries por data de publicação dos posts */}
          {postTimeseries.length > 0 && (
            <ReachChart timeseries={postTimeseries} />
          )}

          {/* Engagement details — calculado dos posts do período */}
          <EngagementDetails details={{
            likes:    postSummary.likes,
            comments: postSummary.comments,
            shares:   postSummary.shares,
            saves:    postSummary.saves,
          }} />

          {/* Visualizações por formato */}
          <ViewsByFormatCard posts={topPosts} />

          {/* Top posts — sempre todo o período, independente do filtro */}
          <TopPostsSection posts={topPosts} isLoading={false} />
        </>
      ) : null}
    </div>
  );
};

export default Analytics;
