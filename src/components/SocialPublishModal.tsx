import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Loader2, Instagram, Facebook, CheckCircle2, CalendarDays, Send, AlertTriangle,
} from "lucide-react";
import { useSocialPublish } from "@/hooks/useSocialPublish";
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
  imageUrls?: string[];
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
  imageUrls,
  creativeId,
  defaultCaption = "",
  brandId,
}: SocialPublishModalProps) => {
  const navigate = useNavigate();
  const { socialProfile, publishCreative } = useSocialPublish();

  const connectedPlatforms: string[] = socialProfile?.connected_platforms ?? [];
  const availablePlatforms = connectedPlatforms.length > 0
    ? PLATFORM_CONFIG.filter((p) => connectedPlatforms.includes(p.value))
    : PLATFORM_CONFIG; // fallback: show all if connected_platforms not yet synced

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    availablePlatforms.map((p) => p.value),
  );
  const [caption, setCaption] = useState(defaultCaption);
  const [mode, setMode] = useState<PublishMode>("now");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState<SuccessResult | null>(null);
  const [publishError, setPublishError] = useState("");

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
    setPublishError("");
  };

  const scheduledForISO = useMemo(() => {
    if (mode !== "schedule" || !scheduleDate) return null;
    const d = new Date(scheduleDate);
    const [h, m] = scheduleTime.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:00`;
  }, [mode, scheduleDate, scheduleTime]);

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      setPublishError("Selecione ao menos uma plataforma.");
      return;
    }
    if (!caption.trim()) {
      setPublishError("A legenda não pode estar vazia.");
      return;
    }
    if (mode === "schedule") {
      if (!scheduleDate) {
        setPublishError("Informe a data de agendamento.");
        return;
      }
      const scheduledDate = new Date(scheduleDate);
      const [h, m] = scheduleTime.split(":").map(Number);
      scheduledDate.setHours(h, m, 0, 0);
      if (scheduledDate <= new Date()) {
        setPublishError("A data de agendamento deve ser futura.");
        return;
      }
    }
    setPublishError("");

    setPublishing(true);
    try {
      const title = caption.trim().slice(0, 60);
      const allImageUrls = imageUrls && imageUrls.length > 0 ? imageUrls : [imageUrl];
      const isCarousel = allImageUrls.length > 1;
      const result = await publishCreative({
        creative_id: creativeId,
        brand_id: brandId,
        image_url: imageUrl,
        image_urls: allImageUrls,
        is_carousel: isCarousel,
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
      setPublishError(err.message ?? "Erro ao publicar. Tente novamente.");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    setCaption(defaultCaption);
    setSelectedPlatforms(availablePlatforms.map((p) => p.value));
    setMode("now");
    setScheduleDate(undefined);
    setCalendarOpen(false);
    setScheduleTime("12:00");
    setPublishError("");
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
              onChange={(e) => { setCaption(e.target.value.slice(0, CAPTION_MAX)); setPublishError(""); }}
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
                  onChange={() => { setMode("now"); setPublishError(""); }}
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
                  onChange={() => { setMode("schedule"); setPublishError(""); }}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Agendar para...</span>
              </label>
            </div>

            {mode === "schedule" && (
              <div className="flex gap-2 mt-3">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !scheduleDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarDays className="w-4 h-4 mr-2 shrink-0" />
                      {scheduleDate
                        ? format(scheduleDate, "dd/MM/yyyy", { locale: ptBR })
                        : "DD/MM/AAAA"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={(d) => { setScheduleDate(d); setCalendarOpen(false); setPublishError(""); }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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

        {publishError && (
          <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{publishError}</span>
          </div>
        )}

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
