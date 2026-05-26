import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import logoFull from "@/assets/logo-full.png";
import bgSignUp from "@/assets/background-signup.png";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, resetPasswordForEmail } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsApp(e.target.value));
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
      toast({ title: "Erro ao enviar email", description: "Verifique se o email está correto e tente novamente.", variant: "destructive" });
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
          toast({ title: "Erro ao entrar", description: mapLoginError(error.message), variant: "destructive" });
        } else {
          navigate("/dashboard");
        }
      } else {
        const rawWhatsapp = whatsapp.replace(/\D/g, "");
        if (rawWhatsapp.length < 10) {
          toast({ title: "WhatsApp inválido", description: "Informe DDD + número com pelo menos 10 dígitos.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name, rawWhatsapp);
        if (error) {
          toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
        } else {
          // Fire-and-forget webhook to Make.com
          fetch("https://hook.us2.make.com/1ifgxwj2g4o47qa1lbo3ab51vumvoydy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, whatsapp: rawWhatsapp }),
          }).catch(() => {});

          navigate("/email-confirmation", { state: { email } });
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
            {isLogin ? "Bem-vindo de volta ao Genius ADS" : "60 créditos para começar. Sem cartão de crédito."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="h-9 text-sm" />
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
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="h-9 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm pr-9" required />
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
