import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import logoFull from "@/assets/logo-full.png";
import bgSignUp from "@/assets/background-signup.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import EmailExistsDialog from "@/components/EmailExistsDialog";
import WhatsappExistsDialog from "@/components/WhatsappExistsDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const formatWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const Auth = () => {
  const location = useLocation();
  const stateEmail = (location.state as any)?.email ?? "";
  const stateMode  = (location.state as any)?.mode  ?? "";

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(stateEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showEmailExists, setShowEmailExists] = useState(false);
  const [existingEmail, setExistingEmail] = useState("");
  const [showWhatsappExists, setShowWhatsappExists] = useState(false);
  const [existingWhatsapp, setExistingWhatsapp] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth();

  useEffect(() => {
    if (stateMode === "login") setIsLogin(true);
  }, [stateMode]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsApp(e.target.value));
    setSignUpError("");
  };

  const mapLoginError = (message: string): string => {
    if (message.includes("Invalid login credentials")) return "Email ou senha incorretos.";
    if (message.includes("Too many requests")) return "Muitas tentativas. Aguarde alguns minutos.";
    return "Ocorreu um erro. Tente novamente.";
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    setIsResetting(true);
    const { error } = await resetPasswordForEmail(resetEmail);
    setIsResetting(false);
    if (error) {
      setLoginError("Não foi possível enviar o email. Verifique se o endereço está correto.");
      return;
    }
    setResetSent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            navigate("/email-confirmation", { state: { email } });
            return;
          }
          setLoginError(mapLoginError(error.message));
        } else {
          navigate("/dashboard");
        }
      } else {
        const rawWhatsapp = whatsapp.replace(/\D/g, "");
        if (rawWhatsapp.length < 10) {
          setSignUpError("Informe o WhatsApp com DDD + número (mínimo 10 dígitos).");
          setLoading(false);
          return;
        }

        const { data: waCheck } = await supabase.functions.invoke("check-whatsapp-available", {
          body: { whatsapp: rawWhatsapp },
        });
        if (waCheck?.available === false) {
          setExistingWhatsapp(whatsapp);
          setShowWhatsappExists(true);
          setLoading(false);
          return;
        }

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
          setSignUpError(error.message ?? "Erro ao criar conta. Tente novamente.");
        } else {
          supabase.functions.invoke("notify-new-user", {
            body: { name, email, whatsapp: rawWhatsapp },
          }).catch((err) => console.error("Webhook error:", err));
          navigate("/welcome", { state: { email } });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen gradient-hero relative flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${bgSignUp})`, backgroundRepeat: "repeat", backgroundSize: "300px" }}
      />
      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-lg p-6">

          {/* Logo dentro do card */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            <img src={logoFull} alt="Genius ADS" className="h-20 object-contain" />
          </div>

          <h1 className="text-lg font-display text-foreground text-center mb-0.5">
            {isLogin ? "Entre na sua conta" : "Crie sua conta gratuita"}
          </h1>
          <p className="text-xs text-muted-foreground text-center mb-5">
            {isLogin ? "Bem-vindo de volta ao Genius ADS" : "20 créditos para começar. Sem cartão de crédito."}
          </p>

          {/* Botão Google */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              const { error } = await signInWithGoogle();
              if (error) {
                setLoginError("Não foi possível entrar com o Google. Tente novamente.");
                setGoogleLoading(false);
              }
            }}
            className="w-full flex items-center justify-center gap-2.5 h-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? "Redirecionando..." : "Continuar com Google"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-muted-foreground">ou</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">Nome</Label>
                <Input id="name" value={name} onChange={(e) => { setName(e.target.value); setSignUpError(""); }} placeholder="Seu nome" className="h-9 text-sm" />
              </div>
            )}
            {!isLogin && (
              <div className="space-y-1">
                <Label htmlFor="whatsapp" className="text-xs">WhatsApp (DDD + Número)</Label>
                <Input id="whatsapp" type="tel" value={whatsapp} onChange={handleWhatsAppChange} placeholder="(11) 99999-9999" className="h-9 text-sm" required />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setLoginError(""); setSignUpError(""); }} placeholder="seu@email.com" className="h-9 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(""); setSignUpError(""); }} placeholder="••••••••" className="h-9 text-sm pr-9" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {isLogin && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setResetSent(false); setResetEmail(""); }}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
            {isLogin && loginError && (
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            {!isLogin && signUpError && (
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{signUpError}</span>
              </div>
            )}
            <Button type="submit" variant="hero" size="sm" className="w-full mt-1" disabled={loading}>
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-xs text-muted-foreground">
              {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
              {isLogin ? (
                <button onClick={() => navigate("/signup")} className="text-primary hover:underline font-medium">
                  Cadastre-se
                </button>
              ) : (
                <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-medium">
                  Faça login
                </button>
              )}
            </span>
          </div>

        </div>
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

    <Dialog open={showForgotPassword} onOpenChange={(open) => { setShowForgotPassword(open); if (!open) setResetSent(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-normal">Recuperar senha</DialogTitle>
          <DialogDescription>
            Informe seu email e enviaremos um link para você criar uma nova senha.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="seu@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
              disabled={resetSent}
            />
          </div>
          {loginError && (
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
          {resetSent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              ✅ Email enviado! Verifique sua caixa de entrada e siga o link para criar uma nova senha.
            </div>
          ) : (
            <Button className="w-full" onClick={handleResetPassword} disabled={isResetting || !resetEmail}>
              {isResetting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default Auth;
