import { useState, useEffect } from "react";
import { sanitizeFileName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Stepper from "@/components/Stepper";
import ImageUpload from "@/components/ImageUpload";
import CreditsBadge from "@/components/CreditsBadge";
import { CTASelector } from "@/components/CTASelector";
import {
  ArrowLeft, ArrowRight, Sparkles, Zap, Building2, Images, X, Pencil,
  Loader2, CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useBrandContext } from "@/contexts/BrandContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import InsufficientCreditsDialog from "@/components/InsufficientCreditsDialog";
import GenerationProgress from "@/components/GenerationProgress";

interface VisualConcept {
  visual_description: string;
  element_distribution: string;
  composition: string;
  visual_hierarchy: string;
  layout_style: string;
  cta_highlight: string;
  thematic_elements: string;
}

interface CopyAngle {
  angle_name: string;
  headline: string;
  subheadline?: string;
  body: string;
  cta: string;
  visual_concept: VisualConcept | null;
}

interface FormattedIdea {
  promise: string;
  pains: string;
  benefits: string;
  angle: string;
  summary: string;
}

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

const CreateCreative = () => {
  const location = useLocation();
  const { objective = "venda", method = "zero" } = (location.state ?? {}) as {
    objective?: "engajamento" | "venda";
    method?: "zero" | "ideia" | "link";
  };

  const STEPS =
    method === "ideia" ? ["Produto", "Ideia", "Revisar", "CTA", "Criar"] :
    method === "link"  ? ["Produto", "Link", "Criar"] :
                         ["Produto", "Persuasão", "CTA", "Criar"];
  const CRIAR_STEP = STEPS.length - 1;

  // ── Core state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const [dialogImage, setDialogImage] = useState<File[]>([]);
  const [dialogInstruction, setDialogInstruction] = useState("");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [promise, setPromise] = useState("");
  const [pains, setPains] = useState("");
  const [benefits, setBenefits] = useState("");
  const [objections, setObjections] = useState("");
  const [cta, setCta] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedAngles, setGeneratedAngles] = useState<CopyAngle[] | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);
  const [format, setFormat] = useState("1:1");
  const [imageModel, setImageModel] = useState("gpt-image-2");
  const [imageInstructions, setImageInstructions] = useState<string[]>([]);
  const [creativeStyle, setCreativeStyle] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generatingCreative, setGeneratingCreative] = useState(false);
  const [generatingPromise, setGeneratingPromise] = useState(false);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  const [brandFilledFields, setBrandFilledFields] = useState<Set<string>>(new Set());

  // ── Method-specific state ─────────────────────────────────────────────────
  const [idea, setIdea] = useState("");
  const [formattedIdea, setFormattedIdea] = useState<FormattedIdea | null>(null);
  const [formattingIdea, setFormattingIdea] = useState(false);
  const [link, setLink] = useState("");
  const [linkScraped, setLinkScraped] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { selectedBrand } = useBrandContext();
  const queryClient = useQueryClient();

  // ── Brand pre-fill ────────────────────────────────────────────────────────
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
      setPains(selectedBrand.audience_pains.join("\n"));
      filled.add("pains");
    }

    if (selectedBrand.benefits?.length) {
      setBenefits(selectedBrand.benefits.join("\n"));
      filled.add("benefits");
    }

    if (selectedBrand.generated_promise) {
      setPromise(selectedBrand.generated_promise);
      filled.add("promise");
    }

    setBrandFilledFields(filled);
  }, [selectedBrand?.id]);

  // ── Auto-generate promise via AI ──────────────────────────────────────────
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

        setPromise(data.promise);
        setBrandFilledFields((prev) => new Set([...prev, "promise"]));

        await (supabase as any).from("brands").update({ generated_promise: data.promise }).eq("id", selectedBrand.id);
        queryClient.invalidateQueries({ queryKey: ["brands", user?.id] });
      } catch {
        // silently fail
      } finally {
        setGeneratingPromise(false);
      }
    };

    generate();
  }, [selectedBrand?.id]);

  // ── Image preview URLs ────────────────────────────────────────────────────
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  // ── Auto-format idea when entering review step ────────────────────────────
  useEffect(() => {
    if (method === "ideia" && step === 2 && !formattedIdea && !formattingIdea) {
      handleFormatIdea();
    }
  }, [step]);

  // ── canProceed ────────────────────────────────────────────────────────────
  const canProceed = () => {
    if (method === "zero") {
      switch (step) {
        case 0: return productName.trim().length > 0 && promise.trim().length > 0;
        case 1: return pains.trim().length > 0 && benefits.trim().length > 0;
        case 2: return true;
        default: return false;
      }
    }
    if (method === "ideia") {
      switch (step) {
        case 0: return productName.trim().length > 0 && promise.trim().length > 0;
        case 1: return idea.trim().length > 0;
        case 2: return !!formattedIdea;
        case 3: return true;
        default: return false;
      }
    }
    if (method === "link") {
      switch (step) {
        case 0: return productName.trim().length > 0;
        case 1: return linkScraped;
        default: return false;
      }
    }
    return false;
  };

  // ── handleFormatIdea ──────────────────────────────────────────────────────
  const handleFormatIdea = async () => {
    setFormattingIdea(true);
    try {
      const { data, error } = await supabase.functions.invoke("format-idea", {
        body: { idea, objective, product: productName },
      });
      if (error) throw error;
      if (!data?.formatted) throw new Error("Resposta inválida da IA");

      const f: FormattedIdea = data.formatted;
      setFormattedIdea(f);

      if (f.promise) { setPromise(f.promise); setBrandFilledFields((p) => new Set([...p, "promise"])); }
      if (f.pains)   { setPains(f.pains);     setBrandFilledFields((p) => new Set([...p, "pains"])); }
      if (f.benefits){ setBenefits(f.benefits); setBrandFilledFields((p) => new Set([...p, "benefits"])); }
    } catch (err: any) {
      toast({ title: "Erro ao formatar ideia", description: err.message, variant: "destructive" });
      setStep(1);
    } finally {
      setFormattingIdea(false);
    }
  };

  // ── handleScrapeLink ──────────────────────────────────────────────────────
  const handleScrapeLink = async () => {
    if (!link.trim()) return;
    setIsScraping(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("brand-scrape-website", {
        body: { url: link },
      });
      if (error) throw error;
      if (!resp?.success) throw new Error("Não foi possível analisar o link");

      const d = resp.data;
      if (d.name) setProductName(d.name);
      if (d.description) setPromise(d.description);
      if (d.audience_pains?.length) setPains(Array.isArray(d.audience_pains) ? d.audience_pains.join("\n") : d.audience_pains);
      if (d.benefits?.length) setBenefits(Array.isArray(d.benefits) ? d.benefits.join("\n") : d.benefits);
      setLinkScraped(true);
      toast({ title: "Link analisado!", description: "Informações extraídas com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao analisar link", description: err.message || "Verifique o URL e tente novamente.", variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  // ── handleGenerate (copy generation) ─────────────────────────────────────
  const handleGenerate = async () => {
    if (!user) return;
    if ((credits?.credits_balance ?? 0) < 10) {
      setIsCreditsDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const { data: request, error: reqError } = await supabase
        .from("creative_requests")
        .insert({
          user_id: user.id,
          product_name: productName,
          promise,
          pains,
          benefits,
          objections: objections || null,
          cta: cta || null,
          status: "processing",
        })
        .select()
        .single();
      if (reqError) throw reqError;

      const { data: copyData, error: copyError } = await supabase.functions.invoke("generate-copy", {
        body: {
          product_name: productName,
          promise,
          pains,
          benefits,
          objections,
          cta,
          objective,
          creative_style: creativeStyle || undefined,
          additional_instructions: additionalInstructions.trim() || undefined,
        },
      });
      if (copyError) throw copyError;

      if (!copyData?.angles?.length) throw new Error("Resposta da IA inválida — tente novamente.");
      setGeneratedAngles(copyData.angles.map((a: CopyAngle) => ({
        ...a,
        visual_concept: a.visual_concept ?? null,
      })));
      setSelectedAngle(null);

      setCurrentRequestId(request.id);
      await supabase
        .from("creative_requests")
        .update({ status: "completed" })
        .eq("id", request.id);

      queryClient.invalidateQueries({ queryKey: ["creative-requests"] });

      toast({ title: "Copies geradas!", description: "Escolha seu ângulo e gere o criativo." });
    } catch (err: any) {
      console.error(err);
      try {
        const { data: lastReq } = await supabase
          .from("creative_requests")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "processing")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (lastReq?.id) {
          await supabase.from("creative_requests").update({ status: "error" }).eq("id", lastReq.id);
        }
      } catch { /* ignore */ }
      toast({ title: "Erro ao gerar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── handleGenerateCreative ────────────────────────────────────────────────
  const handleGenerateCreative = async () => {
    if (!user) return;
    if (method === "ideia" && !formattedIdea) return;
    if (method !== "ideia" && (selectedAngle === null || !generatedAngles)) return;

    const angle = method !== "ideia" ? generatedAngles![selectedAngle!] : null;
    const visual = method === "ideia"
      ? {
          visual_description: `Post com foco em: ${formattedIdea!.angle}`,
          element_distribution: "Headline em destaque, corpo centralizado, CTA na base",
          composition: "Layout limpo com hierarquia visual clara",
          visual_hierarchy: "1º Headline → 2º Corpo → 3º CTA",
          layout_style: creativeStyle || "Moderno Profissional",
          cta_highlight: "Botão ou elemento destacado na base",
          thematic_elements: "",
        }
      : angle?.visual_concept;

    if ((credits?.credits_balance ?? 0) < 10) {
      toast({ title: "Créditos insuficientes", description: "Você não tem créditos suficientes para gerar.", variant: "destructive" });
      return;
    }

    setGeneratingCreative(true);
    try {
      const imageUrls: string[] = [];
      for (const file of images) {
        const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("creative-uploads").upload(path, file);
        if (upErr) throw upErr;
        const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
          .from("creative-uploads")
          .createSignedUrl(path, 600);
        if (signedUrlErr || !signedUrlData?.signedUrl) throw new Error("Failed to create signed URL");
        imageUrls.push(signedUrlData.signedUrl);
      }

      let logoUrl: string | undefined;
      if (includeLogo && selectedBrand?.logo_url) {
        const supabaseMatch = selectedBrand.logo_url.match(
          /\/storage\/v1\/object\/(?:public|sign)\/creative-uploads\/(.+?)(?:\?|$)/
        );
        if (supabaseMatch) {
          const { data: signed } = await supabase.storage
            .from("creative-uploads")
            .createSignedUrl(supabaseMatch[1], 600);
          logoUrl = signed?.signedUrl;
        } else {
          logoUrl = selectedBrand.logo_url;
        }
      }

      const brandColors = [
        selectedBrand?.color_primary,
        selectedBrand?.color_secondary,
        selectedBrand?.color_accent,
      ].filter(Boolean) as string[];

      const { data: creativeData, error: creativeError } = await supabase.functions.invoke("generate-creative", {
        body: {
          image_urls: imageUrls,
          logo_url: logoUrl,
          product_name: productName,
          promise: method === "ideia" ? formattedIdea!.promise : promise,
          pains: method === "ideia" ? formattedIdea!.pains : pains,
          benefits: method === "ideia" ? formattedIdea!.benefits : benefits,
          objections: objections || null,
          headline: method === "ideia" ? formattedIdea!.angle : angle!.headline,
          body: method === "ideia" ? formattedIdea!.summary : angle!.body,
          cta: method === "ideia" ? (cta || "Saiba mais") : angle!.cta,
          visual_option: visual ? {
            visual_description: visual.visual_description,
            element_distribution: visual.element_distribution,
            composition: visual.composition,
            visual_hierarchy: visual.visual_hierarchy,
            layout_style: visual.layout_style,
            cta_highlight: visual.cta_highlight,
            thematic_elements: visual.thematic_elements,
          } : undefined,
          format,
          creative_style: creativeStyle || undefined,
          color_palette: brandColors.length > 0 ? brandColors : undefined,
          additional_instructions: additionalInstructions.trim() || undefined,
          image_instructions: imageInstructions.length > 0 ? imageInstructions : undefined,
          model: imageModel,
          save_data: {
            request_id: currentRequestId,
            brand_id: selectedBrand?.id ?? null,
            copy_data: {
              angle_name: method === "ideia" ? "Ideia formatada" : angle!.angle_name,
              headline: method === "ideia" ? formattedIdea!.angle : angle!.headline,
              subheadline: method === "ideia" ? undefined : angle!.subheadline,
              body: method === "ideia" ? formattedIdea!.summary : angle!.body,
              cta: method === "ideia" ? (cta || "Saiba mais") : angle!.cta,
              visual_option: visual ?? null,
              format,
            },
          },
        },
      });
      if (creativeError) {
        let errorMsg = creativeError.message;
        try {
          const body = await (creativeError as any).context?.json?.();
          if (body?.error) errorMsg = body.error;
        } catch {}
        throw new Error(errorMsg);
      }

      if (!creativeData?.image_url) throw new Error("Criativo não foi gerado. Tente novamente.");

      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["creative-requests"] });

      toast({ title: "Criativo gerado!", description: "Seu criativo foi gerado com sucesso." });
      if (currentRequestId) {
        navigate(`/results/${currentRequestId}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao gerar criativo", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setGeneratingCreative(false);
    }
  };

  // ── Image dialog helpers ──────────────────────────────────────────────────
  const openAddDialog = () => {
    setEditingImageIdx(null);
    setDialogImage([]);
    setDialogInstruction("");
    setImageDialogOpen(true);
  };

  const openEditDialog = (idx: number) => {
    setEditingImageIdx(idx);
    setDialogImage([images[idx]]);
    setDialogInstruction(imageInstructions[idx] ?? "");
    setImageDialogOpen(true);
  };

  const handleDialogConfirm = () => {
    if (dialogImage.length === 0) return;
    if (editingImageIdx !== null) {
      const newImages = [...images];
      newImages[editingImageIdx] = dialogImage[0];
      setImages(newImages);
      const newInstructions = [...imageInstructions];
      newInstructions[editingImageIdx] = dialogInstruction;
      setImageInstructions(newInstructions);
    } else {
      setImages((prev) => [...prev, dialogImage[0]]);
      setImageInstructions((prev) => [...prev, dialogInstruction]);
    }
    setImageDialogOpen(false);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImageInstructions((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetWizard = () => {
    setGeneratedAngles(null);
    setStep(0);
    setImages([]);
    setImageInstructions([]);
    setSelectedAngle(null);
    setImageDialogOpen(false);
    setIdea("");
    setFormattedIdea(null);
    setLink("");
    setLinkScraped(false);
  };

  const BrandBadge = ({ field }: { field: string }) =>
    brandFilledFields.has(field) ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-1">
        <Sparkles className="w-2.5 h-2.5" /> da marca
      </span>
    ) : null;

  const angleLabels = ["🔴 Dor Principal", "🟢 Transformação", "🟡 Quebra de Objeção"];

  // ── CTA step content (shared between zero/step2 and ideia/step3) ──────────
  const ctaStepContent = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display text-foreground mb-2">Call to Action</h2>
        <p className="text-muted-foreground text-sm">Defina o CTA do seu anúncio (opcional)</p>
      </div>
      <CTASelector
        value={cta}
        onChange={setCta}
        placeholder='Ex: "Compre agora com 30% OFF"'
      />
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Orientações adicionais (opcional)</Label>
        <Textarea
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          placeholder="Ex: Incluir selo de garantia, adicionar efeito de brilho no fundo..."
          className="bg-background/50 border-border resize-none"
          rows={3}
        />
      </div>
    </div>
  );

  if (!selectedBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-display text-foreground mb-2">Selecione uma marca</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Para criar um criativo, selecione ou cadastre uma marca no menu lateral.
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
        <div className="mb-10">
          <Stepper steps={STEPS} currentStep={step} />
        </div>

        {/* ── Wizard steps ───────────────────────────────────────────────── */}
        {step < CRIAR_STEP && (
          <div className="gradient-card rounded-2xl p-8 shadow-card border border-border animate-fade-in">

            {/* ── Step 0 — Produto (all methods) ── */}
            {step === 0 && (
              <div className="space-y-6">
                {/* Objective / method badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    {objective === "engajamento" ? "🤝 Engajamento" : "💰 Venda"}
                  </Badge>
                  <Badge variant="outline">
                    {method === "zero" ? "✨ Do Zero" : method === "ideia" ? "💡 Pela Ideia" : "🔗 Pelo Link"}
                  </Badge>
                </div>

                <div>
                  <h2 className="text-xl font-display text-foreground mb-2">Sobre o produto</h2>
                  <p className="text-muted-foreground text-sm">Informações básicas para gerar a copy do anúncio</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Nome do produto *<BrandBadge field="productName" />
                    </Label>
                    <Input
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Ex: Sérum Vitamina C Premium"
                      className="bg-background/50 border-border"
                    />
                  </div>

                  {/* Promise hidden for link method */}
                  {method !== "link" && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-2">
                        Promessa principal *
                        {generatingPromise && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            <Sparkles className="w-2.5 h-2.5 animate-pulse" /> gerando...
                          </span>
                        )}
                      </Label>
                      <Textarea
                        value={promise}
                        onChange={(e) => setPromise(e.target.value)}
                        placeholder="Ex: Pele mais jovem e radiante em 30 dias"
                        className="bg-background/50 border-border resize-none"
                        rows={3}
                        disabled={generatingPromise}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-border">
                  <h2 className="text-xl font-display text-foreground pt-2">
                    Estilo do Criativo<BrandBadge field="creativeStyle" />
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
              </div>
            )}

            {/* ── Step 1 — Persuasão (zero) ── */}
            {step === 1 && method === "zero" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display text-foreground mb-2">Elementos de persuasão</h2>
                  <p className="text-muted-foreground text-sm">Dores, benefícios e objeções do público-alvo</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Dores do público *<BrandBadge field="pains" />
                    </Label>
                    <Textarea value={pains} onChange={(e) => setPains(e.target.value)} placeholder="Ex: Manchas, rugas precoces, pele sem vida" className="bg-background/50 border-border resize-none" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Benefícios *<BrandBadge field="benefits" />
                    </Label>
                    <Textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder="Ex: Reduz manchas, ilumina a pele, antioxidante" className="bg-background/50 border-border resize-none" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Objeções comuns (opcional)</Label>
                    <Textarea value={objections} onChange={(e) => setObjections(e.target.value)} placeholder='Ex: "É caro", "Será que funciona?"' className="bg-background/50 border-border resize-none" rows={2} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1 — Ideia (ideia method) ── */}
            {step === 1 && method === "ideia" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display text-foreground mb-2">Sua Ideia</h2>
                  <p className="text-muted-foreground text-sm">Descreva o que você quer criar e a IA vai estruturar para você</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Descreva sua ideia *</Label>
                  <Textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Ex: Quero criar um post mostrando como meu produto ajuda pessoas ocupadas a economizar tempo no dia a dia..."
                    className="bg-background/50 border-border resize-none"
                    rows={6}
                  />
                </div>
              </div>
            )}

            {/* ── Step 1 — Link (link method) ── */}
            {step === 1 && method === "link" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display text-foreground mb-2">Link do Produto</h2>
                  <p className="text-muted-foreground text-sm">A IA vai extrair as informações automaticamente</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Cole o link do produto ou conteúdo *</Label>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => { setLink(e.target.value); setLinkScraped(false); }}
                      className="bg-background/50 border-border"
                    />
                  </div>
                  {!linkScraped && (
                    <Button
                      variant="outline"
                      onClick={handleScrapeLink}
                      disabled={isScraping || !link.trim().startsWith("http")}
                    >
                      {isScraping
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando link...</>
                        : "Analisar Link →"}
                    </Button>
                  )}
                  {linkScraped && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Informações extraídas
                      </p>
                      {promise && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Promessa:</strong> {promise}
                        </p>
                      )}
                      {pains && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Dores:</strong> {pains.split("\n").slice(0, 2).join(", ")}
                        </p>
                      )}
                      {benefits && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Benefícios:</strong> {benefits.split("\n").slice(0, 2).join(", ")}
                        </p>
                      )}
                      <button
                        onClick={() => setLinkScraped(false)}
                        className="text-xs text-primary hover:underline"
                      >
                        Analisar outro link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2 — CTA (zero) ── */}
            {step === 2 && method === "zero" && ctaStepContent}

            {/* ── Step 2 — Revisar (ideia method) ── */}
            {step === 2 && method === "ideia" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display text-foreground mb-2">Revisar Ideia</h2>
                  <p className="text-muted-foreground text-sm">A IA estruturou sua ideia — revise antes de continuar</p>
                </div>

                {formattingIdea && (
                  <div className="flex flex-col items-center py-12 space-y-4">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    <p className="text-muted-foreground text-sm">Formatando sua ideia...</p>
                  </div>
                )}

                {!formattingIdea && formattedIdea && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-background/50 p-5 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Resumo</p>
                        <p className="text-sm text-foreground leading-relaxed">{formattedIdea.summary}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Promessa Principal</p>
                        <p className="text-sm text-foreground">{formattedIdea.promise}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ângulo Criativo</p>
                        <p className="text-sm text-foreground">{formattedIdea.angle}</p>
                      </div>
                    </div>

                    {/* Review-specific navigation (replaces standard footer) */}
                    <div className="flex gap-3 pt-2 border-t border-border mt-6">
                      <Button variant="outline" onClick={() => { setFormattedIdea(null); setStep(1); }}>
                        <ArrowLeft className="w-4 h-4" /> Editar Ideia
                      </Button>
                      <Button variant="hero" onClick={() => setStep(3)}>
                        Usar esta versão <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3 — CTA (ideia method) ── */}
            {step === 3 && method === "ideia" && ctaStepContent}

            {/* ── Standard footer navigation (hidden on review step) ── */}
            {!(method === "ideia" && step === 2) && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
                {step === CRIAR_STEP - 1 ? (
                  <Button variant="hero" onClick={() => { setStep(CRIAR_STEP); if (method !== "ideia") handleGenerate(); }} disabled={!canProceed()}>
                    Próximo <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="hero" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                    Próximo <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Criar step ─────────────────────────────────────────────────── */}
        {step === CRIAR_STEP && method === "ideia" && (
          <div className="space-y-8 animate-fade-in">
            {formattedIdea && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Copy gerada a partir da sua ideia</p>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Ângulo</p>
                  <p className="font-medium">{formattedIdea.angle}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">Resumo</p>
                  <p className="text-sm text-muted-foreground">{formattedIdea.summary}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                {images.length < 3 && (
                  <button
                    type="button"
                    onClick={openAddDialog}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg border border-border/60 hover:border-primary/40 bg-background/40"
                  >
                    <Images className="w-3.5 h-3.5" />
                    Adicionar Imagem
                  </button>
                )}
                {selectedBrand?.logo_url && (
                  <div className="inline-flex items-center gap-2">
                    <Label htmlFor="logo-toggle-ideia" className="text-xs text-muted-foreground cursor-pointer">
                      Enviar Logo
                    </Label>
                    <Switch id="logo-toggle-ideia" checked={includeLogo} onCheckedChange={setIncludeLogo} />
                  </div>
                )}
              </div>
              {images.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {images.map((file, idx) => (
                    <div key={idx} className="relative group w-20 h-20 shrink-0">
                      <img src={imagePreviews[idx]} alt={file.name} className="w-full h-full rounded-xl object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center gap-2">
                        <button type="button" onClick={() => openEditDialog(idx)} className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-display text-foreground">Formato do Criativo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "1:1", label: "1:1", desc: "Feed" },
                  { value: "4:5", label: "4:5", desc: "Feed vertical" },
                  { value: "9:16", label: "9:16", desc: "Stories/Reels" },
                  { value: "16:9", label: "16:9", desc: "Landscape" },
                ].map((f) => (
                  <div
                    key={f.value}
                    className={`rounded-xl p-4 border-2 cursor-pointer transition-all text-center ${
                      format === f.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40 bg-background/50"
                    }`}
                    onClick={() => setFormat(f.value)}
                  >
                    <span className="font-display text-foreground">{f.label}</span>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <Dialog open={generatingCreative} onOpenChange={() => {}}>
              <DialogContent className="sm:max-w-sm [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="text-center font-normal">Gerando seu criativo...</DialogTitle>
                </DialogHeader>
                <GenerationProgress
                  isActive={generatingCreative}
                  type="creative"
                  onTimeout={() => {
                    toast({ title: "Geração demorada", description: "O processo está demorando mais que o esperado. Se persistir, tente novamente.", variant: "destructive" });
                  }}
                />
              </DialogContent>
            </Dialog>

            <div className="flex gap-4 justify-center pt-4">
              <Button variant="outline" onClick={resetWizard}>Novo Criativo</Button>
              <Button
                variant="hero"
                onClick={handleGenerateCreative}
                disabled={!formattedIdea || generatingCreative}
              >
                {generatingCreative ? "Gerando criativo..." : <><Sparkles className="w-4 h-4" /> Gerar Criativo</>}
              </Button>
            </div>
          </div>
        )}

        {step === CRIAR_STEP && method !== "ideia" && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display text-foreground">Gerando suas copies...</h2>
                <p className="text-muted-foreground text-sm">A IA está criando 3 ângulos de copy para "{productName}"</p>
              </div>
            </div>
          ) : generatedAngles ? (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-display text-foreground mb-2">Escolha o ângulo da copy</h2>
                <p className="text-muted-foreground text-sm">Selecione a copy que melhor representa seu anúncio</p>
              </div>

              <div className="space-y-4">
                {generatedAngles
                  .filter((_, idx) => selectedAngle === null || selectedAngle === idx)
                  .map((angle, _unused, arr) => {
                    const angleIdx = generatedAngles.indexOf(angle);
                    const isSelected = selectedAngle === angleIdx;
                    return (
                      <div
                        key={angleIdx}
                        className={`gradient-card rounded-2xl p-6 shadow-card transition-all duration-200 ${
                          isSelected ? "ring-2 ring-primary/30" : "cursor-pointer hover:ring-1 hover:ring-primary/20"
                        }`}
                        onClick={() => !isSelected && setSelectedAngle(angleIdx)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                                {angleLabels[angleIdx] || angle.angle_name}
                              </span>
                            </div>
                            <h3 className="text-xl font-display text-foreground">{angle.headline}</h3>
                            {angle.subheadline && (
                              <p className="text-sm text-muted-foreground font-medium">{angle.subheadline}</p>
                            )}
                            <p className="text-sm text-foreground/80">{angle.body}</p>
                            <div className="pt-2">
                              <span className="inline-block px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold">
                                {angle.cta}
                              </span>
                            </div>

                            {isSelected && (
                              <div
                                className="pt-3 mt-1 border-t border-border/50 space-y-3 animate-fade-in"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-4 flex-wrap">
                                  {images.length < 3 && (
                                    <button
                                      type="button"
                                      onClick={openAddDialog}
                                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg border border-border/60 hover:border-primary/40 bg-background/40"
                                    >
                                      <Images className="w-3.5 h-3.5" />
                                      Adicionar Imagem
                                    </button>
                                  )}
                                  {selectedBrand?.logo_url && (
                                    <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Label htmlFor="logo-toggle" className="text-xs text-muted-foreground cursor-pointer">
                                        Enviar Logo
                                      </Label>
                                      <Switch id="logo-toggle" checked={includeLogo} onCheckedChange={setIncludeLogo} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedAngle(null); setImages([]); setImageInstructions([]); }}
                              className="inline-flex items-center gap-1 text-xs text-red-400/80 hover:text-red-500 bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ml-4 mt-0.5"
                            >
                              <X className="w-3 h-3" />
                              Trocar ângulo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {selectedAngle !== null && (images.length > 0 || (includeLogo && !!selectedBrand?.logo_url)) && (
                <div className="flex gap-3 flex-wrap animate-fade-in">
                  {images.map((file, idx) => (
                    <div key={idx} className="relative group w-20 h-20 shrink-0">
                      <img src={imagePreviews[idx]} alt={file.name} className="w-full h-full rounded-xl object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center gap-2">
                        <button type="button" onClick={() => openEditDialog(idx)} className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button type="button" onClick={() => removeImage(idx)} className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedAngle !== null && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-3">
                    <h3 className="text-base font-display text-foreground">Formato do Criativo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: "1:1", label: "1:1", desc: "Feed" },
                        { value: "4:5", label: "4:5", desc: "Feed vertical" },
                        { value: "9:16", label: "9:16", desc: "Stories/Reels" },
                        { value: "16:9", label: "16:9", desc: "Landscape" },
                      ].map((f) => (
                        <div
                          key={f.value}
                          className={`rounded-xl p-4 border-2 cursor-pointer transition-all text-center ${
                            format === f.value
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/40 bg-background/50"
                          }`}
                          onClick={() => setFormat(f.value)}
                        >
                          <span className="font-display text-foreground">{f.label}</span>
                          <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Dialog open={generatingCreative} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-sm [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="text-center font-normal">Gerando seu criativo...</DialogTitle>
                  </DialogHeader>
                  <GenerationProgress
                    isActive={generatingCreative}
                    type="creative"
                    onTimeout={() => {
                      toast({ title: "Geração demorada", description: "O processo está demorando mais que o esperado. Se persistir, tente novamente.", variant: "destructive" });
                    }}
                  />
                </DialogContent>
              </Dialog>

              <div className="flex gap-4 justify-center pt-4">
                <Button variant="outline" onClick={resetWizard}>Novo Criativo</Button>
                <Button
                  variant="hero"
                  onClick={handleGenerateCreative}
                  disabled={selectedAngle === null || generatingCreative}
                >
                  {generatingCreative ? "Gerando criativo..." : <><Sparkles className="w-4 h-4" /> Gerar Criativo</>}
                </Button>
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* ── Image dialog ─────────────────────────────────────────────────── */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingImageIdx !== null ? "Editar imagem" : "Adicionar imagem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <ImageUpload images={dialogImage} onImagesChange={setDialogImage} maxImages={1} />
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Orientações de uso (opcional)</Label>
              <Textarea
                value={dialogInstruction}
                onChange={(e) => setDialogInstruction(e.target.value)}
                placeholder="Ex: usar como mockup em celular, destacar como produto principal, usar como background..."
                className="resize-none text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={handleDialogConfirm} disabled={dialogImage.length === 0}>
              {editingImageIdx !== null ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InsufficientCreditsDialog
        open={isCreditsDialogOpen}
        onClose={() => setIsCreditsDialogOpen(false)}
        creditsNeeded={10}
        creditsAvailable={credits?.credits_balance ?? 0}
      />
    </div>
  );
};

export default CreateCreative;
