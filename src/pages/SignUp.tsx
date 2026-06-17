import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import EmailExistsDialog from "@/components/EmailExistsDialog";
import WhatsappExistsDialog from "@/components/WhatsappExistsDialog";
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
  const [showEmailExists, setShowEmailExists] = useState(false);
  const [existingEmail, setExistingEmail] = useState("");
  const [showWhatsappExists, setShowWhatsappExists] = useState(false);
  const [existingWhatsapp, setExistingWhatsapp] = useState("");

  const [googleLoading, setGoogleLoading] = useState(false);

  const [formError, setFormError] = useState("");

  const { user, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFormError("O nome é obrigatório.");
      return;
    }
    if (password.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem.");
      return;
    }
    if (!acceptTerms) {
      setFormError("Você precisa aceitar os Termos de Uso para continuar.");
      return;
    }

    const rawWhatsapp = whatsapp.replace(/\D/g, "");
    if (rawWhatsapp.length < 10) {
      setFormError("Informe o WhatsApp com DDI + DDD + número.");
      return;
    }

    setLoading(true);
    try {
      // Verificar WhatsApp disponível
      const { data: waCheck } = await supabase.functions.invoke("check-whatsapp-available", {
        body: { whatsapp: rawWhatsapp },
      });
      if (waCheck?.available === false) {
        setExistingWhatsapp(whatsapp);
        setShowWhatsappExists(true);
        setLoading(false);
        return;
      }

      // Verificar email disponível
      const { data: emailCheck } = await supabase.functions.invoke("check-email-available", {
        body: { email: email.toLowerCase().trim() },
      });
      if (emailCheck?.available === false) {
        setExistingEmail(email);
        setShowEmailExists(true);
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, name, rawWhatsapp);
      if (error) {
        const msg = error.message.includes("already registered")
          ? "Este e-mail já está cadastrado."
          : error.message;
        setFormError(msg ?? "Erro ao criar conta. Tente novamente.");
      } else {
        supabase.functions.invoke("notify-new-user", {
          body: { name, email, whatsapp: rawWhatsapp },
        }).catch((err) => console.error("Webhook error:", err));
        navigate("/welcome", { state: { email } });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
          40 créditos para começar. Sem cartão de crédito.
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
              onChange={(e) => { setName(e.target.value); setFormError(""); }}
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
              onChange={(e) => { setEmail(e.target.value); setFormError(""); }}
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
              placeholder="55 99 999999999"
              value={whatsapp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
                let formatted = digits;
                if (digits.length > 4) formatted = `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
                else if (digits.length > 2) formatted = `${digits.slice(0, 2)} ${digits.slice(2)}`;
                setWhatsapp(formatted);
                setFormError("");
              }}
              required
              autoComplete="tel"
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">Obrigatório para continuar. DDI + DDD + número.</p>
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
                onChange={(e) => { setPassword(e.target.value); setFormError(""); }}
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
                onChange={(e) => { setConfirmPassword(e.target.value); setFormError(""); }}
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

          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

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
              setFormError("Não foi possível entrar com o Google. Tente novamente.");
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

    <WhatsappExistsDialog
      open={showWhatsappExists}
      onClose={() => setShowWhatsappExists(false)}
      whatsapp={existingWhatsapp}
    />

    <EmailExistsDialog
      open={showEmailExists}
      onClose={() => setShowEmailExists(false)}
      email={existingEmail}
    />
    </>
  );
};

export default SignUp;
