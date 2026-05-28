import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutList, ArrowRight, ImageIcon, Layers } from "lucide-react";
import ObjectiveDialog from "@/components/ObjectiveDialog";

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateDialog = ({ open, onOpenChange }: CreateDialogProps) => {
  const navigate = useNavigate();
  const [showObjective, setShowObjective] = useState(false);
  const [pendingType, setPendingType] = useState<"creative" | "carousel" | null>(null);

  const handleTypeSelect = (type: "creative" | "carousel") => {
    onOpenChange(false);
    setPendingType(type);
    setShowObjective(true);
  };

  const handleObjectiveConfirm = (
    objective: "engajamento" | "venda",
    method: "zero" | "ideia" | "link"
  ) => {
    setShowObjective(false);
    const path = pendingType === "creative" ? "/create" : "/create-carousel";
    navigate(path, { state: { objective, method } });
  };

  return (
    <>
    <ObjectiveDialog
      open={showObjective}
      onClose={() => setShowObjective(false)}
      creationType={pendingType ?? "creative"}
      onConfirm={handleObjectiveConfirm}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-normal text-foreground text-center">
              O que você quer criar hoje?
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Escolha o tipo de criativo para o seu próximo anúncio
            </p>
          </DialogHeader>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-8 pb-8">
          {/* Card — Criativo Estático */}
          <button
            type="button"
            onClick={() => handleTypeSelect("creative")}
            className="group relative flex flex-col rounded-2xl border-2 border-border bg-background overflow-hidden text-left transition-all duration-200 hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {/* Illustration */}
            <div className="relative h-44 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center overflow-hidden">
              {/* decorative bg circles */}
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-primary/10" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-primary/5" />

              {/* mock ad frame */}
              <div className="relative z-10 w-28 h-28 rounded-xl bg-background border-2 border-primary/30 shadow-xl flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5 w-full px-3">
                  <div className="h-1.5 rounded-full bg-primary/40 w-full" />
                  <div className="h-1.5 rounded-full bg-muted w-3/4" />
                  <div className="h-1.5 rounded-full bg-primary/60 w-1/2 mx-auto" />
                </div>
              </div>

              {/* Sparkles badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
                <Sparkles className="w-3 h-3" />
                IA
              </div>
            </div>

            {/* Info */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div>
                <h3 className="font-display text-foreground text-lg leading-tight">
                  Criativo Estático
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Gere um anúncio de imagem única para Feed, Stories ou Reels com copy gerada por IA.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {["1:1 Feed", "4:5 Vertical", "9:16 Stories"].map((f) => (
                  <span
                    key={f}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <Button
                variant="hero"
                size="sm"
                className="w-full mt-1 group-hover:shadow-md transition-shadow"
                tabIndex={-1}
              >
                Criar Agora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </button>

          {/* Card — Carrossel */}
          <button
            type="button"
            onClick={() => handleTypeSelect("carousel")}
            className="group relative flex flex-col rounded-2xl border-2 border-border bg-background overflow-hidden text-left transition-all duration-200 hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {/* Illustration */}
            <div className="relative h-44 w-full bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-background flex items-center justify-center overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-violet-500/10" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-purple-500/5" />

              {/* mock carousel frames */}
              <div className="relative z-10 flex items-center gap-2 group-hover:scale-105 transition-transform duration-300">
                {/* slide 1 — back */}
                <div className="w-20 h-20 rounded-lg bg-background/60 border border-violet-400/20 shadow flex flex-col items-center justify-center gap-1.5 rotate-[-6deg] -mr-3">
                  <div className="w-7 h-7 rounded bg-violet-400/20 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="w-10 h-1 rounded bg-violet-400/30" />
                </div>
                {/* slide 2 — front */}
                <div className="w-24 h-24 rounded-xl bg-background border-2 border-violet-500/50 shadow-xl flex flex-col items-center justify-center gap-2 z-10">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <LayoutList className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="space-y-1.5 w-full px-3">
                    <div className="h-1.5 rounded-full bg-violet-500/50 w-full" />
                    <div className="h-1.5 rounded-full bg-muted w-3/4" />
                  </div>
                </div>
                {/* slide 3 — back right */}
                <div className="w-20 h-20 rounded-lg bg-background/60 border border-violet-400/20 shadow flex flex-col items-center justify-center gap-1.5 rotate-[6deg] -ml-3">
                  <div className="w-7 h-7 rounded bg-violet-400/20 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="w-10 h-1 rounded bg-violet-400/30" />
                </div>
              </div>

              {/* badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-violet-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
                <Sparkles className="w-3 h-3" />
                IA
              </div>
            </div>

            {/* Info */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div>
                <h3 className="font-display text-foreground text-lg leading-tight">
                  Carrossel
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Crie uma sequência de slides narrativos para engajar e converter no Instagram e Facebook.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {["Até 8 slides", "Copy por IA", "Narrativa"].map((f) => (
                  <span
                    key={f}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-1 border-violet-500/40 text-violet-500 hover:bg-violet-500/10 hover:border-violet-500 group-hover:shadow-md transition-all"
                tabIndex={-1}
              >
                Criar Agora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CreateDialog;
