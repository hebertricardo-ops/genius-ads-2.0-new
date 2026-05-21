import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2, Instagram, Facebook, CheckCircle2, CalendarDays, Send,
} from "lucide-react";
import { useSocialPublish } from "@/hooks/useSocialPublish";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CAPTION_MAX = 2200;

const PLATFORM_CONFIG = [
  { value: "instagram", label: "Instagram", Icon: Instagram, color: "text-pink-500" },
  { value: "facebook",  label: "Facebook",  Icon: Facebook,  color: "text-blue-500" },
];

interface SocialPublishModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  creativeId?: string;
  defaultCaption?: string;
  brandId?: string;
}

type PublishMode = "now" | "schedule";
type SuccessResult = { status: string; scheduledFor: string | null; calendarEntryId: string };

const SocialPublishModal = ({
  open,
  onClose,
  imageUrl,
  creativeId,
  defaultCaption = "",
  brandId,
}: SocialPublishModalProps) => {
  const navigate = useNavigate();
  const { socialProfile, publishCreative } = useSocialPublish();
  const { toast } = useToast();

  const connectedPlatforms: string[] = socialProfile?.connected_platforms ?? [];
  const availablePlatforms = connectedPlatforms.length > 0
    ? PLATFORM_CONFIG.filter((p) => connectedPlatforms.includes(p.value))
    : PLATFORM_CONFIG; // fallback: show all if connected_platforms not yet synced

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    availablePlatforms.map((p) => p.value),
  );
  const [caption, setCaption] = useState(defaultCaption);
  const [mode, setMode] = useState<PublishMode>("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState<SuccessResult | null>(null);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const scheduledForISO = useMemo(() => {
    if (mode !== "schedule" || !scheduleDate) return null;
    return new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
  }, [mode, scheduleDate, scheduleTime]);

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast({ title: "Selecione ao menos uma plataforma", variant: "destructive" });
      return;
    }
    if (!caption.trim()) {
      toast({ title: "A legenda não pode estar vazia", variant: "destructive" });
      return;
    }
    if (mode === "schedule") {
      if (!scheduleDate) {
        toast({ title: "Informe a data de agendamento", variant: "destructive" });
        return;
      }
      const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}:00`);
      if (scheduledDate <= new Date()) {
        toast({ title: "A data de agendamento deve ser futura", variant: "destructive" });
        return;
      }
    }

    setPublishing(true);
    try {
      const title = caption.trim().slice(0, 60);
      const result = await publishCreative({
        creative_id: creativeId,
        brand_id: brandId,
        image_url: imageUrl,
        caption: caption.trim(),
        platforms: selectedPlatforms,
        title,
        scheduled_for: scheduledForISO,
      });

      setSuccess({
        status: result.status,
        scheduledFor: scheduledForISO,
        calendarEntryId: result.calendar_entry_id,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao publicar",
        description: err.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    setCaption(defaultCaption);
    setSelectedPlatforms(availablePlatforms.map((p) => p.value));
    setMode("now");
    setScheduleDate("");
    setScheduleTime("12:00");
    onClose();
  };

  const scheduledDateLabel = scheduledForISO
    ? format(new Date(scheduledForISO), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : "";

  // ── Success screen ──
  if (success) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <div className="py-4 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h3 className="font-display text-xl text-foreground mb-1">
                {success.status === "scheduled" ? "Post agendado! ✅" : "Criativo publicado! 🎉"}
              </h3>
              {success.status === "scheduled" && scheduledDateLabel && (
                <p className="text-sm text-muted-foreground">
                  Agendado para {scheduledDateLabel}
                </p>
              )}
            </div>
            <div className="flex gap-2 w-full pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Fechar
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={() => { handleClose(); navigate("/calendario"); }}
              >
                <CalendarDays className="w-4 h-4" />
                Ver no calendário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Publish form ──
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display font-normal text-xl">
            <Send className="w-5 h-5 text-primary" />
            Publicar criativo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Image preview */}
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-28 h-28 rounded-xl object-cover border border-border shadow-card"
            />
          </div>

          {/* Platform checkboxes */}
          <div>
            <Label className="text-muted-foreground text-xs mb-2 block">Publicar em:</Label>
            <div className="flex gap-3">
              {availablePlatforms.map(({ value, label, Icon, color }) => {
                const checked = selectedPlatforms.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => togglePlatform(value)}
                    className={cn(
                      "flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                      checked
                        ? "border-primary/60 bg-primary/5 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-border/80",
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", checked ? color : "")} />
                    {label}
                    {checked && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-muted-foreground text-xs">Legenda:</Label>
              <span className={cn(
                "text-xs tabular-nums",
                caption.length > CAPTION_MAX * 0.9 ? "text-destructive" : "text-muted-foreground",
              )}>
                {caption.length}/{CAPTION_MAX}
              </span>
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
              rows={4}
              placeholder="Legenda do post..."
              className="resize-none text-sm"
            />
          </div>

          {/* Publish mode */}
          <div>
            <Label className="text-muted-foreground text-xs mb-2 block">Quando publicar:</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="pub-mode"
                  value="now"
                  checked={mode === "now"}
                  onChange={() => setMode("now")}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Publicar agora</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="pub-mode"
                  value="schedule"
                  checked={mode === "schedule"}
                  onChange={() => setMode("schedule")}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Agendar para...</span>
              </label>
            </div>

            {mode === "schedule" && (
              <div className="flex gap-2 mt-3">
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-28"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={publishing}>
            Cancelar
          </Button>
          <Button variant="hero" onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {publishing
              ? mode === "schedule" ? "Agendando..." : "Publicando..."
              : mode === "schedule" ? "Agendar publicação" : "Publicar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialPublishModal;
