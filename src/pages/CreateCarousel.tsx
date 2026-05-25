import { useState, useEffect } from "react";
import JSZip from "jszip";
import { sanitizeFileName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Stepper from "@/components/Stepper";
import ImageUpload from "@/components/ImageUpload";
import CreditsBadge from "@/components/CreditsBadge";
import { ArrowLeft, ArrowRight, Sparkles, Check, RefreshCw, Images, Building2, Loader2, Download, Library } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useBrandContext } from "@/contexts/BrandContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import InsufficientCreditsDialog from "@/components/InsufficientCreditsDialog";
import GenerationProgress from "@/components/GenerationProgress";
import { CTASelector } from "@/components/CTASelector";

const STEPS = ["Produto", "Persuasão", "Estratégia", "Criar"];
const CREDITS_PER_SLIDE = 10;

const OBJECTIVES = [
  { value: "vender diretamente", label: "Vender diretamente" },
  { value: "gerar curiosidade", label: "Gerar curiosidade" },
  { value: "educar / entregar valor", label: "Educar / Entregar valor" },
  { value: "quebrar objeções", label: "Quebrar objeções" },
  { value: "engajar", label: "Engajar (salvar, compartilhar)" },
];

interface CarouselSlide {
  slide_number: number;
  slide_role: string;
  strategy: string;
  headline: string;
  subtext: string;
  cta: string;
}

interface CarouselCopy {
  carousel_title: string;
  slides_count: number;
  credits_cost: number;
  objective: string;
  slides: CarouselSlide[];
}

interface SlideState {
  loading: boolean;
  imageUrl: string | null;
  extraImages: File[];
  imageInstruction: string;
  useAiImage: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  gancho: "bg-red-500/10 text-red-400 border-red-500/20",
  dor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  agravamento: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  insight: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  solução: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  benefícios: "bg-green-500/10 text-green-400 border-green-500/20",
  "quebra de objeção": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cta: "bg-primary/10 text-primary border-primary/20",
};

const BRAND_VISUAL_STYLE_MAP: Record<string, string> = {
  "Moderno Tecnológico": "tech",
  "Moderno Profissional": "corporate",
  "Clean Minimalista": "clean",
  "Premium Luxuoso": "premium",
  "Vibrante Chamativo": "vibrant",
  "Claro Light Minimalista": "light",
  "Tecnológico Futurista": "tech",
  "Infantil Lúdico": "playful",
  "Romântico Minimalista": "clean",
  "Maternidade Premium": "premium",
  "Divertido Artístico": "vibrant",
};

