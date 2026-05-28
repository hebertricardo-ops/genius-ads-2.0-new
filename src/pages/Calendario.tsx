import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBrandContext } from "@/contexts/BrandContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, getDay, getDaysInMonth, isToday, isSameDay, startOfWeek, addDays, addWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft, ChevronRight, Plus, Sparkles, Loader2, Filter,
  Instagram, Facebook, Pencil, Trash2, CalendarDays, X, CheckCircle2,
  LayoutGrid, CalendarRange,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocialPublish } from "@/hooks/useSocialPublish";
import { usePlan } from "@/hooks/usePlan";
import UpgradeDialog from "@/components/UpgradeDialog";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const STATUS_BORDER_COLOR: Record<string, string> = {
  idea:      "#9ca3af",
  draft:     "#8b5cf6",
  ready:     "#3b82f6",
  scheduled: "#f59e0b",
  published: "#22c55e",
};

const STATUS_CONFIG = {
  idea:      { label: "Ideia",      dot: "bg-muted-foreground", badge: "bg-muted/60 text-muted-foreground",       bar: "bg-muted-foreground/50" },
  draft:     { label: "Em criação", dot: "bg-purple-500",        badge: "bg-purple-500/10 text-purple-400",         bar: "bg-purple-500" },
  ready:     { label: "Pronto",     dot: "bg-blue-500",          badge: "bg-blue-500/10 text-blue-400",            bar: "bg-blue-500" },
  scheduled: { label: "Agendado",   dot: "bg-amber-500",         badge: "bg-amber-500/10 text-amber-500",          bar: "bg-amber-500" },
  published: { label: "Publicado",  dot: "bg-green-500",          badge: "bg-green-500/10 text-green-500",           bar: "bg-green-500" },
} as const;

type Status = keyof typeof STATUS_CONFIG;

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook",  label: "Facebook" },
  { value: "both",      label: "Instagram + Facebook" },
  { value: "tiktok",    label: "TikTok" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "post",      label: "Post" },
  { value: "carousel",  label: "Carrossel" },
  { value: "story",     label: "Story" },
  { value: "reel",      label: "Reel" },
];

const emptyForm = {
  title: "",
  description: "",
  scheduled_date: "",
  scheduled_time: "",
  publish_now: false,
  status: "idea" as Status,
  platform: "",
  content_type: "",
  creative_id: null as string | null,
  carousel_request_id: null as string | null,
  image_url: "",
  caption: "",
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === "instagram") return <Instagram className="w-2.5 h-2.5 text-muted-foreground/70" />;
  if (platform === "facebook") return <Facebook className="w-2.5 h-2.5 text-muted-foreground/70" />;
  if (platform === "both") return <><Instagram className="w-2.5 h-2.5 text-muted-foreground/70" /><Facebook className="w-2.5 h-2.5 text-muted-foreground/70" /></>;
  if (platform === "tiktok") return <span className="text-[10px]">🎵</span>;
  return <span className="text-[10px]">📱</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.idea;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded-full", cfg.badge)}>
      <span className={cn("w-1 h-1 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
};

const EventCard = ({ post, onClick }: { post: any; onClick: () => void }) => {
  const statusColor = STATUS_BORDER_COLOR[post.status] ?? "#9ca3af";
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg border-l-2 bg-background shadow-sm p-1.5 mb-1 cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderLeftColor: statusColor }}
      onClick={onClick}
    >
      {post.image_url ? (
        <img src={post.image_url} className="w-8 h-8 rounded object-cover flex-shrink-0" alt="" />
      ) : (
        <div
          className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: statusColor }}
        >
          {post.title?.charAt(0).toUpperCase() ?? "?"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {post.scheduled_time && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {post.scheduled_time.slice(0, 5)}
            </span>
          )}
          {post.platform && <PlatformIcon platform={post.platform} />}
        </div>
        <p className="text-[11px] font-medium truncate leading-tight">{post.title}</p>
        <StatusBadge status={post.status} />
      </div>
    </div>
  );
};

