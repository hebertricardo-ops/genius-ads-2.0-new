import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, ArrowLeft, RotateCcw, CheckCircle } from "lucide-react";
import logoFull from "@/assets/logo-full.png";

const EmailConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string })?.email ?? "";
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("trackCustom", "CadastroRealizado");
    }
  }, []);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast.error("Erro ao reenviar: " + error.message);
    } else {
      setSent(true);
      toast.success("Email reenviado com sucesso!");
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img src={logoFull} alt="Genius ADS" className="h-32 mx-auto" />
        </div>

        <div className="gradient-card rounded-2xl p-8 shadow-card border border-border text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-full p-4">
              <Mail className="w-10 h-10 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-display text-foreground">Confirme seu email</h1>
            <p className="text-muted-foreground text-sm">
              Enviamos um link de confirmação para:
            </p>
            <p className="text-foreground font-medium break-all">
              {email || "seu endereço de email"}
            </p>
          </div>

          <p className="text-muted-foreground text-sm">
            Clique no link do email para ativar sua conta.
            Verifique também a caixa de spam.
          </p>

          <Button
            variant="hero"
            className="w-full"
            onClick={handleResend}
            disabled={resending || sent}
          >
            {sent ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <RotateCcw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
            )}
            {resending ? "Reenviando..." : sent ? "Email reenviado!" : "Reenviar email"}
          </Button>

          <button
            onClick={() => navigate("/auth")}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
