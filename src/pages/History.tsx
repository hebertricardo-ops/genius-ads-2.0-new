import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useBrandContext } from "@/contexts/BrandContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Image, Download, Clock, Loader2, RefreshCw, Layers,
  Copy, Trash2, ChevronLeft, ChevronRight, Check,
  MessageSquare, LayoutGrid, Sparkles, Smile, MoreHorizontal, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocialPublish } from "@/hooks/useSocialPublish";
import { usePlan } from "@/hooks/usePlan";
import UpgradeDialog from "@/components/UpgradeDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import GenerationProgress from "@/components/GenerationProgress";

const EMOJI_LIST = [
  "😀","😊","🥰","😍","🤩","😂","🤣","😅","😆","🥺","😭","😢","😤","🤯","😱",
  "🤔","🫡","🤫","😎","🥳","🎉","🎊","🎯","🎨","🎬","🎤","🎵","🎶","📸","🖼️",
  "🚀","✨","💫","⭐","🌟","🔥","💡","💎","👑","🏆","🥇","🎖️","🏅","💯","✅",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","❤️‍🔥","💕","💞","💓","💗","💖","🫶",
  "👍","👏","🙌","🤝","💪","👊","🤌","✌️","🤞","🙏","👆","👇","👈","👉","🖐️",
  "💰","💳","🛒","📱","💻","🌈","🌸","🌺","🍀","🌱","🌍","⚡","🔑","📌","💬",
];

type CreativeItem = {
  id: string;
  image_url: string;
  created_at: string;
  request_id: string | null;
  carousel_request_id: string | null;
  copy_data: any;
  credits_used: number;
  brand_id: string | null;
};

type DisplayItem =
  | { type: "creative"; item: CreativeItem }
  | { type: "carousel"; requestId: string; slides: CreativeItem[]; cover: CreativeItem };

const FORMATS = [
  { value: "1:1", label: "1:1", desc: "Feed" },
  { value: "4:5", label: "4:5", desc: "Feed vertical" },
  { value: "9:16", label: "9:16", desc: "Stories / Reels" },
  { value: "16:9", label: "16:9", desc: "Landscape" },
];

