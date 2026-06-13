import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCreativeEditor, EditMessage, EditVersion } from "@/hooks/useCreativeEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Send, Loader2, ZoomIn, ZoomOut, Sparkles, ImageIcon,
  CheckCircle2, RotateCcw, History, Save, X, Paperclip, Check,
} from "lucide-react";

// ─── Element definitions ───────────────────────────────────────────────────

const ELEMENTS = [
  { key: "headline", label: "Título" },
  { key: "body", label: "Texto" },
  { key: "cta", label: "CTA" },
  { key: "background", label: "Fundo" },
  { key: "font_style", label: "Fonte" },
  { key: "color_palette", label: "Cores" },
  { key: "image", label: "Imagem" },
  { key: "free", label: "Livre" },
];

const ELEMENT_SUGGESTIONS: Record<string, string[]> = {
  headline: ["Deixe o título mais impactante", "Reduza para uma frase curta", "Adicione número ou dado", "Use uma pergunta provocadora", "Destaque a transformação do cliente"],
  body: ["Reescreva o texto principal", "Adicione prova social", "Destaque o benefício principal", "Use linguagem mais direta", "Reduza para no máximo 2 linhas"],
  cta: ["Troque para 'Saiba Mais'", "Use 'Compre agora'", "Adicione urgência no CTA", "Troque para 'Quero garantir'", "Use 'Clique e aproveite'"],
  background: ["Mude para fundo escuro", "Use gradiente moderno", "Fundo minimalista branco", "Adicione textura sutil", "Use a cor primária da marca"],
  font_style: ["Use fonte bold e moderna", "Tipografia mais elegante", "Contraste melhor entre títulos", "Aumente o tamanho do headline", "Misture serif com sans-serif"],
  color_palette: ["Paleta mais vibrante", "Tons mais sóbrios", "Mantenha só 2 cores", "Use alto contraste preto e branco", "Aplique a paleta da marca"],
  image: ["Substitua a imagem principal", "Adicione elemento visual diferente", "Remova o elemento de fundo", "Adicione ícone ou badge", "Use foto de pessoa ao invés de produto"],
  free: ["Melhore o equilíbrio visual", "Deixe o criativo mais limpo", "Aumente o apelo emocional", "Adicione elemento de urgência", "Modernize o layout geral"],
};

// ─── ElementsPanel ─────────────────────────────────────────────────────────

function ElementsPanel({
  selectedElement,
  onSelect,
  onSuggestion,
}: {
  selectedElement: string;
  onSelect: (key: string) => void;
  onSuggestion: (text: string) => void;
}) {
  const suggestions = ELEMENT_SUGGESTIONS[selectedElement] ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 border-r border-border bg-background h-full overflow-y-auto">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Elemento
        </p>
        <div className="flex flex-col gap-0.5">
          {ELEMENTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                selectedElement === key
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Sugestões
          </p>
          <div className="flex flex-col gap-1">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="text-left px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CanvasPanel ───────────────────────────────────────────────────────────

function CanvasPanel({
  imageUrl,
  isLoading,
  versionLabel,
}: {
  imageUrl: string;
  isLoading: boolean;
  versionLabel: string;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex flex-col h-full bg-black/40">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/60 backdrop-blur">
        <span className="text-xs text-muted-foreground font-medium">{versionLabel}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-white/80">Aplicando edição...</p>
          </div>
        )}
        <img
          src={imageUrl}
          alt="Criativo"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    </div>
  );
}

// ─── ChatPanel ─────────────────────────────────────────────────────────────