const CreateCarousel = () => {
  const location = useLocation();
  const prefill = (location.state as any)?.prefill;

  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [slidesCount, setSlidesCount] = useState(prefill?.slides_count ?? 6);
  const [productName, setProductName] = useState(prefill?.product_name ?? "");
  const [mainPromise, setMainPromise] = useState(prefill?.main_promise ?? "");
  const [painPoints, setPainPoints] = useState(prefill?.pain_points ?? "");
  const [benefits, setBenefits] = useState(prefill?.benefits ?? "");
  const [objections, setObjections] = useState(prefill?.objections ?? "");
  const [carouselObjective, setCarouselObjective] = useState(prefill?.carousel_objective ?? "vender diretamente");
  const [creativeStyle, setCreativeStyle] = useState(prefill?.creative_style ?? "");
  const [extraContext, setExtraContext] = useState(prefill?.extra_context ?? "");
  const [carouselCta, setCarouselCta] = useState(prefill?.cta ?? "");
  const [brandFilledFields, setBrandFilledFields] = useState<Set<string>>(new Set());
  const [generatingPromise, setGeneratingPromise] = useState(false);

  // Phase states
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<CarouselCopy | null>(null);
  const [slideStates, setSlideStates] = useState<SlideState[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);

  // Image dialog (per slide)
  const [imageDialogSlide, setImageDialogSlide] = useState<number | null>(null);
  const [dialogImages, setDialogImages] = useState<File[]>([]);
  const [dialogInstruction, setDialogInstruction] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { selectedBrand } = useBrandContext();
  const queryClient = useQueryClient();

  // Pre-fill from selected brand
  useEffect(() => {
    if (!selectedBrand) return;
    const filled = new Set<string>();

    setProductName(selectedBrand.name);
    filled.add("productName");

    if (selectedBrand.visual_style) {
      const slug = BRAND_VISUAL_STYLE_MAP[selectedBrand.visual_style] ?? "";
      if (slug) { setCreativeStyle(slug); filled.add("creativeStyle"); }
    }

    if (selectedBrand.audience_pains?.length) {
      setPainPoints(selectedBrand.audience_pains.join("\n"));
      filled.add("painPoints");
    }

    if (selectedBrand.benefits?.length) {
      setBenefits(selectedBrand.benefits.join("\n"));
      filled.add("benefits");
    }

    if (selectedBrand.generated_promise) {
      setMainPromise(selectedBrand.generated_promise);
      filled.add("mainPromise");
    }

    if (selectedBrand.tone_of_voice?.length || selectedBrand.audience_interests?.length) {
      const parts: string[] = [];
      if (selectedBrand.tone_of_voice?.length) parts.push(`Tom de voz: ${selectedBrand.tone_of_voice.join(", ")}`);
      if (selectedBrand.audience_interests?.length) parts.push(`Interesses do público: ${selectedBrand.audience_interests.join(", ")}`);
      if (parts.length) { setExtraContext(parts.join(" · ")); filled.add("extraContext"); }
    }

    setBrandFilledFields(filled);
  }, [selectedBrand?.id]);

  // Auto-generate promise via AI if brand doesn't have one cached
  useEffect(() => {
    if (!selectedBrand || selectedBrand.generated_promise) return;
    if (!selectedBrand.description && !selectedBrand.benefits?.length) return;

    const generate = async () => {
      setGeneratingPromise(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-brand-promise", {
          body: {
            name: selectedBrand.name,
            description: selectedBrand.description,
            benefits: selectedBrand.benefits,
          },
        });
        if (error || !data?.promise) return;
        setMainPromise(data.promise);
        setBrandFilledFields((prev) => new Set([...prev, "mainPromise"]));
        await (supabase as any).from("brands").update({ generated_promise: data.promise }).eq("id", selectedBrand.id);
        queryClient.invalidateQueries({ queryKey: ["brands", user?.id] });
      } catch { /* silent fail */ } finally {
        setGeneratingPromise(false);
      }
    };
    generate();
  }, [selectedBrand?.id]);

  // Auto-trigger copy generation when arriving at step 3
  useEffect(() => {
    if (step === 3 && !generatedCopy && !loadingCopy) {
      handleGenerateCopy();
    }
  }, [step]);

  const BrandBadge = ({ field }: { field: string }) =>
    brandFilledFields.has(field) ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-1">
        <Sparkles className="w-2.5 h-2.5" /> da marca
      </span>
    ) : null;

  const canProceed = () => {
    switch (step) {
      case 0: return productName.trim() && mainPromise.trim();
      case 1: return painPoints.trim() && benefits.trim();
      case 2: return !!carouselObjective;
      default: return false;
    }
  };

  const handleGenerateCopy = async () => {
    if (!user) return;

    const creditsNeeded = slidesCount * CREDITS_PER_SLIDE;
    const creditsAvailable = credits?.credits_balance ?? 0;
    if (creditsAvailable < creditsNeeded) {
      setIsCreditsDialogOpen(true);
      setStep(2);
      return;
    }

    setLoadingCopy(true);
    try {
      await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("generate-carousel", {
        body: {
          phase: "copy",
          product_name: productName,
          main_promise: mainPromise,
          pain_points: painPoints,
          benefits,
          objections: objections || null,
          carousel_objective: carouselObjective,
          creative_style: creativeStyle || null,
          extra_context: extraContext || null,
          cta: carouselCta || null,
          slides_count: slidesCount,
        },
      });
      if (error) throw error;

      const copy: CarouselCopy = data.copy;
      setGeneratedCopy(copy);
      setSlideStates(copy.slides.map(() => ({ loading: false, imageUrl: null, extraImages: [], imageInstruction: "", useAiImage: true })));

      // Upload reference images once
      const imageUrls: string[] = [];
      for (const file of images) {
        const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("creative-uploads").upload(path, file);
        if (upErr) throw upErr;
        const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
          .from("creative-uploads")
          .createSignedUrl(path, 3600);
        if (signedUrlErr || !signedUrlData?.signedUrl) throw new Error("Failed to create signed URL");
        imageUrls.push(signedUrlData.signedUrl);
      }
      setUploadedImageUrls(imageUrls);

      const visualContext = {
        creative_style: creativeStyle || null,
        image_urls: imageUrls,
        product_name: productName,
        carousel_style_reference: creativeStyle || "clean premium tecnológico",
        typography_style: "sans-serif geométrica (Montserrat ou similar)",
      };

      const { data: request, error: reqError } = await supabase
        .from("carousel_requests")
        .insert({
          user_id: user.id,
          product_name: productName,
          main_promise: mainPromise,
          pain_points: painPoints,
          benefits,
          objections: objections || null,
          carousel_objective: carouselObjective,
          creative_style: creativeStyle || null,
          extra_context: extraContext || null,
          slides_count: copy.slides.length,
          status: "pending",
          result_data: copy as any,
          visual_context: visualContext as any,
        })
        .select()
        .single();
      if (reqError) throw reqError;
      setRequestId(request.id);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao gerar copy", description: err.message || "Tente novamente.", variant: "destructive" });
      setStep(2);
    } finally {
      setLoadingCopy(false);
    }
  };

  const resolveLogoUrl = async (): Promise<string | undefined> => {
    if (!selectedBrand?.logo_url) return undefined;
    // Public Supabase URLs are already accessible — use as-is
    if (selectedBrand.logo_url.includes("/storage/v1/object/public/")) {
      return selectedBrand.logo_url;
    }
    // Private/signed Supabase URLs — refresh the signed URL
    const privateMatch = selectedBrand.logo_url.match(
      /\/storage\/v1\/object\/sign\/creative-uploads\/(.+?)(?:\?|$)/
    );
    if (privateMatch) {
      const { data: signed } = await supabase.storage
        .from("creative-uploads")
        .createSignedUrl(privateMatch[1], 3600);
      return signed?.signedUrl ?? selectedBrand.logo_url;
    }
    // External URL (scraped logo etc.) — use as-is
    return selectedBrand.logo_url;
  };

  const handleGenerateSlideImage = async (slideIndex: number) => {
    if (!user || !generatedCopy || !requestId) return;

    if ((credits?.credits_balance ?? 0) < CREDITS_PER_SLIDE) {
      toast({ title: "Créditos insuficientes", description: `Você precisa de ${CREDITS_PER_SLIDE} créditos para gerar este slide.`, variant: "destructive" });
      return;
    }

    setSlideStates(prev => prev.map((s, i) => i === slideIndex ? { ...s, loading: true } : s));

    try {
      const slide = generatedCopy.slides[slideIndex];
      const slideState = slideStates[slideIndex];
      const totalSlides = generatedCopy.slides.length;

      const extraImageUrls: string[] = [];
      for (const file of slideState.extraImages) {
        const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("creative-uploads").upload(path, file);
        if (upErr) throw upErr;
        const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
          .from("creative-uploads")
          .createSignedUrl(path, 3600);
        if (signedUrlErr || !signedUrlData?.signedUrl) throw new Error("Failed to create signed URL");
        extraImageUrls.push(signedUrlData.signedUrl);
      }

      const allImageUrls = [...uploadedImageUrls, ...extraImageUrls];
      const logoUrl = await resolveLogoUrl();
      // Logo visible on all slides except slide 1 and the last slide
      const includeLogoVisible = slide.slide_number !== 1 && slide.slide_number !== totalSlides;

      await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("generate-carousel", {
        body: {
          phase: "single-image",
          slide,
          image_urls: allImageUrls,
          logo_url: logoUrl,
          include_logo_visible: includeLogoVisible,
          image_instruction: slideState.imageInstruction || null,
          product_name: productName,
          creative_style: creativeStyle || null,
          total_slides: totalSlides,
          carousel_style_reference: creativeStyle || "clean premium tecnológico",
          use_ai_image: slideState.useAiImage || false,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const imageUrl = data.image_url;

      await supabase.from("generated_creatives").insert({
        user_id: user.id,
        image_url: imageUrl,
        carousel_request_id: requestId,
        brand_id: selectedBrand?.id ?? null,
        copy_data: { type: "carousel", slide_number: slide.slide_number, ...slide },
        credits_used: CREDITS_PER_SLIDE,
      });

      // Créditos deduzidos server-side pela Edge Function — apenas invalida a query local
      queryClient.invalidateQueries({ queryKey: ["credits"] });

      setSlideStates(prev => prev.map((s, i) => i === slideIndex ? { ...s, loading: false, imageUrl } : s));

      const updatedStates = slideStates.map((s, i) => i === slideIndex ? { ...s, imageUrl } : s);
      if (updatedStates.every(s => s.imageUrl !== null)) {
        await supabase.from("carousel_requests").update({ status: "completed" }).eq("id", requestId);
      }

      toast({ title: `Slide ${slide.slide_number} gerado!` });
    } catch (err: any) {
      console.error(err);
      setSlideStates(prev => prev.map((s, i) => i === slideIndex ? { ...s, loading: false } : s));
      toast({ title: `Erro no slide ${slideIndex + 1}`, description: err.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleSlideExtraImages = (slideIndex: number, files: File[]) => {
    setSlideStates(prev => prev.map((s, i) => i === slideIndex ? { ...s, extraImages: files } : s));
  };

  const openImageDialog = (idx: number) => {
    setImageDialogSlide(idx);
    setDialogImages(slideStates[idx]?.extraImages ?? []);
    setDialogInstruction(slideStates[idx]?.imageInstruction ?? "");
  };

  const confirmImageDialog = () => {
    if (imageDialogSlide === null) return;
    const hasImages = dialogImages.length > 0;
    setSlideStates(prev => prev.map((s, i) =>
      i === imageDialogSlide
        ? { ...s, extraImages: dialogImages, imageInstruction: dialogInstruction, useAiImage: hasImages ? false : s.useAiImage }
        : s
    ));
    setImageDialogSlide(null);
  };

  const [generatingAll, setGeneratingAll] = useState(false);
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [genDialogDone, setGenDialogDone] = useState(false);
  const [genProgressCurrent, setGenProgressCurrent] = useState(0);
  const [genProgressTotal, setGenProgressTotal] = useState(0);
  const [genDialogFinalUrls, setGenDialogFinalUrls] = useState<string[]>([]);
  const [genStatusMessage, setGenStatusMessage] = useState("");
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadZip = async (imageUrls: string[]) => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < imageUrls.length; i++) {
        const response = await fetch(imageUrls[i]);
        const blob = await response.blob();
        zip.file(`slide-${i + 1}.png`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carrossel-${productName.replace(/\s+/g, "-").toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Erro ao gerar ZIP", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleGenerateAllSlides = async () => {
    if (!user || !generatedCopy) return;

    const snapshot = [...slideStates];
    const toGenerate = snapshot
      .map((s, idx) => ({ idx, state: s }))
      .filter(({ state }) => (state.useAiImage || state.extraImages.length > 0) && !state.imageUrl);

    if (toGenerate.length === 0) {
      toast({ title: "Nenhum slide configurado", description: "Ative 'Criar com IA' em pelo menos um slide.", variant: "destructive" });
      return;
    }

    const creditsNeeded = toGenerate.length * CREDITS_PER_SLIDE;
    if ((credits?.credits_balance ?? 0) < creditsNeeded) {
      setIsCreditsDialogOpen(true);
      return;
    }

    // Open generation dialog and reset progress
    setGenDialogDone(false);
    setGenProgressCurrent(0);
    setGenProgressTotal(toGenerate.length);
    setGenDialogFinalUrls([]);
    setGenStatusMessage("Iniciando geração...");
    setShowGenDialog(true);

    setGeneratingAll(true);
    const logoUrl = await resolveLogoUrl();
    const totalSlides = generatedCopy.slides.length;
    // Local array to collect URLs in slide order across all retry rounds
    const collectedUrls: (string | null)[] = new Array(totalSlides).fill(null);

    // Helper: generates a single slide, returns imageUrl on success or null on failure
    const generateSlide = async (idx: number, state: SlideState): Promise<string | null> => {
      const slideNum = generatedCopy.slides[idx].slide_number;
      setSlideStates(prev => prev.map((s, i) => i === idx ? { ...s, loading: true } : s));
      try {
        setGenStatusMessage(`Slide ${slideNum} — preparando referências...`);
        const extraImageUrls: string[] = [];
        for (const file of state.extraImages) {
          const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
          const { error: upErr } = await supabase.storage.from("creative-uploads").upload(path, file);
          if (upErr) throw upErr;
          const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
            .from("creative-uploads")
            .createSignedUrl(path, 3600);
          if (signedUrlErr || !signedUrlData?.signedUrl) throw new Error("Failed to create signed URL");
          extraImageUrls.push(signedUrlData.signedUrl);
        }

        const allImageUrls = [...uploadedImageUrls, ...extraImageUrls];
        const slide = generatedCopy.slides[idx];
        const includeLogoVisible = slide.slide_number !== 1 && slide.slide_number !== totalSlides;

        setGenStatusMessage(`Slide ${slideNum} — gerando imagem com IA...`);
        const { data, error } = await supabase.functions.invoke("generate-carousel", {
          body: {
            phase: "single-image",
            slide,
            image_urls: allImageUrls,
            logo_url: logoUrl,
            include_logo_visible: includeLogoVisible,
            image_instruction: state.imageInstruction || null,
            product_name: productName,
            creative_style: creativeStyle || null,
            total_slides: totalSlides,
            carousel_style_reference: creativeStyle || "clean premium tecnológico",
            use_ai_image: state.useAiImage,
          },
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const imageUrl: string = data.image_url;

        setGenStatusMessage(`Slide ${slideNum} — salvando...`);
        await supabase.from("generated_creatives").insert({
          user_id: user.id,
          image_url: imageUrl,
          carousel_request_id: requestId,
          brand_id: selectedBrand?.id ?? null,
          copy_data: { type: "carousel", slide_number: slide.slide_number, ...slide },
          credits_used: CREDITS_PER_SLIDE,
        });

        setGenStatusMessage(`Slide ${slideNum} — concluído ✓`);
        // Créditos deduzidos server-side pela Edge Function — apenas invalida a query local
        queryClient.invalidateQueries({ queryKey: ["credits"] });
        setSlideStates(prev => prev.map((s, i) => i === idx ? { ...s, loading: false, imageUrl } : s));
        collectedUrls[idx] = imageUrl;
        setGenProgressCurrent(prev => prev + 1);
        return imageUrl;
      } catch (err: any) {
        console.error(`Error generating slide ${idx + 1}:`, err);
        setSlideStates(prev => prev.map((s, i) => i === idx ? { ...s, loading: false } : s));
        return null;
      }
    };

    // Retry loop: up to MAX_RETRY_ROUNDS rounds until all slides have images
    const MAX_RETRY_ROUNDS = 3;
    const stateMap = new Map(toGenerate.map(({ idx, state }) => [idx, state]));
    let pendingIndices = toGenerate.map(({ idx }) => idx);

    for (let round = 0; round < MAX_RETRY_ROUNDS && pendingIndices.length > 0; round++) {
      if (round > 0) {
        setGenStatusMessage(`Verificando slides — ${pendingIndices.length} sem imagem, retentando...`);
        await new Promise(r => setTimeout(r, 3000));
      }

      const failedThisRound: number[] = [];
      for (const idx of pendingIndices) {
        const result = await generateSlide(idx, stateMap.get(idx)!);
        if (result === null) failedThisRound.push(idx);
      }
      pendingIndices = failedThisRound;
    }

    setGeneratingAll(false);
    await supabase.from("carousel_requests").update({ status: "completed" }).eq("id", requestId);

    // Populate dialog results with all successfully generated URLs in slide order
    const finalUrls = collectedUrls.filter((u): u is string => u !== null);
    setGenDialogFinalUrls(finalUrls);
    setGenDialogDone(true);

    if (pendingIndices.length > 0) {
      toast({
        title: "Carrossel parcialmente gerado",
        description: `${finalUrls.length} de ${toGenerate.length} slides gerados. ${pendingIndices.length} slide(s) não puderam ser gerados.`,
        variant: "destructive",
      });
    }
  };

  const generatedCount = slideStates.filter(s => s.imageUrl).length;
  const allSlidesGenerated = generatedCopy && generatedCount === generatedCopy.slides.length;

  if (!selectedBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-display text-foreground mb-2">Selecione uma marca</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Para criar um carrossel, selecione ou cadastre uma marca no menu lateral.
        </p>
        <Button variant="hero" onClick={() => navigate("/brands/new")}>
          <Building2 className="w-4 h-4" />
          Cadastrar Marca
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display text-foreground mb-1">Novo Carrossel</h1>
              <p className="text-muted-foreground">Gere a copy e os slides do seu carrossel com IA</p>
            </div>
            <CreditsBadge credits={credits?.credits_balance ?? 0} />
          </div>
          <Stepper steps={STEPS} currentStep={step} />
        </div>

        {/* Steps 0–2: wizard form */}
        {step < 3 && (
          <div className="gradient-card rounded-2xl p-8 border border-border shadow-card animate-fade-in">
            {/* Step 0: Produto */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-foreground font-display mb-2 block">
                    Nome do produto *<BrandBadge field="productName" />
                  </Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Curso de Marketing Digital"
                    className="bg-background/50"
                  />
                </div>

                <div>
                  <Label className="text-foreground font-display mb-2 flex items-center gap-2">
                    Promessa principal *
                    {generatingPromise && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        <Sparkles className="w-2.5 h-2.5 animate-pulse" /> gerando...
                      </span>
                    )}
                  </Label>
                  <Textarea
                    value={mainPromise}
                    onChange={(e) => setMainPromise(e.target.value)}
                    placeholder="Ex: Aprenda a criar anúncios que vendem em 30 dias"
                    className="bg-background/50"
                    rows={3}
                    disabled={generatingPromise}
                  />
                </div>

                {/* Slides count */}
                <div className="space-y-3">
                  <Label className="text-foreground font-display block">
                    Quantidade de slides
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({slidesCount * CREDITS_PER_SLIDE} créditos no total)
                    </span>
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[4, 5, 6, 7, 8].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSlidesCount(num)}
                        className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all duration-200 ${
                          slidesCount === num
                            ? "border-primary bg-primary/10 text-primary shadow-md scale-105"
                            : "border-border bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        <span className="text-xl font-display">{num}</span>
                        <span className="text-[10px] mt-0.5 leading-tight text-center">
                          {num * CREDITS_PER_SLIDE} créditos
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Persuasão */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-foreground font-display mb-2 block">
                    Principais dores do público *<BrandBadge field="painPoints" />
                  </Label>
                  <Textarea
                    value={painPoints}
                    onChange={(e) => setPainPoints(e.target.value)}
                    placeholder="Ex: Não consegue vender online, gasta com anúncios sem retorno..."
                    className="bg-background/50"
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-foreground font-display mb-2 block">
                    Principais benefícios *<BrandBadge field="benefits" />
                  </Label>
                  <Textarea
                    value={benefits}
                    onChange={(e) => setBenefits(e.target.value)}
                    placeholder="Ex: Resultados em 7 dias, suporte personalizado, método comprovado..."
                    className="bg-background/50"
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-foreground font-display mb-2 block">Principais objeções (opcional)</Label>
                  <Textarea
                    value={objections}
                    onChange={(e) => setObjections(e.target.value)}
                    placeholder="Ex: É muito caro, não tenho tempo, será que funciona..."
                    className="bg-background/50"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Estratégia */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-foreground font-display mb-2 block">Objetivo do carrossel *</Label>
                  <Select value={carouselObjective} onValueChange={setCarouselObjective}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map((obj) => (
                        <SelectItem key={obj.value} value={obj.value}>
                          {obj.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl font-display text-foreground">
                    Estilo do Carrossel<BrandBadge field="creativeStyle" />
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "dark", label: "Dark / Escuro" },
                      { value: "light", label: "Claro / Light" },
                      { value: "clean", label: "Clean / Minimalista" },
                      { value: "premium", label: "Premium / Luxuoso" },
                      { value: "playful", label: "Infantil / Lúdico" },
                      { value: "tech", label: "Tecnológico / Futurista" },
                      { value: "vibrant", label: "Vibrante / Chamativo" },
                      { value: "corporate", label: "Corporativo / Profissional" },
                    ].map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => setCreativeStyle(creativeStyle === style.value ? "" : style.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                          creativeStyle === style.value
                            ? "border-primary bg-primary/10 text-primary shadow-md scale-105"
                            : "border-border bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                  {!creativeStyle && (
                    <p className="text-xs text-muted-foreground">Nenhum estilo selecionado — a IA escolherá automaticamente.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-foreground font-display mb-2 block">CTA do slide final (opcional)</Label>
                  <CTASelector
                    value={carouselCta}
                    onChange={setCarouselCta}
                    placeholder="Ou digite um CTA personalizado..."
                  />
                </div>

                <div>
                  <Label className="text-foreground font-display mb-2 block">
                    Contexto adicional (opcional)<BrandBadge field="extraContext" />
                  </Label>
                  <Textarea
                    value={extraContext}
                    onChange={(e) => setExtraContext(e.target.value)}
                    placeholder="Ex: público entre 25-40 anos, foco em Instagram..."
                    className="bg-background/50"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => step > 0 ? setStep(step - 1) : navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4" />
                {step > 0 ? "Voltar" : "Dashboard"}
              </Button>

              {step < STEPS.length - 2 ? (
                <Button variant="hero" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                  Próximo <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="hero"
                  onClick={() => setStep(3)}
                  disabled={!canProceed()}
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Criar */}
        {step === 3 && (
          loadingCopy ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display text-foreground">Gerando copy do carrossel...</h2>
                <p className="text-muted-foreground text-sm">
                  A IA está criando {slidesCount} slides para "{productName}"
                </p>
              </div>
              <div className="w-full max-w-sm">
                <GenerationProgress isActive={true} type="copy" />
              </div>
            </div>
          ) : generatedCopy ? (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-display text-foreground mb-2">
                  Slides do Carrossel
                </h2>
                <p className="text-muted-foreground text-sm">
                  {generatedCount}/{generatedCopy.slides.length} imagens geradas · {CREDITS_PER_SLIDE} créditos por slide
                </p>
              </div>

              {/* Slide cards grid — square format */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {generatedCopy.slides.map((slide, idx) => {
                  const roleKey = slide.slide_role.toLowerCase();
                  const colorClass = ROLE_COLORS[roleKey] || "bg-muted text-muted-foreground border-border";
                  const state = slideStates[idx];

                  return (
                    <div
                      key={idx}
                      className="relative aspect-square gradient-card rounded-2xl border border-border shadow-card overflow-hidden flex flex-col"
                    >
                      {/* Loading overlay */}
                      {state?.loading && (
                        <div className="absolute inset-0 z-10 bg-background/85 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          <p className="text-xs text-muted-foreground">Gerando slide {slide.slide_number}...</p>
                        </div>
                      )}

                      {/* Generated image overlay */}
                      {state?.imageUrl && !state?.loading && (
                        <div className="absolute inset-0 z-10">
                          <img
                            src={state.imageUrl}
                            alt={`Slide ${slide.slide_number}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/90 text-white text-[10px] font-medium">
                              <Check className="w-2.5 h-2.5" /> Gerado
                            </span>
                          </div>
                          <div className="absolute bottom-2 inset-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs h-7 bg-background/80 backdrop-blur-sm"
                              onClick={() => setSlideStates(prev => prev.map((s, i) => i === idx ? { ...s, imageUrl: null } : s))}
                            >
                              <RefreshCw className="w-3 h-3" /> Regenerar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Card content (slide copy) */}
                      <div className="flex flex-col h-full p-3">
                        {/* Top: slide number + badge */}
                        <div className="flex items-center gap-1.5 mb-2 shrink-0">
                          <span className="text-[10px] font-bold text-muted-foreground leading-none">
                            {slide.slide_number}
                          </span>
                          <Badge variant="outline" className={`${colorClass} text-[10px] px-1.5 py-0 leading-5`}>
                            {slide.slide_role}
                          </Badge>
                        </div>

                        {/* Headline */}
                        <h3 className="text-sm font-display text-foreground leading-snug line-clamp-3 mb-1.5 shrink-0">
                          {slide.headline}
                        </h3>

                        {/* Subheadline */}
                        {slide.subtext && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                            {slide.subtext}
                          </p>
                        )}

                        {!slide.subtext && <div className="flex-1" />}

                        {/* CTA */}
                        {slide.cta && (
                          <span className="mt-1.5 mb-1.5 self-start inline-block px-2 py-0.5 rounded gradient-primary text-primary-foreground text-[10px] font-semibold shrink-0">
                            {slide.cta}
                          </span>
                        )}

                        {/* Divider + controls */}
                        {!state?.imageUrl && (
                          <div className="border-t border-border/50 mt-auto pt-2 space-y-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openImageDialog(idx)}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-1 rounded-lg border border-border/60 hover:border-primary/40 bg-background/40"
                            >
                              <Images className="w-3 h-3" />
                              Adicionar Imagem
                              {(state?.extraImages?.length ?? 0) > 0 && (
                                <span className="ml-0.5 text-primary font-medium">({state.extraImages.length})</span>
                              )}
                            </button>
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={state?.useAiImage ?? true}
                                onCheckedChange={(checked) =>
                                  setSlideStates(prev => prev.map((s, i) => i === idx ? { ...s, useAiImage: checked } : s))
                                }
                                className="scale-75 origin-left"
                              />
                              <span className="text-[10px] text-muted-foreground leading-none">Criar com IA</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom actions */}
              <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-border">
                <Button
                  variant="outline"
                  disabled={generatingAll}
                  onClick={() => {
                    setGeneratedCopy(null);
                    setSlideStates([]);
                    setRequestId(null);
                    setStep(2);
                  }}
                >
                  <RefreshCw className="w-4 h-4" /> Regenerar Copy
                </Button>

                {!allSlidesGenerated && (
                  <Button
                    variant="hero"
                    onClick={handleGenerateAllSlides}
                    disabled={generatingAll}
                  >
                    {generatingAll ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando slides ({generatedCount}/{generatedCopy.slides.length})...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Gerar Carrossel</>
                    )}
                  </Button>
                )}

                {allSlidesGenerated && (
                  <Button variant="hero" onClick={() => navigate(`/carousel-results/${requestId}`)}>
                    <Check className="w-4 h-4" /> Ver Carrossel Completo
                  </Button>
                )}
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* Image dialog for slide */}
      <Dialog open={imageDialogSlide !== null} onOpenChange={(open) => { if (!open) setImageDialogSlide(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Adicionar imagem — Slide {imageDialogSlide !== null ? imageDialogSlide + 1 : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <ImageUpload images={dialogImages} onImagesChange={setDialogImages} maxImages={3} />
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Como usar esta imagem (opcional)</Label>
              <Textarea
                value={dialogInstruction}
                onChange={(e) => setDialogInstruction(e.target.value)}
                placeholder="Ex: usar como foto do produto em destaque, colocar no fundo, mostrar detalhe do embalagem..."
                className="resize-none text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogSlide(null)}>Cancelar</Button>
            <Button variant="hero" onClick={confirmImageDialog}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generation progress / results dialog */}
      <Dialog
        open={showGenDialog}
        onOpenChange={(open) => { if (!open && genDialogDone) setShowGenDialog(false); }}
      >
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => { if (!genDialogDone) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (!genDialogDone) e.preventDefault(); }}
        >
          {!genDialogDone ? (
            /* ── Progress phase ── */
            <div className="py-4">
              <DialogHeader className="mb-6">
                <DialogTitle className="flex items-center gap-2 font-normal">
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                  Gerando carrossel...
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-2xl font-display text-foreground">
                    {genProgressCurrent} <span className="text-muted-foreground text-lg">/ {genProgressTotal}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">slides gerados</p>
                </div>
                <Progress
                  value={genProgressTotal > 0 ? (genProgressCurrent / genProgressTotal) * 100 : 0}
                  className="h-2"
                />
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${genProgressTotal}, 1fr)` }}>
                  {Array.from({ length: genProgressTotal }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-colors duration-500 ${
                        i < genProgressCurrent ? "bg-primary" : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                {/* Status message — animates on every sub-step change */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 min-h-[36px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <p className="text-xs text-muted-foreground transition-all duration-300 truncate">
                    {genStatusMessage}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Não feche esta janela durante a geração.
                </p>
              </div>
            </div>
          ) : (
            /* ── Results phase ── */
            <div>
              <DialogHeader className="mb-4">
                <DialogTitle className="flex items-center gap-2 font-normal">
                  <Check className="w-5 h-5 text-green-400" />
                  Carrossel gerado — {genDialogFinalUrls.length} slide{genDialogFinalUrls.length !== 1 ? "s" : ""}
                </DialogTitle>
              </DialogHeader>

              <div className={`grid gap-3 mb-6 ${
                genDialogFinalUrls.length <= 2 ? "grid-cols-2" :
                genDialogFinalUrls.length <= 4 ? "grid-cols-2" : "grid-cols-3"
              }`}>
                {genDialogFinalUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-square border border-border">
                    <img
                      src={url}
                      alt={`Slide ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                        {i + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadZip(genDialogFinalUrls)}
                  disabled={downloadingZip}
                  className="w-full sm:w-auto"
                >
                  {downloadingZip
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando ZIP...</>
                    : <><Download className="w-4 h-4" /> Download ZIP</>
                  }
                </Button>
                <Button
                  variant="hero"
                  onClick={() => { setShowGenDialog(false); navigate("/history"); }}
                  className="w-full sm:w-auto"
                >
                  <Library className="w-4 h-4" /> Salvar na Biblioteca
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InsufficientCreditsDialog
        open={isCreditsDialogOpen}
        onClose={() => setIsCreditsDialogOpen(false)}
        creditsNeeded={slidesCount * CREDITS_PER_SLIDE}
        creditsAvailable={credits?.credits_balance ?? 0}
      />
    </div>
  );
};

export default CreateCarousel;
