import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Coins, Save, Loader2, ShoppingCart, Instagram, Facebook, Smartphone, Phone, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useSocialPublish } from "@/hooks/useSocialPublish";

const formatWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
};

const Profile = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { socialProfile, isConnected, connectSocialAccounts } = useSocialPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isGoogleUser = user?.app_metadata?.provider === "google"
    || user?.identities?.some((id: any) => id.provider === "google");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Sync from profile when it loads
  if (profile && !initialized) {
    setName(profile.name ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    setWhatsapp(formatWhatsApp(profile.whatsapp ?? ""));
    setInitialized(true);
  }

  const displayName = name || profile?.name || "";
  const displayEmail = profile?.email || user?.email || "";
  const initials = displayName
    ? displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : displayEmail.slice(0, 2).toUpperCase();

  const currentAvatar = avatarUrl || profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("generated-creatives")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("generated-creatives")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      // Save to profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Foto atualizada!", description: "Sua foto de perfil foi alterada." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Informe sua senha atual.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("A nova senha deve ser diferente da senha atual.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });

      if (authError) {
        setPasswordError("Senha atual incorreta. Verifique e tente novamente.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordError("Erro ao atualizar a senha. Tente novamente.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch {
      setPasswordError("Erro inesperado. Tente novamente.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const rawWhatsapp = whatsapp.replace(/\D/g, "");
      const { error } = await supabase
        .from("profiles")
        .update({ name: name || displayName, whatsapp: rawWhatsapp || null })
        .eq("user_id", user.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Perfil salvo!", description: "Suas informações foram atualizadas." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display text-foreground mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e créditos.</p>
      </div>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-20 h-20 border-2 border-border">
                {currentAvatar ? (
                  <AvatarImage src={currentAvatar} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-display">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-foreground" />
                ) : (
                  <Camera className="w-5 h-5 text-foreground" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h2 className="font-display text-lg text-foreground">{displayName || "Sem nome"}</h2>
              <p className="text-sm text-muted-foreground">{displayEmail}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
          <h3 className="font-display text-foreground mb-4">Informações</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-muted-foreground">Nome</Label>
              <Input
                id="name"
                value={name || displayName}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">E-mail</Label>
              <Input value={displayEmail} disabled className="mt-1 opacity-60" />
            </div>
            <div>
              <Label htmlFor="whatsapp" className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> WhatsApp
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                placeholder="55 99 999999999"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">DDI + DDD + número</p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </div>

        {/* Alterar Senha — oculto para usuários Google OAuth */}
        {!isGoogleUser && (
          <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-normal text-foreground">Alterar Senha</h2>
                <p className="text-xs text-muted-foreground">Informe sua senha atual para definir uma nova</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Senha atual</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }}
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nova senha</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Confirmar nova senha</Label>
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                  disabled={isChangingPassword}
                />
              </div>
            </div>

            {passwordError && (
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-start gap-2.5 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Senha alterada com sucesso!</span>
              </div>
            )}

            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full sm:w-auto gradient-primary"
            >
              {isChangingPassword ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Alterando...</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" />Alterar Senha</>
              )}
            </Button>
          </div>
        )}

        {/* Credits */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
          <h3 className="font-display text-foreground mb-4">Créditos</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display text-foreground">
                {credits?.credits_balance ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">créditos disponíveis</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Créditos utilizados: <span className="text-foreground font-medium">{credits?.credits_used ?? 0}</span>
            </p>
          </div>
        </div>

        {/* Social networks */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-primary" />
            <h3 className="font-display text-foreground">Redes Sociais</h3>
          </div>
          {!isConnected ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border border-border bg-muted/30">
                  <Instagram className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Instagram</span>
                </div>
                <div className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border border-border bg-muted/30">
                  <Facebook className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Facebook</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Conecte suas redes para publicar criativos diretamente pelo Genius ADS.
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  try { await connectSocialAccounts(); }
                  catch (err: any) { toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" }); }
                }}
              >
                <Smartphone className="w-4 h-4" /> Conectar redes sociais
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Conectado
                </span>
              </div>
              <div className="flex gap-3">
                {["instagram", "facebook"].map((p) => {
                  const connected = socialProfile?.connected_platforms?.includes(p) ?? false;
                  const Icon = p === "instagram" ? Instagram : Facebook;
                  const color = p === "instagram" ? "text-pink-500" : "text-blue-500";
                  const label = p === "instagram" ? "Instagram" : "Facebook";
                  return (
                    <div
                      key={p}
                      className={`flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border ${connected ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}
                    >
                      <Icon className={`w-5 h-5 ${connected ? color : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${connected ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  try { await connectSocialAccounts(); }
                  catch (err: any) { toast({ title: "Erro ao gerenciar", description: err.message, variant: "destructive" }); }
                }}
              >
                <Smartphone className="w-4 h-4" /> Gerenciar conexões
              </Button>
            </div>
          )}
        </div>

        {/* Buy credits — shown only when balance is zero */}
        {(credits?.credits_balance ?? 1) === 0 && (
          <div className="gradient-card rounded-2xl border border-primary/40 shadow-card p-6 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-foreground mb-1">Seus créditos acabaram</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adquira um pacote de créditos para continuar gerando criativos e carrosséis.
                </p>
                <Button variant="hero" onClick={() => {
                  toast({ title: "Em breve!", description: "A compra de créditos estará disponível em breve." });
                }}>
                  <ShoppingCart className="w-4 h-4" />
                  Comprar créditos
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