function ChatPanel({
  messages,
  isLoading,
  onSend,
  inputValue,
  setInputValue,
  imagePreviewUrl,
  onAttach,
  onRemoveAttachment,
}: {
  messages: EditMessage[];
  isLoading: boolean;
  onSend: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  imagePreviewUrl: string | null;
  onAttach: () => void;
  onRemoveAttachment: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-1.5", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-2.5 py-1.5 text-xs",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              )}
            >
              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                  <img src={msg.imageUrl} alt="Imagem" className="w-full h-auto object-contain" />
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-border">
        {/* Thumbnail da imagem anexada */}
        {imagePreviewUrl && (
          <div className="relative w-14 h-14 mb-2 shrink-0">
            <img
              src={imagePreviewUrl}
              alt="Imagem anexada"
              className="w-full h-full object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={onRemoveAttachment}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center shadow-sm"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        )}

        <div className="flex gap-1.5 items-end">
          {/* Botão de upload — abre seletor de arquivo */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
            onClick={onAttach}
            disabled={isLoading}
            title="Anexar imagem de referência"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </Button>

          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva a edição desejada..."
            className="min-h-[52px] max-h-[100px] text-xs resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={onSend}
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            className="h-8 w-8 shrink-0"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1 text-center">6 créditos por edição · Enter para enviar</p>
      </div>
    </div>
  );
}

// ─── VersionHistory ────────────────────────────────────────────────────────

