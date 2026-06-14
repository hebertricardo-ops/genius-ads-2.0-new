import { useState, useEffect, useCallback } from "react";
import { Mail, MessageSquare, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CAMPAIGN_TEMPLATES } from "@/constants/campaignTemplates";
import { AdminSection, AdminPeriod } from "@/hooks/useAdmin";

// --- Types -------------------------------------------------------------------

interface AdminUser {
  user_id:      string;
  name:         string | null;
  email:        string;
  whatsapp:     string | null;
  plan_slug:    string;
  used_credits: number;
  member_since: string;
}

interface Campaign {
  id:               string;
  channel:          string;
  template_key:     string;
  subject:          string | null;
  message:          string;
  recipients_count: number;
  status:           string;
  created_at:       string;
}

interface CampaignLog {
  id:            string;
  user_email:    string;
  user_name:     string | null;
  user_whatsapp: string | null;
  channel:       string;
  status:        string;
  error_message: string | null;
  sent_at:       string;
}

interface CampaignTabProps {
  users: AdminUser[];
  fetchSection: (section: AdminSection, period: AdminPeriod, extra?: Record<string, unknown>) => Promise<any>;
}

// --- Helpers -----------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  done:          "bg-green-100 text-green-700",
  partial_error: "bg-amber-100 text-amber-700",
  sending:       "bg-blue-100 text-blue-700",
  pending:       "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  done:          "Enviado",
  partial_error: "Parcial",
  sending:       "Enviando",
  pending:       "Pendente",
};

const CHANNEL_ICON: Record<string, string> = {
  email:    "📧",
  whatsapp: "💬",
};

const TEMPLATE_LABEL: Record<string, string> = Object.fromEntries(
  CAMPAIGN_TEMPLATES.map((t) => [t.key, t.label])
);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// --- CampaignTab -------------------------------------------------------------

