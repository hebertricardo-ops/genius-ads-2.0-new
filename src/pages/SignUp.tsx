import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { fireNewUserWebhook } from "@/lib/webhooks";
import { useToast } from "@/hooks/use-toast";
import logoFull from "@/assets/logo-full.png";
import bgSignUp from "@/assets/background-signup.png";

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const { user, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe seu nome completo.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Senhas diferentes", description: "A confirmação de senha não confere.", variant: "destructive" });
      return;
    }
    if (!acceptTerms) {
      toast({ title: "Termos obrigatórios", description: "Aceite os termos para continuar.", variant: "destructive" });
      return;
    }

    const rawWhatsapp = whatsapp.replace(/\D/g, "");
    if (rawWhatsapp.length < 10) {
      toast({ title: "WhatsApp inválido", description: "Informe DDI + DDD + número com pelo menos 10 dígitos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, name, rawWhatsapp);
      if (error) {
        const msg = error.message.includes("already registered")
          ? "Este e-mail já está cadastrado."
          : error.message;
        toast({ title: "Erro ao criar conta", description: msg, variant: "destructive" });
      } else {
        fireNewUserWebhook({ name, email, whatsapp: rawWhatsapp, plan: "free" });

        navigate("/email-confirmation", { state: { email } });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(${bgSignUp})`,
          backgroundRepeat: "repeat",
          backgroundSize: "300px",
        }}
      />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">

        {/* Logo */}
        <div className="flex items-center justify-center mb-5">
          <img src={logoFull} alt="Genius ADS" className="h-20 object-contain" />
        </div>

        <h1 className="text-lg font-display text-foreground mb-0.5 text-center">
          Crie sua conta grátis
        </h1>
        <p className="text-xs text-muted-foreground text-center mb-5">
          60 créditos para começar. Sem cartão de crédito.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Nome completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="h-9 text-sm"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-9 text-sm"
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <Label htmlFor="whatsapp" className="text-xs">WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="+55 (11) 99999-9999"
              value={whatsapp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
                setWhatsapp(digits ? `+${digits}` : "");
              }}
              required
              autoComplete="tel"
              className="h-9 text-sm"
            />
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-9 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirmar senha */}
          <div className="space-y-1">
            <Label htmlFor="confirm-password" className="text-xs">Confirme sua senha</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-9 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Termos */}
          <div className="flex items-start gap-2 pt-0.5">
            <input
              id="terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <label htmlFor="terms" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer">
              Ao criar uma conta, você concorda com nossos{" "}
              <a href="/terms-of-use" className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                Termos de Serviço
              </a>{" "}
              e{" "}
              <a href="/privacy-policy" className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                Política de Privacidade
              </a>
              .
            </label>
          </div>

          {/* Botão principal */}
          <Button
            type="submit"
            variant="hero"
            size="sm"
            className="w-full mt-1"
            disabled={loading}
          >
            {loading ? "Criando conta..." : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                Criar conta
              </>
            )}
          </Button>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">ou continue</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          disabled={googleLoading}
          onClick={async () => {
            setGoogleLoading(true);
            const { error } = await signInWithGoogle();
            if (error) {
              toast({ title: "Erro ao entrar com Google", description: error.message, variant: "destructive" });
              setGoogleLoading(false);
            }
          }}
        >
          {googleLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {googleLoading ? "Redirecionando..." : "Criar conta com Google"}
        </Button>

        {/* Link login */}
        <p className="text-center text-xs text-muted-foreground mt-5">
          Já tem uma conta?{" "}
          <Link to="/auth" className="text-primary font-medium underline underline-offset-2">
            Entrar agora
          </Link>
        </p>

      </div>
    </div>
  );
};

export default SignUp;
