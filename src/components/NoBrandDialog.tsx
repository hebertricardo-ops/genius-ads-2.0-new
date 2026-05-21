import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Tag, ArrowRight, Plus } from "lucide-react";

interface NoBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NoBrandDialog = ({ open, onOpenChange }: NoBrandDialogProps) => {
  const navigate = useNavigate();

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Illustration area */}
        <div className="relative h-48 w-full bg-gradient-to-br from-amber-500/20 via-orange-400/10 to-background flex items-center justify-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-amber-400/10" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-orange-400/5" />

          {/* Central icon composition */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-background border-2 border-amber-400/40 shadow-xl flex items-center justify-center">
                <Building2 className="w-9 h-9 text-amber-500" />
              </div>
              {/* Tag badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center shadow">
                <Tag className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Dashed connector hint */}
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
              ))}
            </div>

            {/* Blocked creative placeholder */}
            <div className="flex items-center gap-2 bg-background/60 border border-border rounded-xl px-4 py-2 shadow backdrop-blur-sm">
              <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded bg-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-16 rounded bg-muted-foreground/20" />
                <div className="h-1.5 w-10 rounded bg-muted-foreground/10" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-xl font-display text-foreground mb-2">
              Nenhuma marca selecionada
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para gerar criativos, você precisa ter uma marca ativa. A IA usa os dados da marca — identidade visual, tom de voz e público — para criar anúncios alinhados ao seu negócio.
            </p>
          </div>

          {/* Divider with label */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">O que você quer fazer?</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="hero"
              className="w-full"
              onClick={() => go("/brands/new")}
            >
              <Plus className="w-4 h-4" />
              Criar Nova Marca
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => go("/brands")}
            >
              <Tag className="w-4 h-4" />
              Gerenciar Marcas Existentes
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Você também pode selecionar uma marca diretamente no menu lateral.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoBrandDialog;
