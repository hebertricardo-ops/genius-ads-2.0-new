import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get("type");
    const isRecovery = type === "recovery";

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled.current) return;
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
        handled.current = true;
        if (isRecovery) {
          navigate("/change-password", { replace: true });
        } else {
          toast.success("Email confirmado! Bem-vindo ao Genius ADS 🎉");
          navigate("/dashboard", { replace: true });
        }
      }
    });

    // PKCE flow: troca o code da URL por uma sessão
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        if (!handled.current) {
          handled.current = true;
          toast.error("Não foi possível confirmar o email. Tente fazer login.");
          navigate("/auth", { replace: true });
        }
      });
    }

    // Fallback: se nada acontecer em 8s, redireciona para login
    const timeout = setTimeout(() => {
      if (!handled.current) {
        handled.current = true;
        toast.error("Não foi possível confirmar o email. Tente fazer login.");
        navigate("/auth", { replace: true });
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center">
      <div className="text-center animate-fade-in space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Confirmando seu email...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
