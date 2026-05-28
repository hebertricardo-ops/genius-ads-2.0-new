import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectiveDialogProps {
  open: boolean;
  onClose: () => void;
  creationType: "creative" | "carousel";
  onConfirm: (
    objective: "engajamento" | "venda",
    method: "zero" | "ideia" | "link"
  ) => void;
}

const ObjectiveDialog = ({ open, onClose, onConfirm }: ObjectiveDialogProps) => {
  const [objective, setObjective] = useState<"engajamento" | "venda" | null>(null);
  const [method, setMethod] = useState<"zero" | "ideia" | "link" | null>(null);

  const reset = () => {
    setObjective(null);
    setMethod(null);
  };

  const handleConfirm = () => {
    if (!objective || !method) return;
    onConfirm(objective, method);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        <div className="px-8 pt-8 pb-6 space-y-7 bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-normal text-foreground text-center">
              Como vamos criar?
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Defina o objetivo e a forma de criação antes de começar
            </p>
          </DialogHeader>

          {/* Seção 1 — Objetivo */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-foreground">Qual o objetivo deste post?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "engajamento" as const,
                  emoji: "🤝",
                  label: "Engajamento",
                  desc: "Curtidas, comentários, compartilhamentos e salvamentos",
                },
                {
                  value: "venda" as const,
                  emoji: "💰",
                  label: "Venda",
                  desc: "Converter em cliente ou usar no Meta ADS",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setObjective(opt.value)}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-xl p-4 text-left transition-all duration-150 shadow-sm",
                    "hover:shadow-md hover:bg-primary/10 hover:ring-1 hover:ring-primary/30",
                    objective === opt.value
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-white"
                  )}
                >
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <span className="text-xs font-medium text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Seção 2 — Método */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-foreground">Como você quer criar?</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  value: "zero" as const,
                  emoji: "✨",
                  label: "Do Zero",
                  desc: "Preencha os campos manualmente",
                },
                {
                  value: "ideia" as const,
                  emoji: "💡",
                  label: "Pela Ideia",
                  desc: "Descreva sua ideia e a IA formata",
                },
                {
                  value: "link" as const,
                  emoji: "🔗",
                  label: "Pelo Link",
                  desc: "Cole um link e a IA extrai o conteúdo",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMethod(opt.value)}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-xl p-4 text-left transition-all duration-150 shadow-sm",
                    "hover:shadow-md hover:bg-primary/10 hover:ring-1 hover:ring-primary/30",
                    method === opt.value
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-white"
                  )}
                >
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <span className="text-xs font-medium text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="hero"
            className="w-full"
            onClick={handleConfirm}
            disabled={!objective || !method}
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObjectiveDialog;
