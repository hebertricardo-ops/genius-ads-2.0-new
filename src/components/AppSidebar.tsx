import { useState } from "react";
import {
  LayoutDashboard, Plus, Images, Coins, CalendarDays, Smartphone,
  UserCircle, CreditCard, HeadphonesIcon, LogOut, Sun, Moon, Monitor, ChevronUp,
  Tag, ChevronDown, Check, AlertCircle, Settings, Lock,
} from "lucide-react";
import { useSocialPublish } from "@/hooks/useSocialPublish";
import { usePlan } from "@/hooks/usePlan";
import logoFull from "@/assets/logo-full.png";
import logoIcon from "@/assets/logo-icon.png";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import CreateDialog from "@/components/CreateDialog";
import NoBrandDialog from "@/components/NoBrandDialog";
import { useBrandContext } from "@/contexts/BrandContext";
import UpgradeDialog from "@/components/UpgradeDialog";


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [createOpen, setCreateOpen] = useState(false);
  const [noBrandOpen, setNoBrandOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { selectedBrand, setSelectedBrand, brands } = useBrandContext();
  const { user, signOut } = useAuth();
  const { data: credits } = useCredits();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const displayName =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const email = user?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarUrl = user
    ? supabase.storage.from("creative-uploads").getPublicUrl(`${user.id}/avatar.png`).data.publicUrl
    : null;

  const { hasSubscription, hasCalendar, hasSocialMedia, maxBrands, planName } = usePlan();
  const freeLimit = 1;
  const effectiveBrandLimit = hasSubscription ? maxBrands : freeLimit;
  const isBrandAtLimit = effectiveBrandLimit !== null && brands.length >= effectiveBrandLimit;
  const { isConnected: socialConnected } = useSocialPublish();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel =
    theme === "dark" ? "Modo Escuro (ativo)" :
    theme === "light" ? "Modo Claro (ativo)" :
    "Sistema (ativo)";

  return (
    <Sidebar collapsible="icon">
      {/* ── Logo ── */}
      <div className="flex items-center justify-center px-4 py-4 border-b border-sidebar-border">
        {collapsed
          ? <img src={logoIcon} alt="Genius ADS" className="w-7 h-7 shrink-0" />
          : <img src={logoFull} alt="Genius ADS" className="h-9 object-contain" />
        }
      </div>

      <SidebarContent className="pt-3">
        {/* ── Seletor de Marca ── */}
        <div className={cn("px-3 mb-2", collapsed && "px-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-sidebar-accent/40",
                  "hover:bg-sidebar-accent hover:border-primary/30 transition-colors text-left",
                  collapsed && "justify-center px-2",
                )}
              >
                  {/* Trigger icon: logo avatar when brand selected, Tag otherwise */}
                {selectedBrand?.logo_url ? (
                  <img
                    src={selectedBrand.logo_url}
                    alt={selectedBrand.name}
                    className="h-4 w-4 rounded shrink-0 object-contain bg-white"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                {!collapsed && (
                  <>
                    <span className={cn("flex-1 text-xs truncate", selectedBrand ? "text-foreground font-medium" : "text-muted-foreground italic")}>
                      {selectedBrand ? selectedBrand.name : "Selecione uma marca"}
                    </span>
                    {!selectedBrand && <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />}
                    {selectedBrand && <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              {brands.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Suas marcas
                  </DropdownMenuLabel>
                  {brands.map((brand) => {
                    const initials = brand.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <DropdownMenuItem
                        key={brand.id}
                        onClick={() => setSelectedBrand(brand)}
                        className="flex items-center gap-2"
                      >
                        {/* Brand avatar */}
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="h-5 w-5 rounded object-contain bg-white border border-border shrink-0"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              img.style.display = "none";
                              img.nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <span
                          className={cn(
                            "h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[9px] font-semibold shrink-0",
                            brand.logo_url && "hidden"
                          )}
                        >
                          {initials}
                        </span>
                        <span className="truncate text-sm flex-1">{brand.name}</span>
                        {selectedBrand?.id === brand.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => isBrandAtLimit ? setUpgradeOpen(true) : navigate("/brands/new")}
              >
                {isBrandAtLimit ? (
                  <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4 mr-2 text-primary" />
                )}
                {isBrandAtLimit ? "Nova Marca (limite atingido)" : "Criar Nova Marca"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/brands")}>
                <Settings className="h-4 w-4 mr-2" />
                Gerenciar Marcas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard — acima do Criar */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/dashboard"
                    end
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Criar */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => selectedBrand ? setCreateOpen(true) : setNoBrandOpen(true)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer",
                    "text-white bg-primary border border-primary hover:bg-primary/90 hover:shadow-sm",
                    collapsed && "justify-center",
                  )}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Criar</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Minha Galeria */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/history"
                    end
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Images className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Biblioteca</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Calendário */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/calendario"
                    end
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Calendário</span>
                        {!hasCalendar && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            <Lock className="w-2.5 h-2.5" />Advanced+
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Redes Sociais */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/social-accounts"
                    end
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Redes Sociais</span>
                        {!hasSocialMedia ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            <Lock className="w-2.5 h-2.5" />Advanced+
                          </span>
                        ) : socialConnected ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-500 border border-green-500/25">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/25">
                            Conectar
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Comprar Créditos Extras — só para assinantes */}
              {hasSubscription && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/add-credits"
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Coins className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Comprar Créditos Extras</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <CreateDialog open={createOpen} onOpenChange={setCreateOpen} />
        <NoBrandDialog open={noBrandOpen} onOpenChange={setNoBrandOpen} />
        <UpgradeDialog
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          feature="brands"
          currentPlan={planName}
          currentLimit={effectiveBrandLimit}
          currentCount={brands.length}
        />
      </SidebarContent>

      {/* ── Footer: créditos + avatar ── */}
      <SidebarFooter className="border-t border-sidebar-border pt-3 pb-3 space-y-2">
        {/* Créditos */}
        {!collapsed && (
          <div className="mx-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
            <Coins className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">Créditos</span>
            <span className="text-sm font-semibold text-primary tabular-nums">
              {credits?.credits_balance ?? 0}
            </span>
          </div>
        )}

        {/* Avatar + Dropdown */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer w-full",
                    "hover:bg-sidebar-accent transition-colors",
                    collapsed && "justify-center",
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0 border border-border">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium text-foreground truncate leading-tight">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate leading-tight">
                          {email}
                        </p>
                      </div>
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56 mb-1"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="h-4 w-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate("/subscription")}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Minha Assinatura
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => window.open("mailto:suporte@geniusads.com.br", "_blank")}>
                  <HeadphonesIcon className="h-4 w-4 mr-2" />
                  Suporte
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setTheme(nextTheme)}>
                  <ThemeIcon className="h-4 w-4 mr-2" />
                  {themeLabel}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
