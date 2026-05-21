import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Share2, Building2, Users, ArrowRight } from "lucide-react";

type UpgradeFeature = "calendar" | "social_media" | "brands" | "social_profiles";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  feature: UpgradeFeature;
  currentPlan?: string | null;
  currentLimit?: number | null;
  currentCount?: number;
}

const FEATURE_INFO: Record<UpgradeFeature, { icon: ElementType; title: string; description: string }> = {
  calendar: {
    icon: CalendarDays,
    title: "Calendário de Conteúdo",
    description: "Agende e organize suas publicações com o calendário editorial.",
  },
  social_media: {
    icon: Share2,
    title: "Publicação em Redes Sociais",
    description: "Publique criativos diretamente no Instagram e Facebook.",
  },
  brands: {
    icon: Building2,
    title: "Limite de Marcas",
    description: "Você atingiu o limite de marcas do seu plano atual.",
  },
  social_profiles: {
    icon: Users,
    title: "Limite de Perfis Sociais",
    description: "Você atingiu o limite de perfis sociais conectados.",
  },
};

const PLAN_CARDS = [
  {
    name: "Advanced",
    slug: "advanced",
    price: "R$ 99,90/mês",
    highlights: ["10 marcas", "Calendário editorial", "Publicação social", "2 perfis sociais"],
  },
  {
    name: "Social Media",
    slug: "social-media",
    price: "R$ 199,90/mês",
    highlights: ["Marcas ilimitadas", "Calendário editorial", "Publicação social", "6 perfis sociais"],
    featured: true,
  },
];

const UpgradeDialog = ({ open, onClose, feature, currentPlan, currentLimit, currentCount }: UpgradeDialogProps) => {
  const navigate = useNavigate();
  const { icon: Icon, title } = FEATURE_INFO[feature];

  const description =
    feature === "brands" && currentLimit != null
      ? `Você atingiu o limite de ${currentLimit} marca${currentLimit !== 1 ? "s" : ""} do plano ${currentPlan ?? "atual"}. Faça upgrade para criar mais marcas.`
      : FEATURE_INFO[feature].description;

  const handleViewPlans = () => {
    onClose();
    navigate("/subscription");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="font-display font-normal">{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {PLAN_CARDS.map((plan) => (
            <div
              key={plan.slug}
              className={`rounded-xl border p-4 ${plan.featured ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-foreground">{plan.name}</span>
                <span className="text-sm font-medium text-primary">{plan.price}</span>
              </div>
              <ul className="space-y-1">
                {plan.highlights.map((h) => (
                  <li key={h} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button variant="hero" onClick={handleViewPlans} className="flex-1">
            Ver planos <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;
