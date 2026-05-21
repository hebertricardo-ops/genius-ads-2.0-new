import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Edit, Trash2, Check, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useBrandContext } from "@/contexts/BrandContext";
import { useBrands } from "@/hooks/useBrands";
import { usePlan } from "@/hooks/usePlan";
import UpgradeDialog from "@/components/UpgradeDialog";

const OBJECTIVE_LABELS: Record<string, string> = {
  vender: "Vender produtos/serviços",
  engajamento: "Aumentar Engajamento",
  autoridade: "Construir Autoridade",
  leads: "Gerar Leads Qualificados",
};

const BrandsManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { brands, createBrand, deleteBrand, setActiveBrand } = useBrands();
  const { selectedBrand, setSelectedBrand, brands: brandList } = useBrandContext();
  const { maxBrands, hasSubscription, isLoading: planLoading } = usePlan();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const freeLimit = 1;
  const effectiveLimit = hasSubscription ? maxBrands : freeLimit;
  const atLimit = effectiveLimit !== null && brandList.length >= effectiveLimit;

  const handleSelect = (brand: typeof brandList[0]) => {
    setSelectedBrand(brand);
    setActiveBrand.mutate(brand.id);
    toast({ title: `Marca "${brand.name}" selecionada` });
  };

  const handleDuplicate = async (brand: typeof brandList[0]) => {
    try {
      const { id, user_id, created_at, updated_at, ...rest } = brand as any;
      await createBrand.mutateAsync({
        ...rest,
        name: `${brand.name} (cópia)`,
        is_active: false,
      });
      toast({ title: `Marca "${brand.name}" duplicada com sucesso` });
    } catch (e: any) {
      if (e?.code === "BRAND_LIMIT_REACHED") {
        setUpgradeOpen(true);
      } else {
        toast({ title: "Erro ao duplicar", description: e.message, variant: "destructive" });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBrand.mutateAsync(deleteTarget.id);
      toast({ title: `Marca "${deleteTarget.name}" excluída` });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const isLoading = brands.isLoading;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-1">Gerenciar Marcas</h1>
          <p className="text-muted-foreground text-sm">
            {brandList.length} marca{brandList.length !== 1 ? "s" : ""} cadastrada{brandList.length !== 1 ? "s" : ""}
            {effectiveLimit !== null ? ` · limite: ${effectiveLimit}` : " · ilimitado"}
          </p>
        </div>
        <Button
          variant="hero"
          onClick={() => atLimit ? setUpgradeOpen(true) : navigate("/brands/new")}
        >
          <Plus className="w-4 h-4" />
          Nova Marca
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && brandList.length === 0 && (
        <div className="gradient-card rounded-2xl border border-border p-12 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-display text-foreground mb-2">Nenhuma marca cadastrada</h2>
          <p className="text-muted-foreground mb-6">Crie sua primeira marca para começar a gerar criativos personalizados.</p>
          <Button variant="hero" onClick={() => navigate("/brands/new")}>
            <Plus className="w-4 h-4" />
            Criar Primeira Marca
          </Button>
        </div>
      )}

      {/* Brand cards */}
      {!isLoading && brandList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          {brandList.map((brand) => {
            const isSelected = selectedBrand?.id === brand.id;
            const initials = brand.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const objectiveLabel = brand.objective ? OBJECTIVE_LABELS[brand.objective] ?? brand.objective : null;
            const colors = [
              { label: "Primária", value: brand.color_primary },
              { label: "Secundária", value: brand.color_secondary },
              { label: "Destaque", value: brand.color_accent },
            ].filter(c => !!c.value);

            return (
              <div
                key={brand.id}
                className={`gradient-card rounded-2xl border-2 p-5 shadow-card transition-all ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Logo / Avatar */}
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="w-12 h-12 rounded-xl object-contain bg-white border border-border shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-primary font-display font-semibold text-lg shrink-0 border border-primary/20"
                      style={{ backgroundColor: brand.color_primary ? `${brand.color_primary}20` : undefined }}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name + active badge */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-foreground truncate flex-1">{brand.name}</h3>
                      {isSelected && (
                        <Badge className="text-[10px] px-1.5 py-0 shrink-0 bg-green-500/15 text-green-600 border-0 hover:bg-green-500/15 dark:text-green-400">
                          <Check className="w-2.5 h-2.5 mr-1" /> Ativa
                        </Badge>
                      )}
                    </div>

                    {/* Objective badge */}
                    {objectiveLabel && (
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                        {objectiveLabel}
                      </span>
                    )}

                    {/* Description */}
                    {brand.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {brand.description}
                      </p>
                    )}

                    {/* Color swatches */}
                    {colors.length > 0 && (
                      <div className="flex items-center gap-3 pt-0.5">
                        {colors.map(({ label, value }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: value! }}
                            />
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
                  {!isSelected && (
                    <Button size="sm" variant="outline" onClick={() => handleSelect(brand)} className="flex-1">
                      <Check className="w-4 h-4" />
                      Selecionar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/brands/${brand.id}/edit`)}
                    className="text-xs w-24 justify-center"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDuplicate(brand)}
                    disabled={createBrand.isPending}
                    className="text-xs w-24 justify-center"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget({ id: brand.id, name: brand.name })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir marca?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Os criativos gerados com esta marca não serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="brands" />
    </div>
  );
};

export default BrandsManager;
