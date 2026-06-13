import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandContext } from "@/contexts/BrandContext";
import ObjectiveDialog from "@/components/ObjectiveDialog";

const CreativeIllustration = () => (
  <div className="w-24 h-28 bg-white rounded-xl shadow-md flex flex-col p-3 gap-2">
    <div className="w-full h-12 bg-orange-100 rounded-lg flex items-center justify-center">
      <div className="w-8 h-8 bg-orange-300 rounded-md opacity-80" />
    </div>
    <div className="h-2 bg-orange-200 rounded-full w-3/4" />
    <div className="h-2 bg-orange-100 rounded-full w-1/2" />
    <div className="h-2 bg-orange-100 rounded-full w-2/3" />
  </div>
);

const CarouselIllustration = () => (
  <div className="relative w-28 h-28">
    <div className="absolute top-5 right-0 w-20 h-24 bg-white/50 rounded-xl shadow-sm" />
    <div className="absolute top-2.5 right-2 w-20 h-24 bg-white/75 rounded-xl shadow-sm" />
    <div className="absolute top-0 right-4 w-20 h-24 bg-white rounded-xl shadow-md flex flex-col p-3 gap-2">
      <div className="w-full h-9 bg-purple-100 rounded-lg flex items-center justify-center">
        <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
          <div className="bg-purple-400 rounded-sm opacity-80" />
          <div className="bg-purple-400 rounded-sm opacity-80" />
          <div className="bg-purple-400 rounded-sm opacity-80" />
          <div className="bg-purple-400 rounded-sm opacity-80" />
        </div>
      </div>
      <div className="h-2 bg-purple-200 rounded-full w-3/4" />
      <div className="h-2 bg-purple-100 rounded-full w-1/2" />
    </div>
  </div>
);

const CreateSelect = () => {
  const navigate = useNavigate();
  const { selectedBrand } = useBrandContext();
  const [pendingType, setPendingType] = useState<"creative" | "carousel" | null>(null);
  const [showObjective, setShowObjective] = useState(false);

  const handleTypeSelect = (type: "creative" | "carousel") => {
    if (!selectedBrand) {
      navigate("/brands/new");
      return;
    }
    setPendingType(type);
    setShowObjective(true);
  };

  const handleObjectiveConfirm = (
    objective: "engajamento" | "venda",
    method: "zero" | "ideia" | "link"
  ) => {
    const path = pendingType === "creative" ? "/create" : "/create-carousel";
    navigate(path, { state: { objective, method } });
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      <div>
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-display font-normal">O que você quer criar hoje?</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o tipo de criativo para o seu próximo anúncio
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Criativo Estático */}
        <button
          onClick={() => handleTypeSelect("creative")}
          className="rounded-2xl bg-card text-left transition-all active:scale-[0.98] overflow-hidden flex flex-col hover:shadow-md shadow-sm"
        >
          <div className="relative bg-orange-50 dark:bg-orange-950/20 px-6 pt-8 pb-4 flex items-center justify-center min-h-[160px]">
            <span className="absolute top-3 right-3 text-[11px] font-normal bg-primary text-white rounded-full px-2.5 py-0.5 flex items-center gap-1">
              ✦ IA
            </span>
            <CreativeIllustration />
          </div>

          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <p className="font-display font-normal text-foreground text-base leading-tight">
                Criativo Estático
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Gere um post ou anuncio de imagem única para Feed, Stories ou Reels com copy gerada por IA.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {["1:1 Feed", "4:5 Vertical", "9:16 Stories"].map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-full px-2 py-0.5 whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Button className="w-full mt-auto" variant="hero" size="sm">
              Criar Agora →
            </Button>
          </div>
        </button>

        {/* Carrossel */}
        <button
          onClick={() => handleTypeSelect("carousel")}
          className="rounded-2xl bg-card text-left transition-all active:scale-[0.98] overflow-hidden flex flex-col hover:shadow-md shadow-sm"
        >
          <div className="relative bg-purple-50 dark:bg-purple-950/20 px-6 pt-8 pb-4 flex items-center justify-center min-h-[160px]">
            <span className="absolute top-3 right-3 text-[11px] font-normal bg-purple-600 text-white rounded-full px-2.5 py-0.5 flex items-center gap-1">
              ✦ IA
            </span>
            <CarouselIllustration />
          </div>

          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <p className="font-display font-normal text-foreground text-base leading-tight">
                Carrossel
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Crie uma sequência de slides narrativos para engajar e converter no Instagram e Facebook.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {["Até 8 slides", "Copy por IA", "Narrativa"].map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-full px-2 py-0.5 whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Button
              className="w-full mt-auto bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600"
              variant="ghost"
              size="sm"
            >
              Criar Agora →
            </Button>
          </div>
        </button>
      </div>

      <ObjectiveDialog
        open={showObjective}
        onClose={() => setShowObjective(false)}
        creationType={pendingType ?? "creative"}
        onConfirm={handleObjectiveConfirm}
      />
    </div>
  );
};

export default CreateSelect;