const CampaignTab = ({ users, fetchSection }: CampaignTabProps) => {
  const [channel,          setChannel]          = useState<"email" | "whatsapp">("email");
  const [segment,          setSegment]          = useState<string>("no_creative");
  const [templateKey,      setTemplateKey]      = useState<string>("no_creative");
  const [subject,          setSubject]          = useState<string>(CAMPAIGN_TEMPLATES[0].subject);
  const [message,          setMessage]          = useState<string>(CAMPAIGN_TEMPLATES[0].message);
  const [selectedUserIds,  setSelectedUserIds]  = useState<Set<string>>(new Set());
  const [sending,          setSending]          = useState(false);
  const [confirmOpen,      setConfirmOpen]      = useState(false);
  const [campaigns,        setCampaigns]        = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [logsMap,          setLogsMap]          = useState<Record<string, CampaignLog[]>>({});
  const [logsLoading,      setLogsLoading]      = useState<string | null>(null);

  // -- Segmentação de destinatários ------------------------------------------

  const getRecipients = useCallback((): AdminUser[] => {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    let filtered = users;

    if (channel === "whatsapp") {
      filtered = filtered.filter((u) => u.whatsapp);
    }

    if (segment === "no_creative") {
      filtered = filtered.filter((u) => u.used_credits === 0);
    } else if (segment === "generated_not_paid") {
      filtered = filtered.filter((u) => u.used_credits > 0 && u.plan_slug === "free");
    } else if (segment === "free_7d") {
      filtered = filtered.filter(
        (u) => u.plan_slug === "free" && new Date(u.member_since) < sevenDaysAgo
      );
    } else if (segment === "manual") {
      filtered = filtered.filter((u) => selectedUserIds.has(u.user_id));
    }

    return filtered;
  }, [users, channel, segment, selectedUserIds]);

  const recipients = getRecipients();

  // -- Contagens por canal ---------------------------------------------------

  const emailCount    = users.length;
  const whatsappCount = users.filter((u) => u.whatsapp).length;

  // -- Template selection ----------------------------------------------------

  const getTemplateMessage = (tpl: (typeof CAMPAIGN_TEMPLATES)[number], ch: "email" | "whatsapp") => {
    if (tpl.key === "custom") return "";
    return ch === "whatsapp" && "messageWhatsapp" in tpl
      ? (tpl as any).messageWhatsapp as string
      : tpl.message as string;
  };

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    const tpl = CAMPAIGN_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    if (key === "custom") {
      setSubject("");
      setMessage("");
    } else {
      setSubject(tpl.subject as string);
      setMessage(getTemplateMessage(tpl, channel));
    }
  };

  // Recarrega mensagem ao trocar canal (mantém custom intocado)
  useEffect(() => {
    if (templateKey === "custom") return;
    const tpl = CAMPAIGN_TEMPLATES.find((t) => t.key === templateKey);
    if (!tpl) return;
    setMessage(getTemplateMessage(tpl, channel));
  }, [channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Histórico de campanhas ------------------------------------------------

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetchSection("campaigns", "all");
      setCampaigns(res?.campaigns ?? []);
    } catch {
      // silencioso
    } finally {
      setCampaignsLoading(false);
    }
  }, [fetchSection]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const loadLogs = async (campaignId: string) => {
    if (logsMap[campaignId]) return;
    setLogsLoading(campaignId);
    try {
      const res = await fetchSection("campaign_logs", "all", { campaign_id: campaignId });
      setLogsMap((prev) => ({ ...prev, [campaignId]: res?.logs ?? [] }));
    } catch {
      // silencioso
    } finally {
      setLogsLoading(null);
    }
  };

  const handleToggleCampaign = (id: string) => {
    if (expandedCampaign === id) {
      setExpandedCampaign(null);
    } else {
      setExpandedCampaign(id);
      loadLogs(id);
    }
  };

  // -- Envio -----------------------------------------------------------------

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const payload = {
        channel,
        template_key: templateKey,
        subject:      channel === "email" ? subject : undefined,
        message,
        recipients:   recipients.map((u) => ({
          user_id:  u.user_id,
          email:    u.email,
          name:     u.name ?? u.email.split("@")[0],
          whatsapp: u.whatsapp ?? undefined,
        })),
      };

      const { data, error } = await supabase.functions.invoke("admin-send-campaign", {
        body: payload,
      });

      if (error) throw error;

      const { total, sent, errors } = data as { total: number; sent: number; errors: number };

      if (errors === 0) {
        toast.success(`✅ Campanha enviada — ${sent} de ${total} disparados`);
      } else {
        toast.warning(`⚠️ Campanha com erros — ${sent} de ${total} enviados`);
      }

      await loadCampaigns();
    } catch (err: any) {
      toast.error(`Erro ao disparar campanha: ${err?.message ?? "Erro desconhecido"}`);
    } finally {
      setSending(false);
    }
  };

  // -- Seleção manual --------------------------------------------------------

  const manualPool = channel === "whatsapp"
    ? users.filter((u) => u.whatsapp)
    : users;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUserIds.size === manualPool.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(manualPool.map((u) => u.user_id)));
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* === BLOCO 1: FORMULÁRIO ============================================ */}
      <div className="gradient-card rounded-xl border border-border p-6 space-y-6">

        {/* 1. Canal */}
        <div>
          <p className="text-sm font-medium mb-3">1. Canal de Envio</p>
          <div className="flex gap-3">
            {(["email", "whatsapp"] as const).map((ch) => {
              const count  = ch === "email" ? emailCount : whatsappCount;
              const active = channel === ch;
              return (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {ch === "email" ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  {ch === "email" ? "📧 Email" : "💬 WhatsApp"}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-primary/20" : "bg-muted"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Segmento */}
        <div>
          <p className="text-sm font-medium mb-3">2. Segmento</p>
          <div className="space-y-2">
            {[
              { value: "no_creative",        label: "Não geraram nenhum criativo" },
              { value: "generated_not_paid", label: "Geraram mas não compraram (free com uso)" },
              { value: "free_7d",            label: "Plano free há mais de 7 dias" },
              { value: "manual",             label: "Selecionar manualmente" },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="segment"
                  value={value}
                  checked={segment === value}
                  onChange={() => setSegment(value)}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
              </label>
            ))}
          </div>

          {/* Badge de contagem */}
          {segment !== "manual" && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              {recipients.length} usuário{recipients.length !== 1 ? "s" : ""} selecionado{recipients.length !== 1 ? "s" : ""}
            </div>
          )}

          {/* Tabela de seleção manual */}
          {segment === "manual" && (
            <div className="mt-3 border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === manualPool.length && manualPool.length > 0}
                    onChange={toggleAll}
                    className="accent-primary"
                  />
                  Selecionar todos ({manualPool.length})
                </label>
                <span className="text-xs text-primary font-medium">
                  {selectedUserIds.size} selecionado{selectedUserIds.size !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {manualPool.map((u) => (
                  <label
                    key={u.user_id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(u.user_id)}
                      onChange={() => toggleUser(u.user_id)}
                      className="accent-primary shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {u.whatsapp && (
                      <span className="text-xs text-muted-foreground shrink-0">{u.whatsapp}</span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {u.used_credits} créditos
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Mensagem */}
        <div>
          <p className="text-sm font-medium mb-3">3. Mensagem</p>

          {/* Grid de templates */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {CAMPAIGN_TEMPLATES.map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => applyTemplate(tpl.key)}
                className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                  templateKey === tpl.key
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* Assunto (só email) */}
          {channel === "email" && (
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">Assunto</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do email"
                className="text-sm"
              />
            </div>
          )}

          {/* Mensagem */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1 block">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a mensagem... Use {{nome}} para personalizar."
              rows={6}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Preview */}
          {message && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{"Preview ({{nome}} → João)"}</p>
              <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs whitespace-pre-wrap text-foreground/80 max-h-40 overflow-y-auto">
                {message.replace(/\{\{nome\}\}/gi, "João")}
              </div>
            </div>
          )}
        </div>

        {/* Botão disparar */}
        <Button
          className="w-full gradient-primary text-white font-medium min-h-[44px]"
          onClick={() => setConfirmOpen(true)}
          disabled={sending || recipients.length === 0 || !message.trim()}
        >
          {sending
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Disparando para {recipients.length} usuários...</>
            : `DISPARAR CAMPANHA → (${recipients.length} destinatário${recipients.length !== 1 ? "s" : ""})`
          }
        </Button>
      </div>

      {/* === BLOCO 2: HISTÓRICO ============================================= */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Histórico de Campanhas</h3>
          <button
            onClick={loadCampaigns}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Atualizar
          </button>
        </div>

        {campaignsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma campanha disparada ainda.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">Data</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">Canal</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">Template</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Assunto</th>
                  <th className="text-right px-3 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">Enviados</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <>
                    <tr
                      key={c.id}
                      className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => handleToggleCampaign(c.id)}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2.5">
                        {CHANNEL_ICON[c.channel] ?? c.channel}
                      </td>
                      <td className="px-3 py-2.5 text-foreground">
                        {TEMPLATE_LABEL[c.template_key] ?? c.template_key}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-[160px] truncate hidden md:table-cell">
                        {c.subject ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">{c.recipients_count}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? STATUS_BADGE.pending}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {logsLoading === c.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : expandedCampaign === c.id
                            ? <ChevronDown className="h-3 w-3" />
                            : <ChevronRight className="h-3 w-3" />
                        }
                      </td>
                    </tr>

                    {/* Logs expandidos */}
                    {expandedCampaign === c.id && (
                      <tr key={`logs-${c.id}`} className="border-t border-border">
                        <td colSpan={7} className="px-3 py-3 bg-muted/20">
                          {logsLoading === c.id ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-xs">Carregando logs...</span>
                            </div>
                          ) : (logsMap[c.id] ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">Nenhum log encontrado.</p>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {(logsMap[c.id] ?? []).map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center gap-3 text-xs py-1 border-b border-border/40 last:border-0"
                                >
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === "sent" ? "bg-green-500" : "bg-red-500"}`} />
                                  <span className="font-medium min-w-0 truncate">{log.user_name ?? "—"}</span>
                                  <span className="text-muted-foreground min-w-0 truncate">{log.user_email}</span>
                                  {log.user_whatsapp && (
                                    <span className="text-muted-foreground shrink-0">{log.user_whatsapp}</span>
                                  )}
                                  {log.error_message && (
                                    <span className="text-red-500 truncate">{log.error_message}</span>
                                  )}
                                  <span className="text-muted-foreground shrink-0 ml-auto">
                                    {new Date(log.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === MODAL: Confirmação ============================================= */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-normal flex items-center gap-2">
              ⚠️ Confirmar Disparo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Canal</span>
              <span className="font-medium">{CHANNEL_ICON[channel]} {channel === "email" ? "Email" : "WhatsApp"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destinatários</span>
              <span className="font-medium">{recipients.length} usuários</span>
            </div>
            {channel === "email" && subject && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Assunto</span>
                <span className="font-medium text-right text-xs">{subject}</span>
              </div>
            )}
            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
              {message.replace(/\{\{nome\}\}/gi, "[nome]")}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="gradient-primary text-white"
              onClick={handleSend}
              disabled={sending}
            >
              Confirmar e Disparar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignTab;
