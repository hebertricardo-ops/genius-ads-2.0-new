import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Sparkles, Image, BarChart2, BookOpen } from "lucide-react";

interface OnboardingDashboardDialogProps {
  open:    boolean;
  onClose: () => void;
}

const OnboardingDashboardDialog = ({ open, onClose }: OnboardingDashboardDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <div className="space-y-5 py-2">

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <LayoutDashboard className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-display font-normal">
              Seu dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Aqui você acompanha tudo e cria seus criativos
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: Sparkles,
                title: "Criar criativos",
                desc:  'Clique em "Criar" para gerar imagens e carrosséis com IA',
              },
              {
                icon: Image,
                title: "Últimas criações",
                desc:  "Veja e acesse todos os criativos gerados recentemente",
              },
              {
                icon: BarChart2,
                title: "Seus créditos",
                desc:  "Acompanhe quantos créditos você tem disponíveis",
              },
              {
                icon: BookOpen,
                title: "Biblioteca",
                desc:  "Acesse o histórico completo de tudo que foi gerado",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full gradient-primary min-h-[48px]" onClick={onClose}>
            Entendido, vamos começar! 🚀
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDashboardDialog;