function VersionHistory({
  versions,
  activeVersionIdx,
  onSelect,
}: {
  versions: EditVersion[];
  activeVersionIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-background overflow-x-auto shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Versões</span>
      </div>
      <div className="flex items-center gap-2">
        {versions.map((v, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={cn(
              "relative shrink-0 rounded-lg overflow-hidden border-2 transition-all",
              activeVersionIdx === idx ? "border-primary" : "border-border hover:border-primary/40"
            )}
          >
            <img
              src={v.imageUrl}
              alt={v.label}
              className="w-12 h-12 object-cover"
            />
            {v.isOriginal && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center py-0.5">
                Original
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CreativeEditor (main page) ────────────────────────────────────────────

const CreativeEditor = () => {
  const { creativeId } = useParams<{ creativeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const stateImageUrl: string | undefined = (location.state as any)?.imageUrl;
  const stateBrandId: string | null | undefined = (location.state as any)?.brandId;

  const { data: creative, isLoading: loadingCreative } = useQuery({
    queryKey: ["creative-for-editor", creativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_creatives")
        .select("*, creative_requests(product_name)")
        .eq("id", creativeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!creativeId && !!user,
  });

  const imageUrl: string = stateImageUrl ?? creative?.image_url ?? "";
  const brandId: string | null = stateBrandId ?? (creative as any)?.brand_id ?? null;
  const creativeFormat: string = (creative as any)?.copy_data?.format ?? "1:1";

  const {
    messages,
    versions,
    currentImageUrl,
    activeVersionIdx,
    selectedElement,
    isLoading,
    setSelectedElement,
    sendMessage,
    selectVersion,
  } = useCreativeEditor(imageUrl, creativeId);

  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [mobileTab, setMobileTab] = useState<"canvas" | "chat">("canvas");

  // Anexo de imagem no chat
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!attachedImage) { setAttachmentPreviewUrl(null); return; }
    const url = URL.createObjectURL(attachedImage);
    setAttachmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachedImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10 MB.", variant: "destructive" });
      return;
    }
    setAttachedImage(file);
  };

  const handleSaveVersion = async () => {
    const currentVersion = versions[activeVersionIdx];
    if (!currentVersion || activeVersionIdx === 0 || !user) return;

    setIsSaving(true);
    try {
      const { data: original } = await supabase
        .from("generated_creatives")
        .select("brand_id, copy_data")
        .eq("id", creativeId!)
        .single();

      const { error } = await supabase.from("generated_creatives").insert({
        user_id: user.id,
        image_url: currentVersion.imageUrl,
        request_id: null,
        carousel_request_id: null,
        brand_id: brandId ?? original?.brand_id ?? null,
        copy_data: {
          ...(original?.copy_data as object ?? {}),
          is_edit: true,
          edit_label: currentVersion.label,
          original_creative_id: creativeId,
        },
        credits_used: 6,
        source: "edit_ia",
      });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Versão salva na sua biblioteca ✅",
        description: `${currentVersion.label} adicionada ao histórico.`,
      });
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !creativeId) return;
    const msg = inputValue;
    const imageToSend = attachedImage;
    setInputValue("");
    setAttachedImage(null);

    let attachmentUrl: string | undefined;
    if (imageToSend && user) {
      try {
        const path = `${user.id}/${Date.now()}-${sanitizeFileName(imageToSend.name)}`;
        const { error: upErr } = await supabase.storage.from("creative-uploads").upload(path, imageToSend);
        if (!upErr) {
          const { data: signedData } = await supabase.storage
            .from("creative-uploads")
            .createSignedUrl(path, 600);
          if (signedData?.signedUrl) {
            attachmentUrl = signedData.signedUrl;
            console.log("[Editor] Imagem de referência pronta para envio:", attachmentUrl);
          }
        }
      } catch (err) {
        console.error("[Editor] Erro ao fazer upload da imagem de referência:", err);
      }
    }

    await sendMessage({
      userMessage: msg,
      editElement: selectedElement,
      originalCreativeId: creativeId,
      brandId,
      format: creativeFormat,
      attachmentUrl,
      onNewVersion: () => setIsSaved(false),
    });
  };

  const handleSuggestion = (text: string) => {
    setInputValue(text);
  };

  const versionLabel = activeVersionIdx === 0 ? "Original" : versions[activeVersionIdx]?.label ?? "Edição";

  if (loadingCreative || (!imageUrl && !loadingCreative)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        {loadingCreative ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : (
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Criativo não encontrado.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-display text-foreground">Editor de Criativo IA</h1>
            <p className="text-xs text-muted-foreground">
              {(creative as any)?.creative_requests?.product_name ?? "Edição com IA"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeVersionIdx > 0 && (
            <span className="text-sm text-muted-foreground">
              {activeVersionIdx} {activeVersionIdx === 1 ? "edição" : "edições"}
            </span>
          )}
          <Button
            onClick={handleSaveVersion}
            disabled={isSaving || isSaved || activeVersionIdx === 0}
            variant={isSaved ? "outline" : "default"}
            className={isSaved ? "gap-2 text-green-600 border-green-300" : "gap-2"}
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSaved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Salvando..." : isSaved ? "Versão salva!" : "Salvar Versão"}
          </Button>
        </div>
      </div>

      {/* Toggle de abas — apenas no mobile */}
      <div className="flex md:hidden border-b border-border shrink-0">
        <button
          onClick={() => setMobileTab("canvas")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === "canvas" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          🖼️ Criativo
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === "chat" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          💬 Editar com IA
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Elements panel — hidden on mobile */}
        <div className="hidden md:flex w-44 shrink-0 flex-col">
          <ElementsPanel
            selectedElement={selectedElement}
            onSelect={setSelectedElement}
            onSuggestion={handleSuggestion}
          />
        </div>

        {/* Canvas — esconde no mobile quando aba 'chat' */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab === "chat" ? "hidden md:flex" : "flex"}`}>
          <CanvasPanel
            imageUrl={currentImageUrl}
            isLoading={isLoading}
            versionLabel={versionLabel}
          />
        </div>

        {/* Chat panel — no mobile ocupa tela toda quando aba 'chat' */}
        <div className={`shrink-0 border-l border-border flex flex-col md:w-72 ${
          mobileTab === "canvas" ? "hidden md:flex" : "flex w-full"
        }`}>
          {/* Input oculto para seleção de arquivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            inputValue={inputValue}
            setInputValue={setInputValue}
            imagePreviewUrl={attachmentPreviewUrl}
            onAttach={() => fileInputRef.current?.click()}
            onRemoveAttachment={() => setAttachedImage(null)}
          />
        </div>
      </div>

      {/* Version history */}
      <VersionHistory
        versions={versions}
        activeVersionIdx={activeVersionIdx}
        onSelect={selectVersion}
      />
    </div>
  );
};

export default CreativeEditor;
