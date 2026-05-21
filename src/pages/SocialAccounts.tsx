import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Instagram, Facebook, Smartphone, RefreshCw, ExternalLink,
  Loader2, Building2, Lock, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useSocialPublish } from "@/hooks/useSocialPublish";
import { useBrandContext } from "@/contexts/BrandContext";
import { usePlan } from "@/hooks/usePlan";
import UpgradeDialog from "@/components/UpgradeDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", Icon: Instagram, color: "text-pink-500", bg: "bg-pink-500/10 border-pink-500/30" },
  { value: "facebook",  label: "Facebook",  Icon: Facebook,  color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
];

const SocialAccounts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { selectedBrand } = useBrandContext();
  const { socialProfile, isConnected, profileLoading, connectSocialAccounts, manageConnections, syncStatus } = useSocialPublish();
  const { hasSocialMedia, isLoading: planLoading } = usePlan();

  const [syncing, setSyncing]     = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; platform: string }>({
    open: false,
    platform: "",
  });

  const visibilityListenerRef = useRef<(() => void) | null>(null);
  const timeoutRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectedPlatforms: string[] = socialProfile?.connected_platforms ?? [];

  // Limpar listener e timeout ao desmontar
  useEffect(() => {
    return () => {
      if (visibilityListenerRef.current) document.removeEventListener("visibilitychange", visibilityListenerRef.current);
      if (timeoutRef.current)            clearTimeout(timeoutRef.current);
    };
  }, []);

  // Sync automático ao retornar da URL ?connected=true — com retry
  useEffect(() => {
    if (searchParams.get("connected") !== "true") return;

    setSyncing(true);

    const attemptSync = async (retriesLeft: number): Promise<void> => {
      try {
        const result = await syncStatus();

        // Upload-Post ainda não processou a conexão — tentar novamente
        if (result?.sync_warning && retriesLeft > 0) {
          await new Promise((r) => setTimeout(r, 3000));
          return attemptSync(retriesLeft - 1);
        }

        if (result?.sync_warning) {
          toast({
            title: "Conexão realizada",
            description: "O status pode levar alguns segundos para atualizar. Clique em 'Verificar conexão' se necessário.",
          });
        } else {
          toast({ title: "Redes sociais conectadas com sucesso! 🎉" });
        }
        navigate("/social-accounts", { replace: true });
      } catch (err: any) {
        toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
      } finally {
        setSyncing(false);
      }
    };

    // Aguardar 2s antes da primeira tentativa — dá tempo ao Upload-Post processar
    setTimeout(() => attemptSync(3), 2000);
  }, []);

  // ── Verificar conexão (botão) ──────────────────────────────────────────────
  const handleSync = async () => {
    const platformsBefore = socialProfile?.connected_platforms ?? [];
    setSyncing(true);
    try {
      const syncResult = await syncStatus();
      const platformsAfter = syncResult?.connected_platforms ?? [];

      if (syncResult?.profile_deleted) {
        toast({ title: "Status atualizado", description: "Nenhuma rede social conectada." });
      } else if (platformsBefore.length !== platformsAfter.length) {
        toast({ title: `Status atualizado: ${platformsAfter.join(", ") || "nenhuma"} conectada(s).` });
      } else {
        toast({ title: "Tudo certo — nenhuma alteração detectada." });
      }
    } catch (err: any) {
      toast({ title: "Erro ao verificar conexão", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // ── Helper: limpar listener de visibilidade ativo ────────────────────────
  const clearVisibilityListener = () => {
    if (visibilityListenerRef.current) {
      document.removeEventListener("visibilitychange", visibilityListenerRef.current);
      visibilityListenerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // ── Helper: registrar listener de visibilidade com timeout ───────────────
  const registerVisibilityListener = (handler: () => void) => {
    clearVisibilityListener();
    const wrapped = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", wrapped);
      visibilityListenerRef.current = null;
      clearTimeout(timeoutRef.current!);
      timeoutRef.current = null;
      handler();
    };
    visibilityListenerRef.current = wrapped;
    document.addEventListener("visibilitychange", wrapped);
    timeoutRef.current = setTimeout(() => {
      document.removeEventListener("visibilitychange", wrapped);
      visibilityListenerRef.current = null;
    }, 5 * 60 * 1000);
  };

  // ── Conectar redes ─────────────────────────────────────────────────────────
  const handleConnect = async () => {
    const platformsBefore = socialProfile?.connected_platforms ?? [];
    setConnecting(true);
    try {
      await connectSocialAccounts();
      registerVisibilityListener(async () => {
        setIsSyncing(true);
        try {
          const syncResult = await syncStatus();
          const platformsAfter = syncResult?.connected_platforms ?? [];
          const wasConnected = platformsAfter.some(p => !platformsBefore.includes(p));
          if (wasConnected) {
            toast({ title: "Rede conectada! 🎉", description: "Sua conta foi vinculada com sucesso." });
          }
        } catch {
          // silencioso — usuário pode usar "Verificar conexão" manualmente
        } finally {
          setIsSyncing(false);
        }
      });
    } catch (err: any) {
      if (err?.code === "SOCIAL_LIMIT_REACHED") {
        setUpgradeOpen(true);
      } else {
        toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" });
      }
    } finally {
      setConnecting(false);
    }
  };

  // ── Confirmar desconexão: abrir JWT + listener de visibilidade ────────────
  const handleGoToManage = async () => {
    const platformToCheck = disconnectDialog.platform;
    const platformsBefore = socialProfile?.connected_platforms ?? [];
    setDisconnectDialog({ open: false, platform: "" });

    await manageConnections();

    registerVisibilityListener(async () => {
      setIsSyncing(true);
      try {
        const syncResult = await syncStatus();
        const platformsAfter = syncResult?.connected_platforms ?? [];
        const label = PLATFORMS.find(p => p.value === platformToCheck)?.label ?? platformToCheck;

        if (syncResult?.sync_warning) {
          toast({
            title: "Não foi possível verificar automaticamente",
            description: "Clique em \"Verificar conexão\" para atualizar o status.",
          });
        } else if (syncResult?.profile_deleted) {
          toast({
            title: "Conta desconectada",
            description: "Sua licença foi liberada. Você pode conectar uma nova rede social quando quiser.",
          });
        } else if (platformsBefore.some(p => !platformsAfter.includes(p))) {
          toast({ title: `${label} desconectado`, description: "Conta removida com sucesso." });
        } else if (platformsAfter.some(p => !platformsBefore.includes(p))) {
          toast({ title: "Rede conectada! 🎉", description: "Sua conta foi vinculada com sucesso." });
        } else {
          toast({
            title: "Nenhuma alteração detectada",
            description: `O ${label} ainda aparece como conectado. Se desconectou, aguarde alguns segundos e clique em "Verificar conexão".`,
            variant: "destructive",
          });
        }
      } catch {
        // Falha silenciosa no sync automático — não interromper o usuário
        toast({
          title: "Não foi possível verificar automaticamente",
          description: "Clique em \"Verificar conexão\" para atualizar o status.",
        });
      } finally {
        setIsSyncing(false);
      }
    });
  };

  // ── Gate: sem acesso ao plano ──────────────────────────────────────────────
  if (!planLoading && !hasSocialMedia) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display text-foreground mb-2">Redes Sociais</h1>
          <p className="text-muted-foreground mb-6">
            A publicação em redes sociais está disponível nos planos Advanced e Social Media.
            Atualize seu plano para conectar Instagram e Facebook.
          </p>
          <Button variant="hero" onClick={() => setUpgradeOpen(true)}>
            Ver planos disponíveis
          </Button>
        </div>
        <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="social_media" />
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display text-foreground">
              Redes Sociais
              {selectedBrand && (
                <span className="text-muted-foreground font-normal text-xl"> — {selectedBrand.name}</span>
              )}
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground ml-12">
          {selectedBrand
            ? `Conecte as redes sociais da marca ${selectedBrand.name} para publicar criativos diretamente.`
            : "Conecte suas redes para publicar criativos diretamente pelo Genius ADS."}
        </p>
      </div>

      {/* Estado: sem marca selecionada */}
      {!selectedBrand ? (
        <div className="gradient-card rounded-2xl border border-border shadow-card p-10 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-display text-foreground mb-2">Nenhuma marca selecionada</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Selecione uma marca no menu lateral para gerenciar suas redes sociais.
          </p>
          <Button variant="hero" size="sm" onClick={() => navigate("/brands")}>
            Gerenciar Marcas
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-foreground">Status da Conexão</h2>
              {isConnected && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Ativo
                </span>
              )}
            </div>

            {profileLoading || syncing || isSyncing ? (
              <div className="flex items-center gap-3 py-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {isSyncing ? "Verificando suas conexões..." : syncing ? "Verificando conexão..." : "Carregando..."}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {PLATFORMS.map(({ value, label, Icon, color, bg }) => {
                  const active = connectedPlatforms.includes(value);
                  return (
                    <div
                      key={value}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 rounded-xl border transition-colors",
                        active ? bg : "border-border bg-muted/20",
                      )}
                    >
                      <Icon className={cn("w-5 h-5 shrink-0", active ? color : "text-muted-foreground")} />
                      <span className={cn("flex-1 text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                        {label}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          active ? "text-green-500" : "text-muted-foreground",
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-green-500" : "bg-muted-foreground/40")} />
                          {active ? "Conectado" : "Não conectado"}
                        </span>
                        {active && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDisconnectDialog({ open: true, platform: value })}
                          >
                            <LogOut className="w-3 h-3 mr-1" />
                            Desconectar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-border">
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing || isSyncing || profileLoading}
                className="w-full sm:w-auto"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {syncing ? "Verificando..." : "Verificar conexão"}
              </Button>
            </div>
          </div>

          {/* Connect card */}
          <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
            <h2 className="font-display text-foreground mb-1">
              {isConnected ? "Gerenciar redes" : "Conectar redes sociais"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {isConnected
                ? `Gerencie quais plataformas estão vinculadas à marca ${selectedBrand.name}.`
                : `Vincule Instagram e Facebook da marca ${selectedBrand.name} para publicar criativos diretamente pelo Genius ADS.`}
            </p>

            <Button
              variant="hero"
              onClick={isConnected ? () => manageConnections() : handleConnect}
              disabled={connecting}
              className="w-full sm:w-auto"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {connecting ? "Abrindo..." : isConnected ? "Gerenciar conexões" : "Conectar minhas redes"}
            </Button>

            <p className="mt-4 text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">ℹ️</span>
              <span>
                Ao clicar, uma nova aba será aberta com a página de autorização.
                Após conectar, clique em <strong className="text-foreground">Verificar conexão</strong> para atualizar o status.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Dialog: confirmar desconexão */}
      <Dialog
        open={disconnectDialog.open}
        onOpenChange={(open) => !open && setDisconnectDialog({ open: false, platform: "" })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-normal">
              Desconectar {PLATFORMS.find(p => p.value === disconnectDialog.platform)?.label ?? disconnectDialog.platform}?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                <p>Você será redirecionado para gerenciar suas conexões. Na próxima tela:</p>
                <ol className="list-decimal list-inside space-y-1 text-foreground/80">
                  <li>Localize o {PLATFORMS.find(p => p.value === disconnectDialog.platform)?.label ?? disconnectDialog.platform} na lista</li>
                  <li>Clique em <strong className="text-foreground">"Disconnect"</strong> ou <strong className="text-foreground">"Remove"</strong></li>
                  <li>Feche a janela e volte aqui</li>
                </ol>
                <p>Após fechar a janela, sincronizaremos automaticamente o status.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDisconnectDialog({ open: false, platform: "" })}
            >
              Cancelar
            </Button>
            <Button variant="hero" onClick={handleGoToManage}>
              Ir para gerenciar
              <ExternalLink className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="social_profiles" />
    </div>
  );
};

export default SocialAccounts;
