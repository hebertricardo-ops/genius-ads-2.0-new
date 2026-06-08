import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBrands } from "@/hooks/useBrands";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/utils";
import Stepper from "@/components/Stepper";
import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  PenLine, Globe, Instagram, ShoppingCart, TrendingUp, Trophy, Target,
  ArrowLeft, ArrowRight, Loader2, Tag, Check, Sparkles, AlertTriangle,
} from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { useBrandContext } from "@/contexts/BrandContext";
import UpgradeDialog from "@/components/UpgradeDialog";
import BrandExistsDialog from "@/components/BrandExistsDialog";

const STEPS = ["Objetivo", "Dados Básicos", "Público-Alvo", "Estilo Visual", "Identidade", "Revisão"];

const OBJECTIVES = [
  { icon: ShoppingCart, label: "Vender mais produtos/serviços", value: "vender" },
  { icon: TrendingUp, label: "Aumentar Engajamento", value: "engajamento" },
  { icon: Trophy, label: "Construir Autoridade", value: "autoridade" },
  { icon: Target, label: "Gerar Leads Qualificados", value: "leads" },
];

const VISUAL_STYLES = [
  "Moderno Tecnológico", "Moderno Profissional", "Clean Minimalista",
  "Premium Luxuoso", "Vibrante Chamativo", "Claro Light Minimalista",
  "Tecnológico Futurista", "Infantil Lúdico", "Romântico Minimalista",
  "Maternidade Premium", "Divertido Artístico", "Descrever Manualmente",
];

const VISUAL_STYLE_SLUG_MAP: Record<string, string> = {
  "moderno-tecnologico": "Moderno Tecnológico",
  "moderno-profissional": "Moderno Profissional",
  "clean-minimalista": "Clean Minimalista",
  "premium-luxuoso": "Premium Luxuoso",
  "vibrante-chamativo": "Vibrante Chamativo",
  "claro-light-minimalista": "Claro Light Minimalista",
  "tecnologico-futurista": "Tecnológico Futurista",
  "infantil-ludico": "Infantil Lúdico",
  "romantico-minimalista": "Romântico Minimalista",
  "maternidade-premium": "Maternidade Premium",
  "divertido-artistico": "Divertido Artístico",
};

const TONES = [
  "Descontraído", "Profissional", "Inspirador", "Educativo",
  "Divertido", "Acolhedor", "Direto", "Sofisticado",
  "Amigável", "Motivacional", "Agressivo",
];