const History = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { selectedBrand } = useBrandContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isConnected } = useSocialPublish();
  const { hasSocialMedia } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [selectedCreative, setSelectedCreative] = useState<CreativeItem | null>(null);
  const [selectedCarousel, setSelectedCarousel] = useState<{ requestId: string; slides: CreativeItem[] } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "creative" | "carousel"; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Caption editing
  const [editedCaption, setEditedCaption] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [captionSaving, setCaptionSaving] = useState(false);
  const [captionSaved, setCaptionSaved] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postTarget, setPostTarget] = useState<{
    image_url: string; caption: string; title: string;
    creative_id?: string; brand_id?: string | null;
  } | null>(null);
  const [postPlatform, setPostPlatform] = useState("instagram");
  const [posting, setPosting] = useState(false);

  // Carousel caption state (independent from creative caption)
  const [carouselEditedCaption, setCarouselEditedCaption] = useState<string | null>(null);
  const [carouselCaptionCopied, setCarouselCaptionCopied] = useState(false);
  const [carouselCaptionSaving, setCarouselCaptionSaving] = useState(false);
  const [carouselCaptionSaved, setCarouselCaptionSaved] = useState(false);
  const [generatingCarouselCaption, setGeneratingCarouselCaption] = useState(false);
  const [carouselEmojiPickerOpen, setCarouselEmojiPickerOpen] = useState(false);
  const carouselCaptionRef = useRef<HTMLTextAreaElement>(null);
  const carouselCursorPosRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Adapt format
  const [adaptFormatOpen, setAdaptFormatOpen] = useState(false);
  const [adaptFormat, setAdaptFormat] = useState("1:1");
  const [adaptingFormat, setAdaptingFormat] = useState(false);

  useEffect(() => {
    setEditedCaption(null);
    setCaptionCopied(false);
    setCaptionSaved(false);
    setGeneratingCaption(false);
    setEmojiPickerOpen(false);
  }, [selectedCreative?.id]);

  useEffect(() => {
    setCarouselEditedCaption(null);
    setCarouselCaptionCopied(false);
    setCarouselCaptionSaved(false);
    setGeneratingCarouselCaption(false);
    setCarouselEmojiPickerOpen(false);
  }, [selectedCarousel?.requestId]);

  const { data: allCreatives = [], isLoading: loadingCreatives } = useQuery({
    queryKey: ["gallery-creatives", user?.id, selectedBrand?.id],
    queryFn: async () => {
      let q = supabase
        .from("generated_creatives")
        .select("*")
        .order("created_at", { ascending: false });
      if (selectedBrand) q = q.eq("brand_id", selectedBrand.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as CreativeItem[];
    },
    enabled: !!user,
  });

  const { data: creativeRequests = [] } = useQuery({
    queryKey: ["all-creative-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("creative_requests").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: carouselRequests = [] } = useQuery({
    queryKey: ["all-carousel-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("carousel_requests").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const creativeRequestsMap = useMemo(() => {
    const map: Record<string, (typeof creativeRequests)[0]> = {};
    for (const r of creativeRequests) map[r.id] = r;
    return map;
  }, [creativeRequests]);

  const carouselRequestsMap = useMemo(() => {
    const map: Record<string, (typeof carouselRequests)[0]> = {};
    for (const r of carouselRequests) map[r.id] = r;
    return map;
  }, [carouselRequests]);

  // Group carousel slides into single display items
  const displayItems = useMemo((): DisplayItem[] => {
    const seenCarousels = new Set<string>();
    const result: DisplayItem[] = [];
    for (const creative of allCreatives) {
      if (creative.carousel_request_id) {
        if (!seenCarousels.has(creative.carousel_request_id)) {
          seenCarousels.add(creative.carousel_request_id);
          const slides = allCreatives
            .filter(c => c.carousel_request_id === creative.carousel_request_id)
            .sort((a, b) =>
              ((a.copy_data as any)?.slide_number ?? 0) - ((b.copy_data as any)?.slide_number ?? 0)
            );
          const cover = slides[0] ?? creative;
          result.push({ type: "carousel", requestId: creative.carousel_request_id, slides, cover });
        }
      } else {
        result.push({ type: "creative", item: creative });
      }
    }
    return result;
  }, [allCreatives]);

  // For detail dialog navigation (singles only)
  const singleCreatives = useMemo(
    () => allCreatives.filter(c => !c.carousel_request_id),
    [allCreatives]
  );
  const selectedIndex = selectedCreative ? singleCreatives.findIndex(c => c.id === selectedCreative.id) : -1;
  const goToPrev = () => { if (selectedIndex > 0) setSelectedCreative(singleCreatives[selectedIndex - 1]); };
  const goToNext = () => { if (selectedIndex < singleCreatives.length - 1) setSelectedCreative(singleCreatives[selectedIndex + 1]); };

  const getRequestInfo = useCallback((creative: CreativeItem) => {
    if (creative.request_id && creativeRequestsMap[creative.request_id]) {
      const req = creativeRequestsMap[creative.request_id];
      return { type: "creative" as const, name: req.product_name, request: req };
    }
    if (creative.carousel_request_id && carouselRequestsMap[creative.carousel_request_id]) {
      const req = carouselRequestsMap[creative.carousel_request_id];
      return { type: "carousel" as const, name: req.product_name, request: req };
    }
    return null;
  }, [creativeRequestsMap, carouselRequestsMap]);

  const originalCaption: string = (selectedCreative?.copy_data as any)?.caption || "";
  const captionValue = editedCaption !== null ? editedCaption : originalCaption;
  const captionChanged = editedCaption !== null && editedCaption !== originalCaption;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captionValue);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleGenerateCaption = async () => {
    if (!selectedCreative) return;
    const info = getRequestInfo(selectedCreative);
    const copyData = selectedCreative.copy_data as any;
    setGeneratingCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          product_name: info?.name ?? "",
          headline: copyData?.headline ?? "",
          body: copyData?.body ?? "",
          cta: copyData?.cta ?? info?.request?.cta ?? "",
          benefits: info?.request?.benefits ?? "",
          pains: info?.request?.pains ?? "",
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setEditedCaption(data.caption ?? "");
    } catch (e: any) {
      toast({ title: "Erro ao gerar legenda", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingCaption(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const current = captionValue;
    const { start, end } = cursorPosRef.current;
    const next = current.slice(0, start) + emoji + current.slice(end);
    setEditedCaption(next);
    cursorPosRef.current = { start: start + emoji.length, end: start + emoji.length };
    setEmojiPickerOpen(false);
    setTimeout(() => {
      if (captionRef.current) {
        captionRef.current.focus();
        captionRef.current.setSelectionRange(start + emoji.length, start + emoji.length);
      }
    }, 0);
  };

  // ── Carousel caption helpers ──
  const carouselOriginalCaption: string =
    (selectedCarousel?.slides[0]?.copy_data as any)?.carousel_caption ?? "";
  const carouselCaptionValue =
    carouselEditedCaption !== null ? carouselEditedCaption : carouselOriginalCaption;
  const carouselCaptionChanged =
    carouselEditedCaption !== null && carouselEditedCaption !== carouselOriginalCaption;

  const handleCopyCarouselCaption = async () => {
    try {
      await navigator.clipboard.writeText(carouselCaptionValue);
      setCarouselCaptionCopied(true);
      setTimeout(() => setCarouselCaptionCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleSaveCarouselCaption = async () => {
    if (!selectedCarousel || carouselEditedCaption === null) return;
    setCarouselCaptionSaving(true);
    try {
      const firstSlide = selectedCarousel.slides[0];
      const copyData = (firstSlide?.copy_data as any) || {};
      await (supabase as any)
        .from("generated_creatives")
        .update({ copy_data: { ...copyData, carousel_caption: carouselEditedCaption } })
        .eq("id", firstSlide.id);
      setCarouselEditedCaption(null);
      setCarouselCaptionSaved(true);
      setTimeout(() => setCarouselCaptionSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["gallery-creatives"] });
    } catch (e: any) {
      toast({ title: "Erro ao salvar legenda", description: e.message, variant: "destructive" });
    } finally {
      setCarouselCaptionSaving(false);
    }
  };

  const handleGenerateCarouselCaption = async () => {
    if (!selectedCarousel) return;
    const req = carouselRequestsMap[selectedCarousel.requestId];
    const firstSlide = selectedCarousel.slides[0];
    const firstCopy = (firstSlide?.copy_data as any) || {};
    setGeneratingCarouselCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          product_name: req?.product_name ?? "",
          headline: firstCopy?.headline ?? "",
          body: req?.main_promise ?? "",
          cta: req?.carousel_objective ?? "",
          benefits: req?.benefits ?? "",
          pains: req?.pain_points ?? "",
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setCarouselEditedCaption(data.caption ?? "");
    } catch (e: any) {
      toast({ title: "Erro ao gerar legenda", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingCarouselCaption(false);
    }
  };

  const insertCarouselEmoji = (emoji: string) => {
    const current = carouselCaptionValue;
    const { start, end } = carouselCursorPosRef.current;
    const next = current.slice(0, start) + emoji + current.slice(end);
    setCarouselEditedCaption(next);
    carouselCursorPosRef.current = { start: start + emoji.length, end: start + emoji.length };
    setCarouselEmojiPickerOpen(false);
    setTimeout(() => {
      if (carouselCaptionRef.current) {
        carouselCaptionRef.current.focus();
        carouselCaptionRef.current.setSelectionRange(start + emoji.length, start + emoji.length);
      }
    }, 0);
  };

  const handleSaveCaption = async () => {
    if (!selectedCreative || editedCaption === null) return;
    setCaptionSaving(true);
    try {
      const copyData = (selectedCreative.copy_data as any) || {};
      await (supabase as any).from("generated_creatives").update({
        copy_data: { ...copyData, caption: editedCaption },
      }).eq("id", selectedCreative.id);
      setSelectedCreative(prev =>
        prev ? { ...prev, copy_data: { ...((prev.copy_data as any) || {}), caption: editedCaption } } : prev
      );
      setEditedCaption(null);
      setCaptionSaved(true);
      setTimeout(() => setCaptionSaved(false), 2000);
    } catch (e: any) {
      toast({ title: "Erro ao salvar legenda", description: e.message, variant: "destructive" });
    } finally {
      setCaptionSaving(false);
    }
  };

  const openPostDialog = (imageUrl: string, caption: string, title: string, creativeId?: string, brandId?: string | null) => {
    if (!hasSocialMedia) {
      setUpgradeOpen(true);
      return;
    }
    if (!isConnected) {
      navigate("/social-accounts");
      return;
    }
    setPostTarget({ image_url: imageUrl, caption, title, creative_id: creativeId, brand_id: brandId });
    setPostPlatform("instagram");
    setPostDialogOpen(true);
  };

  const handlePost = async () => {
    if (!postTarget) return;
    setPosting(true);
    try {
      const platforms = postTarget ? (postPlatform === "both" ? ["instagram", "facebook"] : [postPlatform]) : [];
      const { data, error } = await supabase.functions.invoke("social-publish", {
        body: {
          creative_id: postTarget.creative_id,
          brand_id: postTarget.brand_id,
          image_url: postTarget.image_url,
          caption: postTarget.caption,
          platforms,
          title: postTarget.title,
          scheduled_for: null,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Post enviado para publicação!" });
      setPostDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleAdaptFormat = async () => {
    if (!selectedCreative || !user) return;
    const info = getRequestInfo(selectedCreative);
    if (!info || info.type !== "creative") return;

    if ((credits?.credits_balance ?? 0) < 1) {
      toast({ title: "Créditos insuficientes", description: "Você precisa de pelo menos 1 crédito para adaptar o formato.", variant: "destructive" });
      return;
    }

    setAdaptingFormat(true);
    try {
      const copyData = (selectedCreative.copy_data as any) || {};
      const req = info.request;
      const visualOption = copyData.visual_option && typeof copyData.visual_option === "object"
        ? copyData.visual_option
        : {
            visual_description: typeof copyData.visual_option === "string" ? copyData.visual_option : "",
            element_distribution: "",
            composition: "",
            visual_hierarchy: "",
            layout_style: "",
            cta_highlight: "",
          };

      const { data: creativeData, error } = await supabase.functions.invoke("generate-creative", {
        body: {
          image_urls: [selectedCreative.image_url],
          product_name: req.product_name,
          promise: req.promise || "",
          pains: req.pains || "",
          benefits: req.benefits || "",
          objections: req.objections || null,
          headline: copyData.headline || "",
          body: copyData.body || "",
          cta: copyData.cta || req.cta || "",
          visual_option: visualOption,
          format: adaptFormat,
          quantity: 1,
          model: "gpt-image-2",
        },
      });
      if (error) throw new Error(error.message);

      const generatedImages = creativeData?.images || [];
      const newCaption: string = creativeData?.caption || originalCaption;

      for (const img of generatedImages) {
        const imgUrl = img.url || img;
        await (supabase as any).from("generated_creatives").insert({
          user_id: user.id,
          image_url: imgUrl,
          request_id: selectedCreative.request_id,
          brand_id: selectedCreative.brand_id,
          copy_data: { ...copyData, format: adaptFormat, caption: newCaption },
          credits_used: 1,
        });
      }

      const usedCredits = generatedImages.length || 1;
      const { data: freshCredits } = await supabase
        .from("user_credits")
        .select("credits_balance, credits_used")
        .eq("user_id", user.id)
        .single();

      if (freshCredits && freshCredits.credits_balance >= usedCredits) {
        await supabase.from("user_credits").update({
          credits_balance: freshCredits.credits_balance - usedCredits,
          credits_used: freshCredits.credits_used + usedCredits,
        }).eq("user_id", user.id);
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "usage",
          amount: -usedCredits,
          description: `Adaptação de formato: ${req.product_name} (${adaptFormat})`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["gallery-creatives"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      toast({ title: "Formato adaptado!", description: `Criativo em ${adaptFormat} gerado e salvo no histórico.` });
      setAdaptFormatOpen(false);
      setSelectedCreative(null);
    } catch (err: any) {
      toast({ title: "Erro ao adaptar formato", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setAdaptingFormat(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleRegenerate = (creative: CreativeItem) => {
    const info = getRequestInfo(creative);
    if (!info) return;
    if (info.type === "creative") {
      const req = info.request;
      navigate("/regenerate", {
        state: {
          prefill: {
            product_name: req.product_name,
            promise: req.promise,
            pains: req.pains,
            benefits: req.benefits,
            objections: req.objections || "",
            cta: req.cta || "",
            quantity: req.quantity,
          },
        },
      });
    } else {
      const req = info.request;
      navigate("/create-carousel", {
        state: {
          prefill: {
            product_name: req.product_name,
            main_promise: req.main_promise,
            pain_points: req.pain_points,
            benefits: req.benefits,
            objections: req.objections || "",
            carousel_objective: req.carousel_objective,
            creative_style: req.creative_style || "",
            extra_context: req.extra_context || "",
            slides_count: req.slides_count,
          },
        },
      });
    }
    setSelectedCreative(null);
    setSelectedCarousel(null);
  };

  const confirmDelete = (creative: CreativeItem) => {
    const info = getRequestInfo(creative);
    if (!info) return;
    setDeleteTarget({
      id: info.type === "creative" ? creative.request_id! : creative.carousel_request_id!,
      type: info.type,
      name: info.name,
    });
    setSelectedCreative(null);
  };

  const confirmCarouselDelete = (requestId: string) => {
    const req = carouselRequestsMap[requestId];
    setDeleteTarget({ id: requestId, type: "carousel", name: req?.product_name || "Carrossel" });
    setSelectedCarousel(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "creative") {
        await supabase.from("generated_creatives").delete().eq("request_id", deleteTarget.id);
        const { error } = await supabase.from("creative_requests").delete().eq("id", deleteTarget.id);
        if (error) throw error;
      } else {
        await supabase.from("generated_creatives").delete().eq("carousel_request_id", deleteTarget.id);
        const { error } = await supabase.from("carousel_requests").delete().eq("id", deleteTarget.id);
        if (error) throw error;
      }
      toast({ title: "Excluído com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["gallery-creatives"] });
      queryClient.invalidateQueries({ queryKey: ["all-creative-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-carousel-requests"] });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loadingCreatives) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display text-foreground mb-2">
          Biblioteca{selectedBrand ? ` — ${selectedBrand.name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {selectedBrand
            ? `Criativos gerados para ${selectedBrand.name}. Clique em qualquer imagem para ver detalhes.`
            : "Selecione uma marca no menu lateral para filtrar os criativos."}
        </p>
      </div>

      {displayItems.length === 0 ? (
        <div className="gradient-card rounded-2xl border border-border p-12 text-center animate-fade-in">
          <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-display text-foreground mb-2">Nenhum criativo gerado ainda</h2>
          <p className="text-muted-foreground mb-6">Comece criando seu primeiro criativo com IA.</p>
          <Button variant="hero" onClick={() => navigate("/create")}>
            Criar Primeiro Criativo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-fade-in">
          {displayItems.map((displayItem) => {
            if (displayItem.type === "carousel") {
              const req = carouselRequestsMap[displayItem.requestId];
              return (
                <div
                  key={`carousel-${displayItem.requestId}`}
                  className="group relative rounded-xl overflow-hidden border border-border bg-secondary/30 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:scale-[1.02]"
                  onClick={() => setSelectedCarousel({ requestId: displayItem.requestId, slides: displayItem.slides })}
                >
                  <img
                    src={displayItem.cover.image_url}
                    alt="Carrossel"
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-medium backdrop-blur-sm">
                      <Layers className="w-2.5 h-2.5" /> {displayItem.slides.length} slides
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-foreground font-medium truncate block">
                      {req?.product_name || "Carrossel"}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(displayItem.cover.created_at), "dd/MM/yy")}
                    </div>
                  </div>
                </div>
              );
            }

            // Single creative
            const { item: creative } = displayItem;
            const info = getRequestInfo(creative);
            return (
              <div
                key={creative.id}
                className="group relative rounded-xl overflow-hidden border border-border bg-secondary/30 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:scale-[1.02]"
                onClick={() => setSelectedCreative(creative)}
              >
                <img
                  src={creative.image_url}
                  alt="Criativo"
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-foreground font-medium truncate block">
                    {info?.name || "Criativo"}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {format(new Date(creative.created_at), "dd/MM/yy")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creative Detail Dialog */}
      <Dialog open={!!selectedCreative} onOpenChange={(open) => !open && setSelectedCreative(null)}>
        <DialogContent className="max-w-xl p-0 max-h-[92vh] overflow-y-auto">
          {selectedCreative && (() => {
            const info = getRequestInfo(selectedCreative);
            const copyData = selectedCreative.copy_data as any;
            const headline: string = copyData?.headline || info?.name || "";

            return (
              <div className="flex flex-col">
                {/* Image */}
                <div className="relative bg-secondary/30 flex items-center justify-center">
                  <img
                    src={selectedCreative.image_url}
                    alt="Criativo"
                    className="w-full max-h-[55vh] object-contain"
                  />
                  {selectedIndex > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                  )}
                  {selectedIndex < singleCreatives.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); goToNext(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    {headline && (
                      <h2 className="text-xl font-display text-foreground leading-tight mb-1">{headline}</h2>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(selectedCreative.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="space-y-2 pt-3 border-t border-border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Legenda</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {captionChanged && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveCaption}
                            disabled={captionSaving}
                            className="h-7 px-2 text-xs text-primary hover:text-primary"
                          >
                            {captionSaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : captionSaved ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : "Salvar"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyCaption}
                          title="Copiar legenda"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                        >
                          {captionCopied ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{captionCopied ? "Copiado" : "Copiar"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateCaption}
                          disabled={generatingCaption}
                          title="Gerar legenda com IA"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                        >
                          {generatingCaption ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>{generatingCaption ? "Gerando" : "Gerar IA"}</span>
                        </Button>
                        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Inserir emoji"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              onClick={() => {
                                if (captionRef.current) {
                                  cursorPosRef.current = {
                                    start: captionRef.current.selectionStart,
                                    end: captionRef.current.selectionEnd,
                                  };
                                }
                              }}
                            >
                              <Smile className="w-3 h-3" />
                              <span>Emoji</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-2" align="end">
                            <div className="grid grid-cols-10 gap-0.5 max-h-44 overflow-y-auto">
                              {EMOJI_LIST.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => insertEmoji(emoji)}
                                  className="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-muted transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Textarea
                      ref={captionRef}
                      value={captionValue}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      onSelect={(e) => {
                        const el = e.currentTarget;
                        cursorPosRef.current = { start: el.selectionStart, end: el.selectionEnd };
                      }}
                      placeholder="Nenhuma legenda gerada. Clique em 'Gerar com IA' para criar automaticamente."
                      className="text-sm text-gray-900 resize-none border-border/50 leading-relaxed"
                      style={{ backgroundColor: "white" }}
                      rows={8}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="text-xs px-2.5 h-8" onClick={() => setSelectedCreative(null)}>
                      Voltar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2.5 h-8"
                      onClick={() => handleDownload(selectedCreative.image_url, `criativo-${selectedCreative.id.slice(0, 8)}.png`)}
                    >
                      <Download className="w-3 h-3" /> Baixar
                    </Button>
                    <Button
                      size="sm"
                      variant="hero"
                      className="text-xs px-2.5 h-8"
                      onClick={() => openPostDialog(
                        selectedCreative.image_url,
                        captionValue,
                        info?.name ?? "Criativo",
                        selectedCreative.id,
                        selectedCreative.brand_id,
                      )}
                    >
                      <Send className="w-3 h-3" /> Postar
                    </Button>
                    {info?.type === "creative" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2.5 h-8"
                        onClick={() => { setAdaptFormat("1:1"); setAdaptFormatOpen(true); }}
                      >
                        <LayoutGrid className="w-3 h-3" /> Adaptar Formato
                      </Button>
                    )}
                    {info && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs px-2 h-8 ml-auto">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRegenerate(selectedCreative)}>
                            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => confirmDelete(selectedCreative)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Carousel Detail Dialog */}
      <Dialog open={!!selectedCarousel} onOpenChange={(open) => !open && setSelectedCarousel(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {selectedCarousel && (() => {
            const req = carouselRequestsMap[selectedCarousel.requestId];
            return (
              <>
                <DialogHeader className="pb-2">
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    {req?.product_name || "Carrossel"}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                      <Layers className="w-3 h-3" /> {selectedCarousel.slides.length} slides
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {selectedCarousel.slides.map((slide) => {
                    const slideNum: number = (slide.copy_data as any)?.slide_number ?? 0;
                    const headline: string = (slide.copy_data as any)?.headline || "";
                    const subtext: string = (slide.copy_data as any)?.subtext || "";
                    return (
                      <div key={slide.id} className="flex flex-col gap-2">
                        <div className="relative rounded-xl overflow-hidden border border-border aspect-square bg-secondary/30">
                          <img
                            src={slide.image_url}
                            alt={`Slide ${slideNum}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-[10px] font-bold text-foreground">{slideNum}</span>
                          </div>
                        </div>
                        {headline && (
                          <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">{headline}</p>
                        )}
                        {subtext && (
                          <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{subtext}</p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7"
                          onClick={() => handleDownload(slide.image_url, `slide-${slideNum}-${selectedCarousel.requestId.slice(0, 6)}.png`)}
                        >
                          <Download className="w-3 h-3" /> Baixar slide {slideNum}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Caption */}
                <div className="space-y-2 pt-4 border-t border-border mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Legenda</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {carouselCaptionChanged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveCarouselCaption}
                          disabled={carouselCaptionSaving}
                          className="h-7 px-2 text-xs text-primary hover:text-primary"
                        >
                          {carouselCaptionSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : carouselCaptionSaved ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : "Salvar"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyCarouselCaption}
                        title="Copiar legenda"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                      >
                        {carouselCaptionCopied ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{carouselCaptionCopied ? "Copiado" : "Copiar"}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateCarouselCaption}
                        disabled={generatingCarouselCaption}
                        title="Gerar legenda com IA"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                      >
                        {generatingCarouselCaption ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>{generatingCarouselCaption ? "Gerando" : "Gerar IA"}</span>
                      </Button>
                      <Popover open={carouselEmojiPickerOpen} onOpenChange={setCarouselEmojiPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Inserir emoji"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => {
                              if (carouselCaptionRef.current) {
                                carouselCursorPosRef.current = {
                                  start: carouselCaptionRef.current.selectionStart,
                                  end: carouselCaptionRef.current.selectionEnd,
                                };
                              }
                            }}
                          >
                            <Smile className="w-3 h-3" />
                            <span>Emoji</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-2" align="end">
                          <div className="grid grid-cols-10 gap-0.5 max-h-44 overflow-y-auto">
                            {EMOJI_LIST.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => insertCarouselEmoji(emoji)}
                                className="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-muted transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <Textarea
                    ref={carouselCaptionRef}
                    value={carouselCaptionValue}
                    onChange={(e) => setCarouselEditedCaption(e.target.value)}
                    onSelect={(e) => {
                      const el = e.currentTarget;
                      carouselCursorPosRef.current = { start: el.selectionStart, end: el.selectionEnd };
                    }}
                    placeholder="Nenhuma legenda gerada. Clique em 'Gerar IA' para criar automaticamente."
                    className="text-sm text-gray-900 resize-none border-border/50 leading-relaxed"
                    style={{ backgroundColor: "white" }}
                    rows={8}
                  />
                </div>

                <div className="flex items-center gap-1.5 pt-4 border-t border-border mt-2">
                  <Button variant="outline" size="sm" className="text-xs px-2.5 h-8" onClick={() => setSelectedCarousel(null)}>
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    variant="hero"
                    className="text-xs px-2.5 h-8"
                    onClick={() => {
                      const cover = selectedCarousel.slides[0];
                      const carouselReq = carouselRequestsMap[selectedCarousel.requestId];
                      openPostDialog(
                        cover?.image_url ?? "",
                        carouselCaptionValue,
                        carouselReq?.product_name ?? "Carrossel",
                        cover?.id,
                        cover?.brand_id,
                      );
                    }}
                  >
                    <Send className="w-3 h-3" /> Postar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs px-2 h-8 ml-auto">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {selectedCarousel.slides[0] && (
                        <DropdownMenuItem onClick={() => handleRegenerate(selectedCarousel.slides[0])}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => confirmCarouselDelete(selectedCarousel.requestId)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir carrossel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Post Dialog */}
      <Dialog open={postDialogOpen} onOpenChange={(open) => { if (!posting) setPostDialogOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-normal">Publicar agora</DialogTitle>
          </DialogHeader>
          {postTarget && (
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-3">
                <img
                  src={postTarget.image_url}
                  alt="Criativo"
                  className="w-16 h-16 rounded-xl object-cover border border-border shrink-0"
                />
                <p className="text-sm text-foreground font-medium leading-snug line-clamp-3">
                  {postTarget.title}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Plataforma</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "instagram", label: "Instagram" },
                    { value: "facebook", label: "Facebook" },
                    { value: "both", label: "Insta + Facebook" },
                    { value: "tiktok", label: "TikTok" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPostPlatform(p.value)}
                      className={`rounded-xl px-3 py-2 text-sm border-2 transition-all text-left ${
                        postPlatform === p.value
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {postTarget.caption && (
                <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 rounded-lg px-3 py-2">
                  {postTarget.caption}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setPostDialogOpen(false)} disabled={posting}>
                  Cancelar
                </Button>
                <Button variant="hero" className="flex-1" onClick={handlePost} disabled={posting}>
                  {posting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</> : <><Send className="w-4 h-4" /> Publicar</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adapt Format Dialog */}
      <Dialog
        open={adaptFormatOpen}
        onOpenChange={(open) => { if (!adaptingFormat && !open) setAdaptFormatOpen(false); }}
      >
        <DialogContent
          className={`sm:max-w-sm ${adaptingFormat ? "[&>button]:hidden" : ""}`}
          onInteractOutside={(e) => { if (adaptingFormat) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle className="text-center">
              {adaptingFormat ? "Gerando criativo..." : "Adaptar Formato"}
            </DialogTitle>
          </DialogHeader>
          {adaptingFormat ? (
            <GenerationProgress
              isActive={adaptingFormat}
              type="creative"
              onTimeout={() => {
                toast({ title: "Geração demorada", description: "O processo está demorando mais que o esperado. Se persistir, tente novamente.", variant: "destructive" });
              }}
            />
          ) : (
            <div className="space-y-5 py-2">
              <p className="text-sm text-muted-foreground text-center">
                Selecione o formato desejado. O criativo será gerado novamente com o mesmo conceito e prompt.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {FORMATS.map((f) => (
                  <div
                    key={f.value}
                    className={`rounded-xl p-4 border-2 cursor-pointer transition-all text-center ${
                      adaptFormat === f.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 bg-background/50"
                    }`}
                    onClick={() => setAdaptFormat(f.value)}
                  >
                    <span className="font-display text-foreground">{f.label}</span>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                  </div>
                ))}
              </div>
              <Button variant="hero" className="w-full" onClick={handleAdaptFormat}>
                Gerar novamente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="social_media" />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir do histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita e todas as imagens associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;
