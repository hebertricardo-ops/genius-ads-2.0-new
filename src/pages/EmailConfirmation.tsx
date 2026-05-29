import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, RotateCcw, CheckCircle2, Zap, Image, Calendar, BarChart2 } from "lucide-react";
import logoFull from "@/assets/logo-full.png";

const FEATURES = [
  { icon: Zap,       text: "Gere criativos de alta conversão" },
  { icon: Image,     text: "Crie carrosséis profissionais" },
  { icon: Calendar,  text: "Agende postagens nas redes sociais" },
  { icon: BarChart2, text: "Acompanhe analytics do seu perfil" },
];

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
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center">
          <img src={logoFull} alt="Genius ADS" className="h-32 mx-auto mb-6" />
        </div>

        {/* Card principal */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-8 text-center space-y-6">

          {/* Ícone */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <h1 className="font-display text-xl text-foreground">
              Confirme seu email
            </h1>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Sua conta foi criada com sucesso. Você ganhou{" "}
              <span className="text-primary font-semibold">créditos grátis</span>{" "}
              para começar.
            </p>
          </div>

          {/* Features */}
          <div className="bg-muted/50 rounded-xl p-3 text-left space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              O que você pode fazer:
            </p>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-foreground">{text}</span>
              </div>
            ))}
          </div>

          {/* Aviso de email */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 flex items-start gap-3 text-left">
            <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
              Enviamos um link de confirmação
              {email && <> para <strong>{email}</strong></>}.
              {" "}Verifique sua caixa de entrada e a pasta de spam para ativar sua conta.
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              variant="hero"
              className="w-full"
              onClick={handleResend}
              disabled={resending || sent}
            >
              {sent ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <RotateCcw className={`h-4 w-4 mr-2 ${resending ? "animate-spin" : ""}`} />
              )}
              {resending ? "Reenviando..." : sent ? "Email reenviado!" : "Reenviar e-mail"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => navigate("/dashboard")}
            >
              Já confirmei — acessar o painel →
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailConfirmation;
