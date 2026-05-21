import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Instagram, Facebook, Smartphone, ExternalLink } from "lucide-react";
import { useSocialPublish } from "@/hooks/useSocialPublish";
import { useToast } from "@/hooks/use-toast";

interface SocialConnectModalProps {
  open: boolean;
  onClose: () => void;
}

const SocialConnectModal = ({ open, onClose }: SocialConnectModalProps) => {
  const { connectSocialAccounts } = useSocialPublish();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectSocialAccounts();
      setConnected(true);
    } catch (err: any) {
      toast({
        title: "Erro ao conectar",
        description: err.message ?? "Não foi possível gerar o link de conexão.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConnected(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display font-normal text-xl">
            <Smartphone className="w-5 h-5 text-primary" />
            Conecte suas redes sociais
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-5">
          {!connected ? (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Publique criativos diretamente do Genius ADS no Instagram e Facebook,
                sem precisar baixar e postar manualmente.
              </p>

              {/* Platform pills */}
              <div className="flex gap-3">
                <div className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border border-border bg-muted/30">
                  <Instagram className="w-5 h-5 text-pink-500" />
                  <span className="text-sm font-medium text-foreground">Instagram</span>
                </div>
                <div className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border border-border bg-muted/30">
                  <Facebook className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-foreground">Facebook</span>
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                {connecting ? "Gerando link..." : "Conectar minhas redes"}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Uma janela foi aberta para você conectar suas contas.
                </p>
                <p className="text-sm text-muted-foreground">
                  Após conectar, feche a janela que abriu e clique em "Publicar" novamente.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Fechar
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Abrir novamente
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SocialConnectModal;
