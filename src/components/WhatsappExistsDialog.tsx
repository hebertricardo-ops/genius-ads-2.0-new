import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WhatsappExistsDialogProps {
  open:     boolean;
  onClose:  () => void;
  whatsapp: string;
}

const WhatsappExistsDialog = ({ open, onClose, whatsapp }: WhatsappExistsDialogProps) => {
  const navigate = useNavigate();

  const handleGoToLogin = () => {
    onClose();
    navigate("/auth", { state: { mode: "login" } });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">

        <div className="flex justify-center pt-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <PhoneOff className="h-8 w-8 text-primary" />
          </div>
        </div>

        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-xl font-normal">
            WhatsApp já cadastrado
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            O número <strong className="text-foreground">{whatsapp}</strong> já
            está vinculado a outra conta no Genius ADS. Use um número
            diferente ou faça login na conta existente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pb-2">
          <Button variant="hero" className="w-full" onClick={handleGoToLogin}>
            Ir para o Login →
          </Button>
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={onClose}>
            Voltar e usar outro número
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default WhatsappExistsDialog;