const BrandSetup = () => {
  const navigate = useNavigate();
  const { id: brandId } = useParams<{ id: string }>();
  const isEditMode = !!brandId;
  const isCreating = !brandId;
  const { toast } = useToast();
  const { user } = useAuth();
  const { createBrand, updateBrand } = useBrands();

  // ─── Limit gate (creation only) ───────────────────────
  const { maxBrands, planName, hasSubscription, isLoading: planLoading } = usePlan();
  const { brands: brandList } = useBrandContext();
  const freeLimit = 1;
  const effectiveLimit = hasSubscription ? maxBrands : freeLimit;
  const isAtLimit = isCreating && effectiveLimit !== null && brandList.length >= effectiveLimit;

  // Navigation — edit mode starts at step 1 (skip method selection)
  const [step, setStep] = useState(isEditMode ? 1 : 0);

  // Step 0 — method
  const [method, setMethod] = useState<"manual" | "website" | "instagram" | null>(null);

  // Website scraping
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeLoadingMsg, setScrapeLoadingMsg] = useState("Acessando seu site...");
  const [isWebsiteFlow, setIsWebsiteFlow] = useState(false);
  const [scrapedLogoUrl, setScrapedLogoUrl] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [lowConfidenceFields, setLowConfidenceFields] = useState<Set<string>>(new Set());

  // Instagram scraping
  const [instagramHandle, setInstagramHandle] = useState("");
  const [isScrapingInstagram, setIsScrapingInstagram] = useState(false);
  const [scrapeInstagramError, setScrapeInstagramError] = useState<string | null>(null);
  const [instagramLoadingMsg, setInstagramLoadingMsg] = useState("Acessando seu perfil...");
  const [isInstagramFlow, setIsInstagramFlow] = useState(false);
  const [instagramProfile, setInstagramProfile] = useState<{ username: string; full_name: string; followers: number; profile_pic_url: string | null } | null>(null);
  const [instagramScrapedData, setInstagramScrapedData] = useState<any>(null);

  // Step 1 — objective
  const [objective, setObjective] = useState("");

  // Step 2 — basic data
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [differentials, setDifferentials] = useState("");

  // Step 3 — audience
  const [audienceAgeMin, setAudienceAgeMin] = useState<number | "">(18);
  const [audienceAgeMax, setAudienceAgeMax] = useState<number | "">(45);
  const [audienceGender, setAudienceGender] = useState("todos");
  const [audienceInterests, setAudienceInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [audiencePains, setAudiencePains] = useState("");
  const [audienceDesires, setAudienceDesires] = useState("");

  // Edit mode — existing logo from DB
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);

  // Step 4 — visual
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [colorPrimary, setColorPrimary] = useState("#ff6600");
  const [colorSecondary, setColorSecondary] = useState("#333333");
  const [colorAccent, setColorAccent] = useState("#ffffff");
  const [visualStyle, setVisualStyle] = useState("");
  const [visualStyleCustom, setVisualStyleCustom] = useState("");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  // Step 5 — identity
  const [toneOfVoice, setToneOfVoice] = useState<string[]>([]);
  const [formalityLevel, setFormalityLevel] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [showBrandExists, setShowBrandExists] = useState(false);
  const [takenBrandName, setTakenBrandName] = useState("");

  // ─── Fetch existing brand for edit mode ───────────────
  const db = supabase as any;
  const { data: existingBrand } = useQuery({
    queryKey: ["brand", brandId],
    queryFn: async () => {
      const { data, error } = await db
        .from("brands")
        .select("*")
        .eq("id", brandId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (!existingBrand) return;
    const b = existingBrand;
    if (b.objective) setObjective(b.objective);
    if (b.name) setName(b.name);
    if (b.description) setDescription(b.description);
    if (Array.isArray(b.benefits)) setBenefits(b.benefits.join("\n"));
    if (b.differentials) setDifferentials(b.differentials);
    if (b.audience_age_min != null) setAudienceAgeMin(b.audience_age_min);
    if (b.audience_age_max != null) setAudienceAgeMax(b.audience_age_max);
    if (b.audience_gender) setAudienceGender(b.audience_gender);
    if (Array.isArray(b.audience_interests)) setAudienceInterests(b.audience_interests);
    if (Array.isArray(b.audience_pains)) setAudiencePains(b.audience_pains.join("\n"));
    if (Array.isArray(b.audience_desires)) setAudienceDesires(b.audience_desires.join("\n"));
    if (b.logo_url) setExistingLogoUrl(b.logo_url);
    if (b.color_primary) setColorPrimary(b.color_primary);
    if (b.color_secondary) setColorSecondary(b.color_secondary);
    if (b.color_accent) setColorAccent(b.color_accent);
    if (b.visual_style) setVisualStyle(b.visual_style);
    if (b.visual_style_custom) setVisualStyleCustom(b.visual_style_custom);
    if (Array.isArray(b.tone_of_voice)) setToneOfVoice(b.tone_of_voice);
    if (b.formality_level) setFormalityLevel(b.formality_level);
    if (b.source_url) setWebsiteUrl(b.source_url);
  }, [existingBrand]);

  // ─── Field label with auto-fill badges ────────────────

  const FieldLabel = ({
    id, label, required, optional,
  }: { id: string; label: string; required?: boolean; optional?: boolean }) => (
    <div className="flex items-center gap-2 flex-wrap">
      <Label className="font-display">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {optional && <Badge variant="secondary" className="text-xs">Opcional</Badge>}
      {autoFilledFields.has(id) && !lowConfidenceFields.has(id) && (
        <Badge variant="secondary" className="text-xs gap-1 font-normal">
          <Sparkles className="w-3 h-3" /> Preenchido automaticamente
        </Badge>
      )}
      {autoFilledFields.has(id) && lowConfidenceFields.has(id) && (
        <Badge className="text-xs gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/10">
          ⚠️ Verifique
        </Badge>
      )}
    </div>
  );

  // ─── Helpers ────────────────────────────────────────

  const err = (field: string) => invalidFields.includes(field);

  const validate = (s: number): boolean => {
    const errors: string[] = [];
    if (s === 1 && !objective) errors.push("objective");
    if (s === 2) {
      if (!name.trim()) errors.push("name");
      if (!description.trim()) errors.push("description");
      if (!benefits.trim()) errors.push("benefits");
    }
    if (s === 3) {
      if (!audienceAgeMin || !audienceAgeMax) errors.push("age");
      if (!audienceGender) errors.push("gender");
      if (audienceInterests.length === 0) errors.push("interests");
      if (!audiencePains.trim()) errors.push("pains");
      if (!audienceDesires.trim()) errors.push("desires");
    }
    if (s === 4) {
      if (!visualStyle) errors.push("visual_style");
      if (visualStyle === "Descrever Manualmente" && !visualStyleCustom.trim()) errors.push("visual_style_custom");
    }
    if (s === 5) {
      if (toneOfVoice.length === 0) errors.push("tone");
      if (!formalityLevel) errors.push("formality");
    }
    if (errors.length > 0) {
      setInvalidFields(errors);
      toast({ title: "Preencha os campos obrigatórios para continuar", variant: "destructive" });
      return false;
    }
    setInvalidFields([]);
    return true;
  };

  const goNext = () => {
    if (!validate(step)) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    // In edit mode, step 1 goes back to /brands
    if (isEditMode && step === 1) {
      navigate("/brands");
      return;
    }
    // In website or instagram flow, step 2 goes back to step 0 (skip objective step)
    if ((isWebsiteFlow || isInstagramFlow) && step === 2) {
      setStep(0);
    } else {
      setStep(s => s - 1);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addInterest = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && interestInput.trim()) {
      e.preventDefault();
      const val = interestInput.trim();
      if (!audienceInterests.includes(val)) {
        setAudienceInterests(prev => [...prev, val]);
      }
      setInterestInput("");
    }
  };

  const toggleTone = (tone: string) => {
    if (toneOfVoice.includes(tone)) {
      setToneOfVoice(prev => prev.filter(t => t !== tone));
    } else if (toneOfVoice.length >= 3) {
      toast({ title: "Selecione no máximo 3 tons", variant: "destructive" });
    } else {
      setToneOfVoice(prev => [...prev, tone]);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const path = `${user!.id}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage.from("creative-uploads").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("creative-uploads").getPublicUrl(path).data.publicUrl;
  };

  // ─── Website scraping ─────────────────────────────

  const handleScrape = async () => {
    let url = websiteUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
      setWebsiteUrl(url);
    }

    setScrapeError(null);
    setIsScraping(true);
    setScrapeLoadingMsg("Acessando seu site...");

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setScrapeLoadingMsg("Lendo o conteúdo..."), 5000));
    timers.push(setTimeout(() => setScrapeLoadingMsg("Identificando sua marca..."), 10000));
    timers.push(setTimeout(() => setScrapeLoadingMsg("Quase lá..."), 18000));

    try {
      const { data, error } = await supabase.functions.invoke("brand-scrape-website", {
        body: { url },
      });

      timers.forEach(clearTimeout);

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao analisar o site.");

      const d = data.data as Record<string, unknown>;
      const conf = (data.confidence ?? {}) as Record<string, string>;

      const filled = new Set<string>();
      const lowConf = new Set<string>();

      // Logo detected from HTML
      if (d.logo_url && String(d.logo_url) !== "null") {
        setScrapedLogoUrl(String(d.logo_url));
        filled.add("logo");
      }

      // Basic data
      if (d.name) { setName(String(d.name)); filled.add("name"); }
      if (d.description) { setDescription(String(d.description)); filled.add("description"); }
      if (Array.isArray(d.benefits) && d.benefits.length) {
        setBenefits((d.benefits as string[]).join("\n")); filled.add("benefits");
      }
      if (d.differentials) { setDifferentials(String(d.differentials)); filled.add("differentials"); }

      // Objective
      if (d.objective) { setObjective(String(d.objective)); filled.add("objective"); }

      // Audience
      if (d.audience_age_min) { setAudienceAgeMin(Number(d.audience_age_min)); filled.add("age"); }
      if (d.audience_age_max) { setAudienceAgeMax(Number(d.audience_age_max)); }
      if (d.audience_gender) { setAudienceGender(String(d.audience_gender)); filled.add("gender"); }
      if (Array.isArray(d.audience_interests) && d.audience_interests.length) {
        setAudienceInterests(d.audience_interests as string[]); filled.add("interests");
      }
      if (Array.isArray(d.audience_pains) && d.audience_pains.length) {
        setAudiencePains((d.audience_pains as string[]).join("\n")); filled.add("pains");
      }
      if (Array.isArray(d.audience_desires) && d.audience_desires.length) {
        setAudienceDesires((d.audience_desires as string[]).join("\n")); filled.add("desires");
      }

      // Colors
      if (d.color_primary && d.color_primary !== "null") {
        setColorPrimary(String(d.color_primary)); filled.add("color_primary");
      }
      if (d.color_secondary && d.color_secondary !== "null") {
        setColorSecondary(String(d.color_secondary)); filled.add("color_secondary");
      }
      if (d.color_accent && d.color_accent !== "null") {
        setColorAccent(String(d.color_accent)); filled.add("color_accent");
      }

      // Visual style — map slug to display name
      if (d.visual_style) {
        const mapped = VISUAL_STYLE_SLUG_MAP[String(d.visual_style)];
        if (mapped) { setVisualStyle(mapped); filled.add("visual_style"); }
      }

      // Tone of voice — normalize to known TONES
      if (Array.isArray(d.tone_of_voice) && d.tone_of_voice.length) {
        const validTones = (d.tone_of_voice as string[])
          .map(t => TONES.find(known => known.toLowerCase() === t.toLowerCase()) ?? null)
          .filter(Boolean)
          .slice(0, 3) as string[];
        if (validTones.length) { setToneOfVoice(validTones); filled.add("tone"); }
      }

      // Formality
      if (d.formality_level) { setFormalityLevel(String(d.formality_level)); filled.add("formality"); }

      // Confidence mapping
      if (conf.colors === "low") {
        lowConf.add("color_primary"); lowConf.add("color_secondary"); lowConf.add("color_accent");
      }
      if (conf.audience === "low") {
        lowConf.add("age"); lowConf.add("gender");
        lowConf.add("interests"); lowConf.add("pains"); lowConf.add("desires");
      }

      setAutoFilledFields(filled);
      setLowConfidenceFields(lowConf);
      setIsWebsiteFlow(true);

      toast({
        title: "Site analisado com sucesso!",
        description: "Revise os campos antes de salvar.",
      });
      setStep(2);
    } catch (err: unknown) {
      timers.forEach(clearTimeout);
      setScrapeError(
        err instanceof Error ? err.message : "Erro ao analisar o site. Tente novamente."
      );
    } finally {
      setIsScraping(false);
    }
  };

  // ─── Instagram scraping ───────────────────────────

  const handleScrapeInstagram = async () => {
    const handle = instagramHandle.trim();
    if (!handle) return;

    setScrapeInstagramError(null);
    setIsScrapingInstagram(true);
    setInstagramProfile(null);
    setInstagramScrapedData(null);
    setInstagramLoadingMsg("Acessando seu perfil...");

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setInstagramLoadingMsg("Lendo seus posts..."), 8000));
    timers.push(setTimeout(() => setInstagramLoadingMsg("Analisando sua marca..."), 18000));
    timers.push(setTimeout(() => setInstagramLoadingMsg("Quase lá..."), 30000));

    try {
      const { data, error } = await supabase.functions.invoke("brand-scrape-instagram", {
        body: { instagram: handle },
      });

      timers.forEach(clearTimeout);

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao analisar o perfil.");

      setInstagramProfile(data.profile);
      setInstagramScrapedData(data);
    } catch (err: unknown) {
      timers.forEach(clearTimeout);
      setScrapeInstagramError(
        err instanceof Error ? err.message : "Erro ao analisar o perfil. Tente novamente."
      );
    } finally {
      setIsScrapingInstagram(false);
    }
  };

  const applyInstagramData = () => {
    if (!instagramScrapedData) return;

    const d = instagramScrapedData.data as Record<string, unknown>;
    const conf = (instagramScrapedData.confidence ?? {}) as Record<string, string>;

    const filled = new Set<string>();
    const lowConf = new Set<string>();

    if (d.logo_url && String(d.logo_url) !== "null") {
      setScrapedLogoUrl(String(d.logo_url));
      filled.add("logo");
    }

    if (d.name) { setName(String(d.name)); filled.add("name"); }
    if (d.description) { setDescription(String(d.description)); filled.add("description"); }
    if (Array.isArray(d.benefits) && d.benefits.length) {
      setBenefits((d.benefits as string[]).join("\n")); filled.add("benefits");
    }
    if (d.differentials) { setDifferentials(String(d.differentials)); filled.add("differentials"); }
    if (d.objective) { setObjective(String(d.objective)); filled.add("objective"); }

    if (d.audience_age_min) { setAudienceAgeMin(Number(d.audience_age_min)); filled.add("age"); }
    if (d.audience_age_max) { setAudienceAgeMax(Number(d.audience_age_max)); }
    if (d.audience_gender) { setAudienceGender(String(d.audience_gender)); filled.add("gender"); }
    if (Array.isArray(d.audience_interests) && d.audience_interests.length) {
      setAudienceInterests(d.audience_interests as string[]); filled.add("interests");
    }
    if (Array.isArray(d.audience_pains) && d.audience_pains.length) {
      setAudiencePains((d.audience_pains as string[]).join("\n")); filled.add("pains");
    }
    if (Array.isArray(d.audience_desires) && d.audience_desires.length) {
      setAudienceDesires((d.audience_desires as string[]).join("\n")); filled.add("desires");
    }

    if (d.visual_style) {
      const mapped = VISUAL_STYLE_SLUG_MAP[String(d.visual_style)];
      if (mapped) { setVisualStyle(mapped); filled.add("visual_style"); }
    }

    if (Array.isArray(d.tone_of_voice) && d.tone_of_voice.length) {
      const validTones = (d.tone_of_voice as string[])
        .map(t => TONES.find(known => known.toLowerCase() === t.toLowerCase()) ?? null)
        .filter(Boolean)
        .slice(0, 3) as string[];
      if (validTones.length) { setToneOfVoice(validTones); filled.add("tone"); }
    }

    if (d.formality_level) { setFormalityLevel(String(d.formality_level)); filled.add("formality"); }

    // Colors are always null from Instagram
    lowConf.add("color_primary"); lowConf.add("color_secondary"); lowConf.add("color_accent");
    if (conf.audience === "low") {
      lowConf.add("age"); lowConf.add("gender"); lowConf.add("interests"); lowConf.add("pains"); lowConf.add("desires");
    }
    if (conf.tone === "low") lowConf.add("tone");

    setAutoFilledFields(filled);
    setLowConfidenceFields(lowConf);
    setIsInstagramFlow(true);

    toast({ title: "Perfil analisado com sucesso!", description: "Revise os campos antes de salvar." });
    setStep(2);
  };

  // ─── Save ─────────────────────────────────────────

  const handleSave = async () => {
    if (!validate(5)) return;
    setSaving(true);
    try {
      let logoUrl: string | null = null;
      let referenceUrl: string | null = null;
      if (logoFiles[0]) {
        logoUrl = await uploadFile(logoFiles[0], "logos");
      } else if (scrapedLogoUrl) {
        logoUrl = scrapedLogoUrl;
      } else if (existingLogoUrl) {
        logoUrl = existingLogoUrl;
      }
      if (referenceFiles[0]) referenceUrl = await uploadFile(referenceFiles[0], "references");

      const brandData = {
        name: name.trim(),
        description: description.trim() || null,
        benefits: benefits.split("\n").map(b => b.trim()).filter(Boolean),
        differentials: differentials.trim() || null,
        objective,
        audience_age_min: audienceAgeMin ? Number(audienceAgeMin) : null,
        audience_age_max: audienceAgeMax ? Number(audienceAgeMax) : null,
        audience_gender: audienceGender,
        audience_interests: audienceInterests,
        audience_pains: audiencePains.split("\n").map(p => p.trim()).filter(Boolean),
        audience_desires: audienceDesires.split("\n").map(d => d.trim()).filter(Boolean),
        logo_url: logoUrl,
        color_primary: colorPrimary,
        color_secondary: colorSecondary,
        color_accent: colorAccent,
        visual_style: visualStyle,
        visual_style_custom: visualStyleCustom.trim() || null,
        reference_image_url: referenceUrl,
        tone_of_voice: toneOfVoice,
        formality_level: formalityLevel,
        source: isInstagramFlow ? "instagram" : isWebsiteFlow ? "website" : "manual",
        source_url: isInstagramFlow
          ? `https://instagram.com/${instagramProfile?.username}`
          : isWebsiteFlow
            ? websiteUrl
            : null,
      };

      if (isEditMode) {
        await updateBrand.mutateAsync({ id: brandId!, data: brandData });
        toast({ title: "Marca atualizada com sucesso!" });
        navigate("/brands");
      } else {
        await createBrand.mutateAsync({ ...brandData, is_active: true });
        toast({ title: "Marca configurada com sucesso!" });
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("BRAND_NAME_TAKEN:")) {
        const taken = err.message.replace("BRAND_NAME_TAKEN:", "");
        setTakenBrandName(taken);
        setShowBrandExists(true);
        return;
      }
      toast({
        title: isEditMode ? "Erro ao atualizar marca" : "Erro ao salvar marca",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Step renders ──────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-display text-foreground mb-2">Como você quer configurar sua marca?</h1>
        <p className="text-muted-foreground">Escolha o método que preferir para começar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: "manual" as const,
            icon: PenLine,
            title: "Preencher Manualmente",
            desc: "Preencho tudo eu mesmo",
          },
          {
            key: "website" as const,
            icon: Globe,
            title: "Informar URL do Site",
            desc: "Cole a URL do seu site",
          },
          {
            key: "instagram" as const,
            icon: Instagram,
            title: "Informar Instagram",
            desc: "Cole o @usuario ou link do perfil",
          },
        ].map(({ key, icon: Icon, title, desc }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setMethod(key); setScrapeError(null); }}
            className={cn(
              "gradient-card rounded-xl border-2 p-6 text-left transition-all duration-200 hover:border-primary/50",
              method === key ? "border-primary bg-primary/10" : "border-border"
            )}
          >
            <Icon className={cn("w-8 h-8 mb-4", method === key ? "text-primary" : "text-muted-foreground")} />
            <p className="font-display text-foreground mb-1">{title}</p>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </button>
        ))}
      </div>

      {/* Website input */}
      {method === "website" && (
        <div className="gradient-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-display text-foreground text-sm">Informe a URL do seu site</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Vamos ler seu site e preencher os campos automaticamente. Você poderá revisar tudo antes de salvar.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="https://meusite.com.br"
              value={websiteUrl}
              onChange={e => { setWebsiteUrl(e.target.value); setScrapeError(null); }}
              disabled={isScraping}
              onKeyDown={e => e.key === "Enter" && !isScraping && websiteUrl.trim() && handleScrape()}
            />
            <Button
              onClick={handleScrape}
              disabled={!websiteUrl.trim() || isScraping}
            >
              {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analisar"}
            </Button>
          </div>

          {isScraping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <span className="animate-pulse">{scrapeLoadingMsg}</span>
            </div>
          )}

          {scrapeError && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scrapeError}</span>
            </div>
          )}
        </div>
      )}

      {/* Instagram input */}
      {method === "instagram" && (
        <div className="gradient-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <Instagram className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-display text-foreground text-sm">Informe o perfil do Instagram</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Vamos analisar os posts e bio do perfil para preencher os campos automaticamente.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="@seuperfil ou https://instagram.com/seuperfil"
              value={instagramHandle}
              onChange={e => { setInstagramHandle(e.target.value); setScrapeInstagramError(null); }}
              disabled={isScrapingInstagram}
              onKeyDown={e => e.key === "Enter" && !isScrapingInstagram && instagramHandle.trim() && handleScrapeInstagram()}
            />
            <Button
              onClick={handleScrapeInstagram}
              disabled={!instagramHandle.trim() || isScrapingInstagram}
            >
              {isScrapingInstagram ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analisar"}
            </Button>
          </div>

          {isScrapingInstagram && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <span className="animate-pulse">{instagramLoadingMsg}</span>
            </div>
          )}

          {scrapeInstagramError && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scrapeInstagramError}</span>
            </div>
          )}

          {instagramProfile && !isScrapingInstagram && (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5 animate-fade-in">
              {instagramProfile.profile_pic_url ? (
                <img
                  src={instagramProfile.profile_pic_url}
                  alt={instagramProfile.full_name}
                  className="w-14 h-14 rounded-full border border-border object-cover shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full border border-border bg-primary/20 flex items-center justify-center shrink-0">
                  <Instagram className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{instagramProfile.full_name}</p>
                <p className="text-xs text-muted-foreground">@{instagramProfile.username}</p>
                <p className="text-xs text-muted-foreground">{instagramProfile.followers.toLocaleString("pt-BR")} seguidores</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Perfil identificado com sucesso
                </p>
              </div>
              <Button variant="hero" size="sm" onClick={applyInstagramData} className="shrink-0">
                Usar este perfil
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="hero"
          size="lg"
          disabled={method !== "manual"}
          onClick={() => method === "manual" && setStep(1)}
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display text-foreground mb-1">Objetivo Principal</h2>
        <p className="text-sm text-muted-foreground">Selecione o objetivo primário desta marca</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OBJECTIVES.map(({ icon: Icon, label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setObjective(value)}
            className={cn(
              "gradient-card rounded-xl border-2 p-5 flex items-center gap-4 text-left transition-all duration-200 hover:border-primary/50",
              objective === value ? "border-primary bg-primary/10" : "border-border",
              err("objective") && "border-destructive/50"
            )}
          >
            <Icon className={cn("w-8 h-8 shrink-0", objective === value ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("font-display text-sm", objective === value ? "text-primary" : "text-foreground")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-display text-foreground mb-1">Dados Básicos</h2>
        <p className="text-sm text-muted-foreground">Informações essenciais sobre o produto ou serviço</p>
      </div>

      <div className="space-y-2">
        <FieldLabel id="name" label="Nome do Produto/Serviço" required />
        <Input
          placeholder="Ex: Curso de Marketing Digital"
          value={name}
          onChange={e => setName(e.target.value)}
          className={cn(err("name") && "ring-2 ring-destructive")}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel id="description" label="Descrição" required />
        <Textarea
          rows={3}
          placeholder="Descreva brevemente o que é seu produto ou serviço..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className={cn(err("description") && "ring-2 ring-destructive")}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel id="benefits" label="Principais Benefícios" required />
        <Textarea
          rows={3}
          placeholder="Liste um benefício por linha..."
          value={benefits}
          onChange={e => setBenefits(e.target.value)}
          className={cn(err("benefits") && "ring-2 ring-destructive")}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel id="differentials" label="Diferenciais" optional />
        <Textarea
          rows={2}
          placeholder="O que torna sua oferta única frente à concorrência?"
          value={differentials}
          onChange={e => setDifferentials(e.target.value)}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display text-foreground mb-1">Público-Alvo</h2>
        <p className="text-sm text-muted-foreground">Defina para quem você está comunicando</p>
      </div>

      <div className="space-y-2">
        <FieldLabel id="age" label="Faixa de Idade" required />
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={13}
            max={80}
            value={audienceAgeMin}
            onChange={e => setAudienceAgeMin(e.target.value === "" ? "" : Number(e.target.value))}
            className={cn("w-24", err("age") && "ring-2 ring-destructive")}
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="number"
            min={13}
            max={80}
            value={audienceAgeMax}
            onChange={e => setAudienceAgeMax(e.target.value === "" ? "" : Number(e.target.value))}
            className={cn("w-24", err("age") && "ring-2 ring-destructive")}
          />
          <span className="text-muted-foreground text-sm">anos</span>
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel id="gender" label="Gênero" required />
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "masculino", label: "Masculino" },
            { value: "feminino", label: "Feminino" },
            { value: "todos", label: "Todos" },
          ].map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => setAudienceGender(g.value)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                audienceGender === g.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel id="interests" label="Interesses" required />
        <Input
          placeholder="Digite um interesse e pressione Enter..."
          value={interestInput}
          onChange={e => setInterestInput(e.target.value)}
          onKeyDown={addInterest}
          className={cn(err("interests") && "ring-2 ring-destructive")}
        />
        {audienceInterests.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {audienceInterests.map(interest => (
              <Badge
                key={interest}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => setAudienceInterests(prev => prev.filter(i => i !== interest))}
              >
                <Tag className="w-3 h-3" />
                {interest}
                <span className="ml-1 opacity-60">×</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel id="pains" label="Principais Dores" required />
        <Textarea
          rows={3}
          placeholder="Descreva os principais problemas que seu público enfrenta..."
          value={audiencePains}
          onChange={e => setAudiencePains(e.target.value)}
          className={cn(err("pains") && "ring-2 ring-destructive")}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel id="desires" label="Principais Desejos" required />
        <Textarea
          rows={3}
          placeholder="O que seu público mais quer alcançar ou conquistar?"
          value={audienceDesires}
          onChange={e => setAudienceDesires(e.target.value)}
          className={cn(err("desires") && "ring-2 ring-destructive")}
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display text-foreground mb-1">Estilo Visual</h2>
        <p className="text-sm text-muted-foreground">Defina a identidade visual da marca</p>
      </div>

      <div className="space-y-2">
        <FieldLabel id="logo" label="Logomarca" optional />

        {/* Existing logo in edit mode */}
        {isEditMode && existingLogoUrl && !scrapedLogoUrl && logoFiles.length === 0 && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30 animate-fade-in">
            <img
              src={existingLogoUrl}
              alt="Logo atual"
              className="w-14 h-14 rounded-lg border border-border object-contain bg-white p-1 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">Logo atual da marca</span>
              <p className="text-xs text-muted-foreground">Faça upload abaixo para substituir.</p>
            </div>
            <button
              type="button"
              onClick={() => setExistingLogoUrl(null)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              Remover
            </button>
          </div>
        )}

        {/* Logo detected from website */}
        {scrapedLogoUrl && logoFiles.length === 0 && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5 animate-fade-in">
            <img
              src={scrapedLogoUrl}
              alt="Logo detectada"
              className="w-14 h-14 rounded-lg border border-border object-contain bg-white p-1 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">Logo detectada automaticamente</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Será salva junto com a marca. Faça upload abaixo para substituir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScrapedLogoUrl(null)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              Remover
            </button>
          </div>
        )}

        <ImageUpload
          images={logoFiles}
          onImagesChange={setLogoFiles}
          maxImages={1}
          inputId="logo-upload"
        />
      </div>

      {isInstagramFlow && (
        <div className="flex items-start gap-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span className="text-amber-700">As cores não foram detectadas automaticamente via Instagram. Defina sua paleta de cores manualmente abaixo.</span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="font-display">Paleta de Cores</Label>
          {(autoFilledFields.has("color_primary") || autoFilledFields.has("color_secondary") || autoFilledFields.has("color_accent")) &&
            !lowConfidenceFields.has("color_primary") && (
              <Badge variant="secondary" className="text-xs gap-1 font-normal">
                <Sparkles className="w-3 h-3" /> Preenchido automaticamente
              </Badge>
            )}
          {(autoFilledFields.has("color_primary") || autoFilledFields.has("color_secondary") || autoFilledFields.has("color_accent")) &&
            lowConfidenceFields.has("color_primary") && (
              <Badge className="text-xs gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/10">
                ⚠️ Verifique
              </Badge>
            )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Cor Primária", value: colorPrimary, setter: setColorPrimary },
            { label: "Cor Secundária", value: colorSecondary, setter: setColorSecondary },
            { label: "Cor de Destaque", value: colorAccent, setter: setColorAccent },
          ].map(({ label, value, setter }) => (
            <div key={label} className="space-y-2">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg border border-border shadow-sm shrink-0"
                  style={{ backgroundColor: value }}
                />
                <Input
                  type="color"
                  value={value}
                  onChange={e => setter(e.target.value)}
                  className="h-10 w-full cursor-pointer p-1"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel id="visual_style" label="Estilo Visual" required />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {VISUAL_STYLES.map(style => (
            <button
              key={style}
              type="button"
              onClick={() => setVisualStyle(style)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm text-left transition-all duration-150 hover:border-primary/50",
                visualStyle === style
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground",
                err("visual_style") && "border-destructive/40"
              )}
            >
              {style === "Descrever Manualmente" ? "✏️ " + style : style}
            </button>
          ))}
        </div>
        {visualStyle === "Descrever Manualmente" && (
          <Textarea
            rows={3}
            placeholder="Descreva o estilo visual desejado para sua marca..."
            value={visualStyleCustom}
            onChange={e => setVisualStyleCustom(e.target.value)}
            className={cn("animate-fade-in", err("visual_style_custom") && "ring-2 ring-destructive")}
          />
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel id="reference" label="Referência Visual" optional />
        <p className="text-xs text-muted-foreground">Envie um criativo existente como referência de estilo</p>
        <ImageUpload
          images={referenceFiles}
          onImagesChange={setReferenceFiles}
          maxImages={1}
          inputId="reference-upload"
        />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display text-foreground mb-1">Identidade da Marca</h2>
        <p className="text-sm text-muted-foreground">Como sua marca se comunica com o público</p>
      </div>

      <div className="space-y-3">
        <FieldLabel id="tone" label="Tom de Voz" required />
        <p className="text-xs text-muted-foreground -mt-1">Selecione até 3</p>
        <div className="flex flex-wrap gap-2">
          {TONES.map(tone => (
            <button
              key={tone}
              type="button"
              onClick={() => toggleTone(tone)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm transition-all duration-150",
                toneOfVoice.includes(tone)
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
                err("tone") && !toneOfVoice.includes(tone) && "border-destructive/40"
              )}
            >
              {tone}
            </button>
          ))}
        </div>
        {toneOfVoice.length > 0 && (
          <p className="text-xs text-primary">{toneOfVoice.length}/3 tons selecionados</p>
        )}
      </div>

      <div className="space-y-3">
        <FieldLabel id="formality" label="Nível de Formalidade" required />
        <RadioGroup
          value={formalityLevel}
          onValueChange={setFormalityLevel}
          className="flex gap-6"
        >
          {["Informal", "Equilibrado", "Formal"].map(level => (
            <div key={level} className="flex items-center gap-2">
              <RadioGroupItem
                value={level.toLowerCase()}
                id={`formality-${level}`}
                className={cn(err("formality") && "border-destructive")}
              />
              <Label htmlFor={`formality-${level}`} className="cursor-pointer font-normal">
                {level}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );

  const renderStep6 = () => {
    const objectiveLabel = OBJECTIVES.find(o => o.value === objective)?.label ?? objective;
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl font-display text-foreground mb-1">Revisão</h2>
          <p className="text-sm text-muted-foreground">Confira os dados antes de salvar sua marca</p>
        </div>

        {isWebsiteFlow && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
            Dados extraídos automaticamente de <span className="text-primary truncate">{websiteUrl}</span>
          </div>
        )}
        {isInstagramFlow && instagramProfile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <Instagram className="w-3.5 h-3.5 text-primary shrink-0" />
            Dados extraídos automaticamente de <span className="text-primary">@{instagramProfile.username}</span>
          </div>
        )}

        {[
          {
            title: "Objetivo",
            items: [{ label: "Objetivo Principal", value: objectiveLabel }],
          },
          {
            title: "Dados Básicos",
            items: [
              { label: "Nome", value: name },
              { label: "Descrição", value: description },
              { label: "Benefícios", value: benefits.split("\n").filter(Boolean).join(" · ") },
              ...(differentials ? [{ label: "Diferenciais", value: differentials }] : []),
            ],
          },
          {
            title: "Público-Alvo",
            items: [
              { label: "Faixa de Idade", value: `${audienceAgeMin} – ${audienceAgeMax} anos` },
              { label: "Gênero", value: audienceGender.charAt(0).toUpperCase() + audienceGender.slice(1) },
              { label: "Interesses", value: audienceInterests.join(", ") || "—" },
              { label: "Dores", value: audiencePains.split("\n").filter(Boolean).join(" · ") },
              { label: "Desejos", value: audienceDesires.split("\n").filter(Boolean).join(" · ") },
            ],
          },
          {
            title: "Estilo Visual",
            items: [
              { label: "Estilo", value: visualStyle === "Descrever Manualmente" ? visualStyleCustom : visualStyle },
              { label: "Cor Primária", value: colorPrimary },
              { label: "Cor Secundária", value: colorSecondary },
              { label: "Cor de Destaque", value: colorAccent },
              ...(logoFiles[0]
                ? [{ label: "Logo", value: logoFiles[0].name }]
                : scrapedLogoUrl
                  ? [{ label: "Logo", value: isInstagramFlow ? "Foto de perfil do Instagram" : "Detectada automaticamente do site" }]
                  : existingLogoUrl
                    ? [{ label: "Logo", value: "Logo existente mantida" }]
                    : []),
            ],
          },
          {
            title: "Identidade",
            items: [
              { label: "Tom de Voz", value: toneOfVoice.join(", ") },
              { label: "Formalidade", value: formalityLevel.charAt(0).toUpperCase() + formalityLevel.slice(1) },
            ],
          },
        ].map(section => (
          <div key={section.title} className="gradient-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="font-display text-sm text-primary uppercase tracking-wide">{section.title}</h3>
            <div className="space-y-2">
              {section.items.map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <span className="text-muted-foreground text-sm w-32 shrink-0">{label}</span>
                  <span className="text-foreground text-sm flex-1">{value || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {isEditMode ? "Atualizar Marca" : "Salvar Marca"}
            </>
          )}
        </Button>
      </div>
    );
  };

  const stepContent = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
    renderStep6,
  ];

  // ─── Render ────────────────────────────────────────

  if (!planLoading && isAtLimit) {
    return (
      <UpgradeDialog
        open={true}
        onClose={() => navigate("/brands")}
        feature="brands"
        currentPlan={planName}
        currentLimit={effectiveLimit}
        currentCount={brandList.length}
      />
    );
  }

  return (
    <>
    <BrandExistsDialog
      open={showBrandExists}
      onClose={() => setShowBrandExists(false)}
      brandName={takenBrandName}
    />
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          {step > 0 && (
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-display text-foreground">
              {step === 0
                ? "Configurar Marca"
                : isEditMode
                  ? `Editar Marca — Passo ${step} de ${STEPS.length}`
                  : `Passo ${step} de ${STEPS.length}`}
            </h1>
            {step > 0 && (
              <p className="text-sm text-muted-foreground">{STEPS[step - 1]}</p>
            )}
          </div>
        </div>

        {step > 0 && (
          <Stepper steps={STEPS} currentStep={step - 1} />
        )}
      </div>

      {/* Step content */}
      <div className="gradient-card rounded-xl border border-border shadow-card p-6 md:p-8">
        {stepContent[step]?.()}
      </div>

      {/* Navigation (steps 1-5) */}
      {step >= 1 && step <= 5 && (
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button variant="hero" onClick={goNext}>
            {step === 5 ? "Revisar" : "Continuar"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
    </>
  );
};

export default BrandSetup;