const Calendario = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { selectedBrand } = useBrandContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useSocialPublish();
  const { hasCalendar, isLoading: planLoading } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailPost, setDetailPost] = useState<any | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const syncedOnMount = useRef(false);


  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthStart = startOfMonth(currentDate);

  const calendarDays = useMemo(() => {
    const startWeekday = getDay(monthStart);
    const totalDays = getDaysInMonth(currentDate);
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ date: new Date(currentYear, currentMonth, -i), isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ date: new Date(currentYear, currentMonth, d), isCurrentMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(currentYear, currentMonth + 1, d), isCurrentMonth: false });
    }
    return cells;
  }, [currentYear, currentMonth]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  const currentLabel = useMemo(() => {
    if (viewMode === "week") {
      const s = weekDays[0];
      const e = weekDays[6];
      if (s.getMonth() === e.getMonth()) {
        return `${format(s, "d")}–${format(e, "d 'de' MMMM yyyy", { locale: ptBR })}`;
      }
      return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: ptBR });
  }, [viewMode, currentDate, weekDays]);

  const goToPrev = () => {
    if (viewMode === "week") setCurrentDate((d) => addWeeks(d, -1));
    else setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const goToNext = () => {
    if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const queryStart = viewMode === "week"
    ? format(weekDays[0], "yyyy-MM-dd")
    : format(calendarDays[0].date, "yyyy-MM-dd");
  const queryEnd = viewMode === "week"
    ? format(weekDays[6], "yyyy-MM-dd")
    : format(calendarDays[41].date, "yyyy-MM-dd");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["calendar-posts", queryStart, queryEnd, selectedBrand?.id],
    queryFn: async () => {
      const gridStart = queryStart;
      const gridEnd = queryEnd;

      let q = (supabase as any)
        .from("content_calendar")
        .select("*")
        .eq("user_id", user!.id)
        .gte("scheduled_date", gridStart)
        .lte("scheduled_date", gridEnd)
        .order("scheduled_date");

      if (selectedBrand?.id) q = q.eq("brand_id", selectedBrand.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Creatives for selector — fetched only when selector opens
  const { data: creatives = [], isLoading: loadingCreatives } = useQuery({
    queryKey: ["creatives-for-calendar", user?.id, selectedBrand?.id],
    queryFn: async () => {
      let q = (supabase as any)
        .from("generated_creatives")
        .select("id, image_url, copy_data, created_at, request_id, carousel_request_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (selectedBrand?.id) q = q.eq("brand_id", selectedBrand.id);
      const { data, error } = await q;
      if (error) throw error;
      // Deduplicate carousel slides — keep only first per carousel
      const seen = new Set<string>();
      return (data ?? []).filter((c: any) => {
        if (c.carousel_request_id) {
          if (seen.has(c.carousel_request_id)) return false;
          seen.add(c.carousel_request_id);
        }
        return true;
      }).slice(0, 20);
    },
    enabled: selectorOpen && !!user,
  });

  const filteredPosts = useMemo(
    () => (filterStatus === "all" ? posts : posts.filter((p: any) => p.status === filterStatus)),
    [posts, filterStatus],
  );

  const statCounts = useMemo(() => {
    const monthPosts = posts.filter((p: any) => {
      const d = new Date(p.scheduled_date + "T00:00:00");
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    return {
      idea:      monthPosts.filter((p: any) => p.status === "idea").length,
      draft:     monthPosts.filter((p: any) => p.status === "draft").length,
      ready:     monthPosts.filter((p: any) => p.status === "ready").length,
      scheduled: monthPosts.filter((p: any) => p.status === "scheduled").length,
      published: monthPosts.filter((p: any) => p.status === "published").length,
    };
  }, [posts, currentMonth, currentYear]);

  const postsForDay = (date: Date) =>
    filteredPosts.filter((p: any) => {
      const d = new Date(p.scheduled_date + "T00:00:00");
      return isSameDay(d, date);
    });

  const today = new Date().toISOString().split("T")[0];
  const hasPendingPosts = posts.some(
    (p: any) =>
      p.status === "scheduled" &&
      p.upload_post_request_id &&
      p.scheduled_date <= today,
  );

  const syncCalendarStatus = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data } = await supabase.functions.invoke("social-sync-calendar");
      if ((data?.updated ?? 0) > 0) {
        setUpdatedCount(data.updated);
        queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
        setTimeout(() => setUpdatedCount(0), 3000);
      }
    } catch {
      // falha silenciosa — não interromper o usuário com erro de polling
    } finally {
      setSyncing(false);
    }
  }, [syncing, queryClient]);

  // Sync na montagem se já há posts pendentes carregados
  useEffect(() => {
    if (hasPendingPosts && !syncedOnMount.current) {
      syncedOnMount.current = true;
      syncCalendarStatus();
    }
  }, [hasPendingPosts]);

  // Polling a cada 30s enquanto há posts pendentes
  useEffect(() => {
    if (!hasPendingPosts) return;
    const interval = setInterval(() => syncCalendarStatus(), 30_000);
    return () => clearInterval(interval);
  }, [hasPendingPosts]);

  const openNew = (date?: Date) => {
    setEditingPost(null);
    setForm({
      ...emptyForm,
      scheduled_date: date ? format(date, "yyyy-MM-dd") : "",
    });
    setDialogOpen(true);
  };

  const openEdit = (post: any) => {
    setDetailPost(null);
    setEditingPost(post);
    setForm({
      title: post.title,
      description: post.description ?? "",
      scheduled_date: post.scheduled_date,
      scheduled_time: post.scheduled_time ?? "",
      publish_now: false,
      status: post.status,
      platform: post.platform ?? "",
      content_type: post.content_type ?? "",
      creative_id: post.creative_id ?? null,
      carousel_request_id: post.carousel_request_id ?? null,
      image_url: post.image_url ?? "",
      caption: post.caption ?? "",
    });
    setDialogOpen(true);
  };

  // Abrir dialog pré-preenchido quando vindo da biblioteca com criativo selecionado
  useEffect(() => {
    const sc = (location.state as any)?.scheduleCreative;
    if (!sc) return;
    setEditingPost(null);
    setForm({
      ...emptyForm,
      title: sc.title ?? "",
      image_url: sc.image_url ?? "",
      caption: sc.caption ?? "",
      creative_id: sc.id ?? null,
      status: "scheduled" as Status,
    });
    setDialogOpen(true);
    window.history.replaceState({}, "");
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Preencha o título", variant: "destructive" });
      return;
    }
    if (!form.publish_now) {
      if (!form.scheduled_date) {
        toast({ title: "Informe a data de agendamento", variant: "destructive" });
        return;
      }
      if (form.scheduled_time) {
        const scheduledDt = new Date(`${form.scheduled_date}T${form.scheduled_time}:00`);
        if (scheduledDt <= new Date()) {
          toast({ title: "Selecione uma data e hora futuras", variant: "destructive" });
          return;
        }
      }
    }

    setSaving(true);
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const payload = {
        user_id: user!.id,
        brand_id: selectedBrand?.id ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_date: form.publish_now ? todayDate : form.scheduled_date,
        scheduled_time: form.publish_now ? null : (form.scheduled_time || null),
        status: form.publish_now ? "scheduled" : form.status,
        platform: form.platform || null,
        content_type: form.content_type || null,
        creative_id: form.creative_id ?? null,
        carousel_request_id: form.carousel_request_id ?? null,
        image_url: form.image_url || null,
        caption: form.caption || null,
      };

      let savedId: string;
      if (editingPost) {
        const { data, error } = await (supabase as any)
          .from("content_calendar")
          .update(payload)
          .eq("id", editingPost.id)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      } else {
        const { data, error } = await (supabase as any)
          .from("content_calendar")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      // Publicar nas redes sociais se aplicável
      const shouldPublish =
        isConnected &&
        (form.publish_now || form.status === "scheduled") &&
        form.image_url &&
        form.platform;

      if (shouldPublish) {
        const platforms =
          form.platform === "both" ? ["instagram", "facebook"] : [form.platform];
        const scheduledFor =
          form.publish_now || !form.scheduled_time
            ? null
            : `${form.scheduled_date}T${form.scheduled_time}:00`;

        await supabase.functions.invoke("social-publish", {
          body: {
            calendar_entry_id: savedId,
            creative_id: form.creative_id,
            brand_id: selectedBrand?.id,
            image_url: form.image_url,
            caption: form.caption || form.description || "",
            platforms,
            title: form.title,
            scheduled_for: scheduledFor,
          },
        });

        const dateLabel = form.scheduled_date
          ? format(new Date(`${form.scheduled_date}T00:00:00`), "dd 'de' MMMM", { locale: ptBR })
          : "";

        toast({
          title: form.publish_now
            ? "Post enviado para publicação! 🎉"
            : `Post agendado para ${dateLabel}${form.scheduled_time ? ` às ${form.scheduled_time}` : ""} ✅`,
        });

        // Para posts imediatos, aguardar processamento e sincronizar
        if (form.publish_now) {
          setTimeout(() => syncCalendarStatus(), 5000);
        }
      } else {
        toast({ title: editingPost ? "Postagem atualizada!" : "Postagem salva no calendário" });
      }

      queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("content_calendar")
        .delete()
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
      setDetailPost(null);
      toast({ title: "Postagem removida." });
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  if (!planLoading && !hasCalendar) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
            <CalendarDays className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display text-foreground mb-2">Calendário de Postagens</h1>
          <p className="text-muted-foreground mb-6">
            O calendário editorial está disponível nos planos Advanced e Social Media.
            Atualize seu plano para agendar e organizar suas publicações.
          </p>
          <button
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver planos disponíveis
          </button>
        </div>
        <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="calendar" />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-display text-foreground">Calendário de Postagens</h1>
            {syncing && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Verificando posts...
              </span>
            )}
            {!syncing && updatedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {updatedCount} {updatedCount === 1 ? "post atualizado" : "posts atualizados"}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Planeje, agende e post seus conteúdos automaticamente</p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 gradient-card border border-border rounded-xl p-1 shadow-card">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === "month"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Mês
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                viewMode === "week"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Semana
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 gradient-card border border-border rounded-xl px-3 py-2 shadow-card">
            <button
              onClick={goToPrev}
              className="p-1 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-foreground capitalize w-44 text-center">
              {currentLabel}
            </span>
            <button
              onClick={goToNext}
              className="p-1 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button variant="hero" onClick={() => openNew()}>
            <Plus className="w-4 h-4" />
            Nova Postagem
          </Button>
        </div>
      </div>

      {/* Stats bar + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 animate-fade-in">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setFilterStatus("all")}
            className={cn("flex items-center gap-1.5 text-xs transition-colors", filterStatus === "all" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {statCounts.idea} ideia{statCounts.idea !== 1 ? "s" : ""}
          </button>
          {(["draft", "ready", "scheduled", "published"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={cn("flex items-center gap-1.5 text-xs transition-colors", filterStatus === s ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              <span className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[s].dot)} />
              {statCounts[s]} {STATUS_CONFIG[s].label.toLowerCase()}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              {filterStatus === "all" ? "Todos" : STATUS_CONFIG[filterStatus as Status]?.label ?? "Filtrar"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterStatus("all")}>Todos</DropdownMenuItem>
            {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setFilterStatus(s)}>
                <span className={cn("w-2 h-2 rounded-full mr-2", STATUS_CONFIG[s].dot)} />
                {STATUS_CONFIG[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* IA suggestion banner */}
      <div className="mb-5 animate-fade-in">
        <div
          className="flex items-center gap-4 gradient-card border border-primary/30 rounded-2xl px-5 py-4 shadow-card cursor-pointer hover:border-primary/60 transition-colors"
          onClick={() => toast({ title: "Em breve!", description: "Recomendações de pauta com IA estarão disponíveis em breve." })}
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-display text-foreground">Recomendações de Post com IA</p>
            <p className="text-xs text-muted-foreground">Gere sugestões de conteúdo alinhadas à sua marca e ao seu calendário</p>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="gradient-card rounded-2xl border border-border shadow-card overflow-hidden animate-fade-in">

        {/* ── Month view ── */}
        {viewMode === "month" && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className={cn(
                    "py-3 text-center text-xs font-medium tracking-wide",
                    day === "DOM" || day === "SÁB" ? "text-muted-foreground/60" : "text-muted-foreground",
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(100px, auto)" }}>
                {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                  const dayPosts = postsForDay(date);
                  const todayCell = isToday(date);
                  const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                  const visible = dayPosts.slice(0, 3);
                  const overflow = dayPosts.length - visible.length;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "border-b border-r border-border p-1.5 min-h-[100px] transition-colors group",
                        !isCurrentMonth && "bg-muted/10",
                        isWeekend && isCurrentMonth && "bg-muted/5",
                        "hover:bg-muted/20 cursor-pointer",
                        idx % 7 === 6 && "border-r-0",
                        idx >= 35 && "border-b-0",
                      )}
                      onClick={() => openNew(date)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-colors",
                            todayCell && "bg-primary text-white",
                            !todayCell && isCurrentMonth && (isWeekend ? "text-muted-foreground/60" : "text-foreground"),
                            !todayCell && !isCurrentMonth && "text-muted-foreground/30",
                          )}
                        >
                          {date.getDate()}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openNew(date); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        {visible.map((post: any) => (
                          <EventCard
                            key={post.id}
                            post={post}
                            onClick={(e: any) => { e?.stopPropagation?.(); setDetailPost(post); }}
                          />
                        ))}
                        {overflow > 0 && (
                          <span className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary px-1">
                            +{overflow} mais
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Week view ── */}
        {viewMode === "week" && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map((day) => {
                const isWkToday = isToday(day);
                const isWkWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "py-3 text-center border-r border-border last:border-r-0",
                      isWkWeekend && "bg-muted/5",
                    )}
                  >
                    <p className={cn(
                      "text-xs font-medium tracking-wide",
                      isWkWeekend ? "text-muted-foreground/60" : "text-muted-foreground",
                    )}>
                      {WEEK_DAYS[day.getDay()]}
                    </p>
                    <span className={cn(
                      "mt-1.5 w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold mx-auto transition-colors",
                      isWkToday ? "bg-primary text-white" : "text-foreground",
                    )}>
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7" style={{ minHeight: 480 }}>
                {weekDays.map((day) => {
                  const dayPosts = postsForDay(day);
                  const isWkToday = isToday(day);
                  const isWkWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "border-r border-border last:border-r-0 p-2 group cursor-pointer transition-colors",
                        isWkWeekend && "bg-muted/5",
                        isWkToday && "bg-primary/[0.03]",
                        "hover:bg-muted/20",
                      )}
                      onClick={() => openNew(day)}
                    >
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openNew(day); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        {dayPosts.slice(0, 3).map((post: any) => (
                          <EventCard
                            key={post.id}
                            post={post}
                            onClick={(e: any) => { e?.stopPropagation?.(); setDetailPost(post); }}
                          />
                        ))}
                        {dayPosts.length > 3 && (
                          <span className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary px-1">
                            +{dayPosts.length - 3} mais
                          </span>
                        )}
                        {dayPosts.length === 0 && (
                          <p className="text-[10px] text-muted-foreground/30 text-center pt-4">—</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Dialog: Nova / Editar Postagem ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="font-display font-normal">
              {editingPost ? "Editar Postagem" : "Nova Postagem"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Título */}
            <div>
              <Label htmlFor="cal-title" className="text-muted-foreground text-xs mb-1.5 block">Título *</Label>
              <Input
                id="cal-title"
                placeholder="Ex: Post de lançamento do produto"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="cal-desc" className="text-muted-foreground text-xs mb-1.5 block">Descrição</Label>
              <Textarea
                id="cal-desc"
                placeholder="Notas sobre o conteúdo..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="resize-none"
              />
            </div>

            {/* Quando publicar */}
            <div>
              <Label className="text-muted-foreground text-xs mb-2 block">Quando publicar</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pub-when"
                    checked={form.publish_now}
                    onChange={() => setForm((f) => ({ ...f, publish_now: true, status: "scheduled" }))}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">Publicar agora</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pub-when"
                    checked={!form.publish_now}
                    onChange={() => setForm((f) => ({ ...f, publish_now: false }))}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">Agendar para...</span>
                </label>
              </div>

              {/* Aviso se publish_now e não conectado */}
              {form.publish_now && !isConnected && (
                <p className="mt-2 text-xs text-amber-500 flex items-start gap-1.5">
                  <span className="shrink-0">⚠️</span>
                  <span>
                    Conecte suas redes em{" "}
                    <button
                      type="button"
                      onClick={() => { setDialogOpen(false); navigate("/social-accounts"); }}
                      className="underline hover:text-amber-400 transition-colors"
                    >
                      Redes Sociais
                    </button>{" "}
                    para publicar diretamente.
                  </span>
                </p>
              )}

              {/* Data + hora quando não é "publicar agora" */}
              {!form.publish_now && (
                <div className="flex gap-2 mt-3">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={form.scheduled_date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-28">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      placeholder="HH"
                      value={form.scheduled_time ? form.scheduled_time.split(":")[0] : ""}
                      onChange={(e) => {
                        const h = Math.min(23, Math.max(0, Number(e.target.value))).toString().padStart(2, "0");
                        const m = form.scheduled_time ? form.scheduled_time.split(":")[1] ?? "00" : "00";
                        setForm((f) => ({ ...f, scheduled_time: `${h}:${m}` }));
                      }}
                      className="w-12 text-center rounded-md border border-input bg-background px-1 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-muted-foreground font-medium">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="MM"
                      value={form.scheduled_time ? form.scheduled_time.split(":")[1] ?? "" : ""}
                      onChange={(e) => {
                        const h = form.scheduled_time ? form.scheduled_time.split(":")[0] ?? "00" : "00";
                        const m = Math.min(59, Math.max(0, Number(e.target.value))).toString().padStart(2, "0");
                        setForm((f) => ({ ...f, scheduled_time: `${h}:${m}` }));
                      }}
                      className="w-12 text-center rounded-md border border-input bg-background px-1 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status — só visível quando não é "publicar agora" */}
            {!form.publish_now && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs mb-1.5 block">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[s].dot)} />
                            {STATUS_CONFIG[s].label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div /> {/* Spacer para manter grid */}
              </div>
            )}

            {/* Plataforma + Tipo de conteúdo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground text-xs mb-1.5 block">Plataforma</Label>
                <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs mb-1.5 block">Tipo de conteúdo</Label>
                <Select value={form.content_type} onValueChange={(v) => setForm((f) => ({ ...f, content_type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Criativo */}
            <div>
              <Label className="text-muted-foreground text-xs mb-1.5 block">Criativo (opcional)</Label>
              {form.image_url ? (
                <div
                  className="rounded-xl border border-border bg-muted/20 p-3"
                  style={{ display: "grid", gridTemplateColumns: "56px 1fr 32px", gap: "12px", alignItems: "center", width: "100%", boxSizing: "border-box" }}
                >
                  <img
                    src={form.image_url}
                    alt="Criativo selecionado"
                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, display: "block", flexShrink: 0 }}
                    className="border border-border"
                  />
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <p className="text-xs font-medium text-foreground truncate">Criativo vinculado</p>
                    {form.caption && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {form.caption.slice(0, 80)}{form.caption.length > 80 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => setForm((f) => ({
                      ...f,
                      creative_id: null,
                      carousel_request_id: null,
                      image_url: "",
                      caption: "",
                    }))}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectorOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Selecionar criativo gerado
                </button>
              )}
            </div>

            {/* Legenda */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="cal-caption" className="text-muted-foreground text-xs">Legenda do post</Label>
                <span className={cn(
                  "text-xs tabular-nums",
                  form.caption.length > 1980 ? "text-destructive" : "text-muted-foreground",
                )}>
                  {form.caption.length}/2200
                </span>
              </div>
              <Textarea
                id="cal-caption"
                placeholder="Escreva a legenda que será publicada nas redes sociais..."
                rows={4}
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value.slice(0, 2200) }))}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving
                ? "Salvando..."
                : editingPost ? "Salvar alterações" : "Criar postagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Seletor de criativo ── */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-normal">Selecionar criativo</DialogTitle>
          </DialogHeader>
          {loadingCreatives ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : creatives.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Nenhum criativo gerado{selectedBrand ? " para esta marca" : ""} ainda.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-h-[420px] overflow-y-auto py-1 pr-1">
              {creatives.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const copy = c.copy_data ?? {};
                    setForm((f) => ({
                      ...f,
                      creative_id: c.id,
                      carousel_request_id: c.carousel_request_id ?? null,
                      image_url: c.image_url,
                      caption: copy.caption ?? copy.body ?? "",
                      title: f.title || copy.headline || f.title,
                    }));
                    setSelectorOpen(false);
                  }}
                  className="group relative rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-colors"
                  style={{ width: "100%", height: "200px" }}
                >
                  <img
                    src={c.image_url}
                    alt="Criativo"
                    style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalhe de postagem ── */}
      <Dialog open={!!detailPost} onOpenChange={(open) => { if (!open) setDetailPost(null); }}>
        <DialogContent className="sm:max-w-sm">
          {detailPost && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display font-normal text-base leading-snug pr-6">
                  {detailPost.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  STATUS_CONFIG[detailPost.status as Status]?.badge,
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CONFIG[detailPost.status as Status]?.dot)} />
                  {STATUS_CONFIG[detailPost.status as Status]?.label}
                </span>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4" />
                  {format(new Date(detailPost.scheduled_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {detailPost.scheduled_time && (
                    <span className="ml-1">às {detailPost.scheduled_time.slice(0, 5)}</span>
                  )}
                </div>

                {(detailPost.platform || detailPost.content_type) && (
                  <div className="flex flex-wrap gap-2">
                    {detailPost.platform && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                        {detailPost.platform === "instagram" && <Instagram className="w-3 h-3" />}
                        {detailPost.platform === "facebook" && <Facebook className="w-3 h-3" />}
                        {PLATFORM_OPTIONS.find((p) => p.value === detailPost.platform)?.label}
                      </span>
                    )}
                    {detailPost.content_type && (
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                        {CONTENT_TYPE_OPTIONS.find((c) => c.value === detailPost.content_type)?.label}
                      </span>
                    )}
                  </div>
                )}

                {detailPost.image_url && (
                  <img
                    src={detailPost.image_url}
                    alt="Criativo"
                    className="w-full rounded-xl object-cover border border-border max-h-48"
                  />
                )}

                {detailPost.description && (
                  <p className="text-sm text-muted-foreground">{detailPost.description}</p>
                )}
              </div>

              <DialogFooter className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 flex-1"
                  onClick={() => handleDelete(detailPost.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(detailPost)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendario;
