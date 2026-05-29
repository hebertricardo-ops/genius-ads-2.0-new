import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Image, Calendar, BarChart2, Mail } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const FEATURES = [
  { icon: Zap,       text: "Gere criativos de alta conversão" },
  { icon: Image,     text: "Crie carrosséis profissionais" },
  { icon: Calendar,  text: "Agende postagens nas redes sociais" },
  { icon: BarChart2, text: "Acompanhe analytics do seu perfil" },
];

const Welcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email ?? "";

  useEffect(() => {
    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", "CadastroRealizado");
    }
  }, []);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center">
          <img src={logoIcon} alt="Genius ADS" className="h-12 mx-auto mb-6" />
        </div>

        {/* Card principal */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-8 text-center space-y-6">

          {/* Ícone de sucesso */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-foreground">
              Bem-vindo ao Genius ADS!
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sua conta foi criada com sucesso. Você ganhou{" "}
              <span className="text-primary font-semibold">créditos grátis</span>{" "}
              para começar.
            </p>
          </div>

          {/* Features */}
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              O que você pode fazer:
            </p>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{text}</span>
              </div>
            ))}
          </div>

          {/* Aviso de email */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 flex items-start gap-3 text-left">
            <Mail className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Enviamos um link de confirmação
              {email && <> para <strong>{email}</strong></>}.
              {" "}Verifique sua caixa de entrada para ativar sua conta.
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              variant="hero"
              className="w-full"
              onClick={() => navigate("/email-confirmation", { state: { email } })}
            >
              <Mail className="h-4 w-4 mr-2" />
              Verificar meu email
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

export default Welcome;
