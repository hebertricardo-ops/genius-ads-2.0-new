import { Dialog, DialogContent, DialogHeader,
         DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface BrandExistsDialogProps {
  open:      boolean;
  onClose:   () => void;
  brandName: string;
}

const BrandExistsDialog = ({
  open, onClose, brandName,
}: BrandExistsDialogProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">

        <div className="flex justify-center pt-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        </div>

        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-xl font-display font-normal">
            Marca já cadastrada
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            A marca{" "}
            <strong className="text-foreground">"{brandName}"</strong>{" "}
            já está cadastrada em outra conta no Genius ADS.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Para continuar gerando criativos com esta marca:
          </p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Acesse a conta que cadastrou esta marca</li>
            <li>Assine um dos planos pagos do Genius ADS</li>
            <li>Continue criando sem limitações</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 pb-2">
          <Button className="w-full" variant="hero" onClick={handleSignOut}>
            Sair e entrar com outra conta →
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={onClose}
          >
            Usar outro nome para a marca
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default BrandExistsDialog;
