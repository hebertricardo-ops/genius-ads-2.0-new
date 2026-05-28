import { useState } from "react";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Headphones, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";

// ─── Formulário de email reutilizável ──────────────────────────────────────

function EmailSupportForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, boolean> = {};
    if (!subject.trim()) newErrors.subject = true;
    if (!email.trim()) newErrors.email = true;
    if (!message.trim()) newErrors.message = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("send-support-email", {
        body: { subject, email, message },
      });

      if (error) throw error;

      setSent(true);
      setSubject("");
      setMessage("");
      onSuccess?.();
    } catch {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Solicitação enviada!</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Responderemos em até 48 horas no email <strong>{email}</strong>.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-xs text-primary hover:underline mt-2"
          >
            Enviar outra solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="subject" className="text-sm">Assunto *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: false })); }}
          placeholder="Descreva o assunto brevemente"
          className={errors.subject ? "border-red-500" : ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-email" className="text-sm">Seu email de contato *</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: false })); }}
          placeholder="seu@email.com"
          className={errors.email ? "border-red-500" : ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-sm">Descreva o problema *</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: false })); }}
          placeholder="Descreva com detalhes o que está acontecendo..."
          rows={6}
          className={errors.message ? "border-red-500" : ""}
        />
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        ⏱️ Prazo de resposta: até 48 horas úteis
      </p>

      <Button type="submit" variant="hero" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : "Enviar Solicitação"}
      </Button>
    </form>
  );
}

// ─── Support page ───────────────────────────────────────────────────────────

const Support = () => {
  const { planName, hasSocialMedia } = usePlan();
  const [showEmailForm, setShowEmailForm] = useState(false);

  const isWhatsAppPlan = hasSocialMedia || planName === "Advanced" || planName === "Social Media";

  const whatsappUrl = `https://wa.me/5521975723110?text=${encodeURIComponent(
    "Olá, sou usuário do Genius ADS e preciso de suporte."
  )}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Headphones className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-normal text-foreground">Suporte</h1>
          <p className="text-sm text-muted-foreground">
            {planName} — Suporte {isWhatsAppPlan ? "Premium" : "por Email"}
          </p>
        </div>
      </div>

      {isWhatsAppPlan ? (
        <div className="space-y-6">
          {/* WhatsApp card */}
          <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-base font-display font-normal text-foreground">Suporte via WhatsApp</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Atendimento rápido diretamente no WhatsApp. Nossa equipe está disponível para ajudar.
            </p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full">
                <MessageCircle className="h-5 w-5" />
                Abrir WhatsApp
              </Button>
            </a>
            <p className="text-xs text-muted-foreground text-center">(21) 97572-3110</p>
          </div>

          {/* Email toggle */}
          <div>
            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="text-sm text-primary hover:underline"
            >
              Prefere enviar por email? Clique aqui {showEmailForm ? "↑" : "↓"}
            </button>

            {showEmailForm && (
              <div className="mt-4 gradient-card rounded-2xl border border-border shadow-card p-6">
                <EmailSupportForm onSuccess={() => setShowEmailForm(false)} />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Email only */
        <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Preencha o formulário abaixo. Nossa equipe responderá em até 48 horas úteis.
          </p>
          <EmailSupportForm />
        </div>
      )}
    </div>
  );
};

export default Support;
