import { useState, useEffect } from "react";
import { sanitizeFileName } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/ImageUpload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import CreditsBadge from "@/components/CreditsBadge";
import { Sparkles, Loader2, Package, Target, ShieldAlert, MessageSquare, Zap, Images, X, Pencil } from "lucide-react";
import GenerationProgress from "@/components/GenerationProgress";
import InsufficientCreditsDialog from "@/components/InsufficientCreditsDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useBrandContext } from "@/contexts/BrandContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CTASelector } from "@/components/CTASelector";

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

interface PrefillData {
  product_name: string;
  promise: string;
  pains: string;
  benefits: string;
  objections: string;
  cta: string;
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

const RegenerateCreative = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as any)?.prefill as PrefillData | undefined;
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { selectedBrand } = useBrandContext();
  const queryClient = useQueryClient();

  // Form fields
  const [productName, setProductName] = useState(prefill?.product_name ?? "");
  const [promise, setPromise] = useState(prefill?.promise ?? "");
  const [pains, setPains] = useState(prefill?.pains ?? "");
  const [benefits, setBenefits] = useState(prefill?.benefits ?? "");
  const [objections, setObjections] = useState(prefill?.objections ?? "");
  const [cta, setCta] = useState(prefill?.cta ?? "");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [creativeStyle, setCreativeStyle] = useState(
    selectedBrand?.visual_style ? (BRAND_VISUAL_STYLE_MAP[selectedBrand.visual_style] ?? "") : ""
  );

  // Generation state
  const [loading, setLoading] = useState(false);
  const [showAnglesView, setShowAnglesView] = useState(false);
  const [generatedAngles, setGeneratedAngles] = useState<CopyAngle[] | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [format, setFormat] = useState("1:1");
  const [imageModel, setImageModel] = useState("gpt-image-2");
  const [generatingCreative, setGeneratingCreative] = useState(false);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);

  // Image state
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageInstructions, setImageInstructions] = useState<string[]>([]);
  const [includeLogo, setIncludeLogo] = useState(true);

  // Image dialog state
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const [dialogImage, setDialogImage] = useState<File[]>([]);
  const [dialogInstruction, setDialogInstruction] = useState("");

  // Thumbnail preview URLs
  useEffect(() => {
    const urls = images.map(f => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [images]);

  if (!prefill) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Nenhuma informação de criativo encontrada.</p>
        <Button variant="hero" onClick={() => navigate("/history")}>Voltar ao Histórico</Button>
      </div>
    );
  }

  // Image dialog helpers
  const openAddDialog = () => {
    if (images.length >= 3) return;
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
      setImages(prev => [...prev, dialogImage[0]]);
      setImageInstructions(prev => [...prev, dialogInstruction]);
    }
    setImageDialogOpen(false);
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImageInstructions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!user) return;
    if ((credits?.credits_balance ?? 0) < 10) {
      setIsCreditsDialogOpen(true);
      return;
    }

    setShowAnglesView(true);
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
      setShowAnglesView(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCreative = async () => {
    if (selectedAngle === null || !generatedAngles || !user) return;
    const angle = generatedAngles[selectedAngle];
    const visual = angle.visual_concept;

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
          promise,
          pains,
          benefits,
          objections: objections || null,
          headline: angle.headline,
          body: angle.body,
          cta: angle.cta,
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
              angle_name: angle.angle_name,
              headline: angle.headline,
              subheadline: angle.subheadline,
              body: angle.body,
              cta: angle.cta,
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

  const angleLabels = ["🔴 Dor Principal", "🟢 Transformação", "🟡 Quebra de Objeção"];

  const editableFields = [
    { icon: Package, label: "Produto", value: productName, onChange: setProductName, type: "input" as const },
    { icon: Target, label: "Promessa", value: promise, onChange: setPromise, type: "input" as const },
    { icon: ShieldAlert, label: "Dores", value: pains, onChange: setPains, type: "textarea" as const },
    { icon: Sparkles, label: "Benefícios", value: benefits, onChange: setBenefits, type: "textarea" as const },
    { icon: MessageSquare, label: "Objeções", value: objections, onChange: setObjections, type: "textarea" as const },
    { icon: Zap, label: "CTA", value: cta, onChange: setCta, type: "input" as const },
    { icon: MessageSquare, label: "Orientações adicionais", value: additionalInstructions, onChange: setAdditionalInstructions, type: "textarea" as const },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <InsufficientCreditsDialog
        open={isCreditsDialogOpen}
        onClose={() => setIsCreditsDialogOpen(false)}
        creditsNeeded={10}
        creditsAvailable={credits?.credits_balance ?? 0}
      />

      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-display text-foreground mb-1">Gerar Novos Criativos</h1>
        <p className="text-muted-foreground text-sm">
          Dados do criativo anterior pré-carregados. Ajuste o que precisar e gere novas copies.
        </p>
      </div>

      {/* Form view */}
      {!showAnglesView && (
        <div className="space-y-6 animate-fade-in">
          {/* Editable fields */}
          <div className="gradient-card rounded-2xl border border-border p-6">
            <h2 className="font-display text-foreground text-lg mb-5">📋 Dados do Criativo</h2>
            <div className="space-y-5">
              {editableFields.map(({ icon: Icon, label, value, onChange, type }) => (
                <div key={label}>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
                      {label === "CTA" ? (
                        <CTASelector value={value} onChange={onChange} placeholder='Ex: "Compre agora com 30% OFF"' />
                      ) : type === "textarea" ? (
                        <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="text-sm min-h-[72px] bg-background/50" />
                      ) : (
                        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm bg-background/50" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="flex items-start gap-3">
                <div className="mt-2 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Créditos</Label>
                  <p className="text-sm text-muted-foreground">10 créditos por criativo</p>
                </div>
              </div>

              {/* Estilo */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estilo do Criativo</h3>
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
                  <p className="text-xs text-muted-foreground mt-2">Nenhum estilo selecionado — a IA escolherá automaticamente.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <CreditsBadge credits={credits?.credits_balance ?? 0} />
            <Button variant="hero" size="lg" onClick={handleGenerate} disabled={loading}>
              <Sparkles className="w-4 h-4" /> Gerar Ângulos de Copy
            </Button>
          </div>
        </div>
      )}

      {/* Angles view */}
      {showAnglesView && (
        <div className="space-y-8 animate-fade-in">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display text-foreground">Gerando suas copies...</h2>
                <p className="text-muted-foreground text-sm">A IA está criando 3 ângulos de copy para "{productName}"</p>
              </div>
            </div>
          ) : generatedAngles ? (
            <>
              <div className="text-center mb-2">
                <h2 className="text-2xl font-display text-foreground mb-2">Escolha o ângulo da copy</h2>
                <p className="text-muted-foreground text-sm">Selecione a copy que melhor representa seu anúncio</p>
              </div>

              {/* Angle cards */}
              <div className="space-y-4">
                {generatedAngles
                  .filter((_, idx) => selectedAngle === null || selectedAngle === idx)
                  .map((angle) => {
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
                            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                              {angleLabels[angleIdx] || angle.angle_name}
                            </span>
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

                            {/* Controls inside selected card */}
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
                                    <div
                                      className="inline-flex items-center gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Label htmlFor="logo-toggle-regen" className="text-xs text-muted-foreground cursor-pointer">
                                        Enviar Logo
                                      </Label>
                                      <Switch
                                        id="logo-toggle-regen"
                                        checked={includeLogo}
                                        onCheckedChange={setIncludeLogo}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAngle(null);
                                setImages([]);
                                setImageInstructions([]);
                              }}
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

              {/* Image thumbnails */}
              {selectedAngle !== null && images.length > 0 && (
                <div className="flex gap-3 flex-wrap animate-fade-in">
                  {images.map((file, idx) => (
                    <div key={idx} className="relative group w-20 h-20 shrink-0">
                      <img
                        src={imagePreviews[idx]}
                        alt={file.name}
                        className="w-full h-full rounded-xl object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDialog(idx)}
                          className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Format selector */}
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
                    <DialogTitle className="text-center">Gerando seu criativo...</DialogTitle>
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
                <Button variant="outline" onClick={() => { setShowAnglesView(false); setGeneratedAngles(null); setSelectedAngle(null); setImages([]); setImageInstructions([]); }}>
                  Voltar ao Formulário
                </Button>
                <Button
                  variant="hero"
                  onClick={handleGenerateCreative}
                  disabled={selectedAngle === null || generatingCreative}
                >
                  {generatingCreative ? "Gerando criativo..." : <><Sparkles className="w-4 h-4" /> Gerar Criativo</>}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Image dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingImageIdx !== null ? "Editar imagem" : "Adicionar imagem"}
            </DialogTitle>
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
    </div>
  );
};

export default RegenerateCreative;
