import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MailX } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmailExistsDialogProps {
  open:    boolean;
  onClose: () => void;
  email:   string;
}

const EmailExistsDialog = ({ open, onClose, email }: EmailExistsDialogProps) => {
  const navigate = useNavigate();

  const handleGoToLogin = () => {
    onClose();
    navigate("/auth", { state: { email, mode: "login" } });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">

        <div className="flex justify-center pt-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <MailX className="h-8 w-8 text-primary" />
          </div>
        </div>

        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-xl font-normal">
            Email já cadastrado
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            O email <strong className="text-foreground">{email}</strong> já
            possui uma conta no Genius ADS. Faça login para continuar
            ou use a opção "Esqueci minha senha" para recuperar o acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pb-2">
          <Button variant="hero" className="w-full" onClick={handleGoToLogin}>
            Ir para o Login →
          </Button>
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={onClose}>
            Voltar e usar outro email
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default EmailExistsDialog;
