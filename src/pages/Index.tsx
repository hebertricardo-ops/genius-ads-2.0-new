import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap, ArrowRight, Sparkles, Image, Shield, Clock,
  Brain, Target, Upload, PenTool, Layers, Quote,
  Check, X, Package, FileText, BarChart3
} from "lucide-react";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { UseCasesSection } from "@/components/UseCasesSection";
import { FeaturesPilarsSection } from "@/components/FeaturesPilarsSection";
import { MultiDeviceSection } from "@/components/MultiDeviceSection";
import logoText from "@/assets/logo-text.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SUBSCRIPTION_PLANS = [
  {
    name: "Pro",
    slug: "pro",
    tagline: "Para quem quer criar criativos em escala",
    monthlyPrice: 59.90,
    annualPrice: 539.10,
    credits: 500,
    highlight: false,
    features: [
      "500 créditos/mês",
      "Até 4 marcas",
      "Criativos e carrosséis",
      "Histórico de criativos",
      "Suporte via e-mail",
    ],
    cta: "Assinar Pro",
    checkoutMonthly: "https://pay.hotmart.com/V106013862G?off=rzs761g9&checkoutMode=10",
    checkoutAnnual:  "https://pay.hotmart.com/V106013862G?off=7pn98ant&checkoutMode=10",
  },
  {
    name: "Advanced",
    slug: "advanced",
    tagline: "Para agências e gestores que querem mais controle",
    monthlyPrice: 99.90,
    annualPrice: 899.16,
    credits: 1000,
    highlight: true,
    features: [
      "1000 créditos/mês",
      "Até 10 marcas",
      "Conecte suas Redes Sociais (IG e FB)",
      "Conecte até 02 perfis (para mais perfis, contrate pacote adicional)",
      "Calendário de postagens",
      "Agendamento de postagens ilimitados",
      "Suporte via WhatsApp",
    ],
    cta: "Assinar Advanced",
    checkoutMonthly: "https://pay.hotmart.com/V106013862G?off=q4rfjdbx&checkoutMode=10",
    checkoutAnnual:  "https://pay.hotmart.com/V106013862G?off=27arm6o7&checkoutMode=10",
  },
  {
    name: "Social Media",
    slug: "social-media",
    tagline: "Para social media managers e agências full-service",
    monthlyPrice: 199.90,
    annualPrice: 1799.10,
    credits: 2000,
    highlight: false,
    features: [
      "2000 créditos/mês",
      "Marcas ilimitadas",
      "Conecte suas Redes Sociais (IG e FB)",
      "Conecte até 06 perfis (para mais perfis, contrate pacote adicional)",
      "Calendário de postagens",
      "Agendamento de postagens ilimitados",
      "Suporte via WhatsApp",
    ],
    cta: "Assinar Social Media",
    checkoutMonthly: "https://pay.hotmart.com/V106013862G?off=zgb0e3jz&checkoutMode=10",
    checkoutAnnual:  "https://pay.hotmart.com/V106013862G?off=2oqov0t6&checkoutMode=10",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);

  return (
    <div className="min-h-screen gradient-hero">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <img src={logoText} alt="Genius ADS" className="h-16 text-xl object-fill" />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Entrar
          </Button>
          <Button variant="hero" size="sm" onClick={() => navigate("/signup")}>
            Começar grátis
          </Button>
        </div>
      </nav>

      {/* DOBRA 1 — Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-6xl font-display text-foreground leading-tight mb-6 animate-fade-in">
          Chega de travar na criação. Gere criativos completos com copy e imagem em menos de <span className="text-gradient">60 segundos</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in">
          Crie, agende e publique seus criativos direto pela plataforma — com copy estruturada para conversão e imagem profissional gerada pela IA em menos de 60 segundos.
        </p>
        <div className="flex items-center justify-center gap-4 mb-14 animate-fade-in">
          <Button variant="hero" size="lg" onClick={() => navigate("/signup")}>
            Começar agora
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}>
            Ver Plano
          </Button>
        </div>

        {/* Video */}
        <div className="max-w-3xl mx-auto mb-14 animate-fade-in">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-border/50" style={{ paddingBottom: '56.25%' }}>
            {!isVideoPlaying ? (
              <div
                className="absolute inset-0 cursor-pointer group"
                onClick={() => setIsVideoPlaying(true)}
              >
                <img
                  src="https://img.youtube.com/vi/XsivhOx4Q0Q/maxresdefault.jpg"
                  alt="Genius ADS - Demo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <PlayCircle className="w-20 h-20 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                </div>
              </div>
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/XsivhOx4Q0Q?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0"
                title="Genius ADS - Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>

      </section>

      {/* DOBRA 2 — Dor */}
      <section className="w-full bg-gradient-to-b from-zinc-600 to-zinc-950 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-display text-white mb-10 text-center">
          Você já <span className="text-gradient">pensou isso</span>?
        </h2>
        <div className="rounded-2xl p-8 md:p-12 border border-white/10 bg-white/5 backdrop-blur-sm shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {[
              "Eu não sei o que escrever no criativo…",
              "Meu criativo nunca parece bom o suficiente",
              "Demoro demais pra criar e no final nem sei se vai vender",
              "Crio o criativo mas fico horas tentando publicar em cada rede separado",
              "Vejo outros anunciando melhor que eu… mas não sei o que eles fazem",
              "Fico travado olhando pra tela sem saber por onde começar",
              "Testo um ou dois criativos e torço pra dar certo",
              "Nunca consigo manter meu fluxo de postagem nas redes organizado",
            ].map((quote) => (
              <div key={quote} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <Quote className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300 italic">"{quote}"</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-lg text-white font-display">
              Se você já pensou isso…
            </p>
            <p className="text-lg text-primary font-display mt-1">
              o problema não é seu produto ou serviço.
            </p>
            <p className="text-zinc-400 mt-2">
              É a forma como você está criando, gerenciando e publicando seus criativos.
            </p>
          </div>
        </div>
      </div>
      </section>

      {/* DOBRA 3 — Transição Dor → Solução */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-display text-foreground mb-10">
          A culpa <span className="text-gradient">não é sua</span>
        </h2>
        <div className="max-w-xl mx-auto mb-10 rounded-2xl border border-border bg-secondary/30 overflow-hidden">
          {[
            "Você está criando tudo do zero, toda vez",
            "Não tem estrutura pronta de copy",
            "Não sabe quais dores usar",
            "Falta padrão, só tentativa e erro",
            "Criar criativo virou um processo lento",
            "Quando finalmente cria, ainda perde tempo publicando em cada rede separado",
            "E no fim, a frequência cai — e os resultados somem junto",
          ].map((item, i, arr) => (
            <div
              key={item}
              className={`flex items-start gap-4 px-6 py-4 text-left${i < arr.length - 1 ? " border-b border-border/50" : ""}`}
            >
              <span className="w-6 h-6 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-3 h-3 text-destructive" />
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mb-3">A verdade é simples:</p>
        <p className="text-xl font-display text-foreground mb-1">
          Você não precisa ser criativo.
        </p>
        <p className="text-xl font-display text-foreground mb-4">
          Você precisa de um <span className="text-gradient">sistema que cria, organiza e publica por você.</span>
        </p>
        <p className="text-muted-foreground">
          E é exatamente isso que o <span className="text-primary font-semibold">Genius ADS</span> faz.
        </p>
      </section>

      {/* DOBRA 4 — Passo a passo */}
      <HowItWorksSection />

      <UseCasesSection />

      {/* DOBRA 5 — O que você recebe */}
      <FeaturesPilarsSection />

      <MultiDeviceSection />


      {/* DOBRA 7 — Planos de Assinatura */}
      <section id="planos" className="max-w-5xl mx-auto px-4 py-20 pt-[60px]">
        <h2 className="text-2xl md:text-3xl font-display text-foreground mb-4 text-center">
          Escolha seu <span className="text-gradient">plano de assinatura</span>
        </h2>
        <p className="text-center text-muted-foreground mb-8">Cancele quando quiser. Sem fidelidade.</p>

        {/* Toggle mensal/anual */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBillingAnnual(false)}
            className={`text-sm font-medium transition-colors ${!billingAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingAnnual((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${billingAnnual ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${billingAnnual ? "translate-x-5" : ""}`} />
          </button>
          <button
            onClick={() => setBillingAnnual(true)}
            className={`text-sm font-medium transition-colors ${billingAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Anual
            <span className="ml-1.5 text-[11px] font-semibold text-green-500 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">
              -25%
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Card Free — primeiro da esquerda */}
          <div className="gradient-card rounded-2xl p-7 border border-border shadow-card flex flex-col relative">
            <div className="mb-4">
              <h3 className="font-display text-foreground text-xl mb-1">Free</h3>
              <p className="text-xs text-muted-foreground">Para quem quer experimentar antes de assinar</p>
            </div>
            <div className="mb-5">
              <p className="text-2xl font-display text-foreground">R$ 0,00</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sem cartão de crédito</p>
            </div>
            <div className="space-y-2 mb-6 flex-1">
              {[
                "60 créditos para conhecer o Genius ADS",
                "Até 2 marcas",
                "Gere criativos e carrosséis",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-0 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => navigate("/signup")}
            >
              Comece Grátis →
            </Button>
          </div>

          {SUBSCRIPTION_PLANS.map((plan) => {
            const price = billingAnnual ? plan.annualPrice / 12 : plan.monthlyPrice;
            const priceLabel = `R$ ${price.toFixed(2).replace(".", ",")}/mês`;
            const annualLabel = billingAnnual ? `R$ ${plan.annualPrice.toFixed(2).replace(".", ",")} cobrado anualmente` : null;
            const checkoutUrl = billingAnnual ? plan.checkoutAnnual : plan.checkoutMonthly;

            return (
              <div
                key={plan.slug}
                className={`gradient-card rounded-2xl p-7 border shadow-card flex flex-col relative ${
                  plan.highlight ? "border-primary shadow-glow" : "border-border"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-display text-foreground text-xl mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>
                <div className="mb-5">
                  <p className="text-2xl font-display text-foreground">{priceLabel}</p>
                  {annualLabel && <p className="text-xs text-muted-foreground mt-0.5">{annualLabel}</p>}
                </div>
                <div className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span className="text-xs text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant={plan.highlight ? "hero" : "outline"}
                  size="sm"
                  className={`w-full text-xs${!plan.highlight ? " border-0 bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
                  onClick={() => window.open(checkoutUrl, "_blank", "noopener,noreferrer")}
                >
                  {plan.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-8">
          <span>⚡</span>
          Precisa de mais? Compre créditos avulsos e gere criativos sem limite — independente do seu plano.
        </p>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Já tem uma conta?{" "}
          <button onClick={() => navigate("/auth")} className="text-primary underline underline-offset-2">
            Faça login
          </button>{" "}
          e acesse seu painel.
        </p>
      </section>

      {/* DOBRA 8 — Custo de não comprar */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-display text-foreground mb-10 text-center">
          Vamos ser <span className="text-gradient">diretos</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="gradient-card rounded-2xl p-8 border border-border shadow-card">
            <h3 className="font-display text-foreground mb-6">Hoje você:</h3>
            <div className="space-y-3">
              {[
                "Gasta 1 a 2 horas para criar um único criativo",
                "No final do dia fez 4 ou 5 no máximo",
                "Fica na dúvida se está bom o suficiente para anunciar",
                "Paga caro para designer e espera dias para receber",
                "Ainda precisa sair da ferramenta para publicar em cada rede",
                "Perde consistência porque criar todo dia esgota",
                "Testa pouco — e quem testa pouco, vende pouco",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gradient-card rounded-2xl p-8 border border-primary/50 shadow-card shadow-glow">
            <h3 className="font-display text-foreground mb-6">Com o Genius ADS:</h3>
            <div className="space-y-3">
              {[
                "Cria criativos sem limite — adicione créditos conforme sua demanda",
                "Com copy estruturada, imagem profissional e identidade da sua marca",
                "Agenda e publica direto nas suas redes sem sair da plataforma",
                "Mantém frequência de postagem sem depender de inspiração",
                "Testa quantos ângulos precisar e descobre o que realmente converte",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center mt-10 space-y-2">
          <p className="text-lg md:text-xl font-display text-foreground">
            O problema nunca foi criatividade.
          </p>
          <p className="text-lg md:text-xl font-display text-foreground">
            Foi o tempo que você estava perdendo todo dia —{" "}
            <span className="text-gradient">e as vendas que foram junto.</span>
          </p>
        </div>
      </section>

      {/* DOBRA 9 — CTA Final + FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <div className="gradient-card rounded-2xl p-10 border border-border shadow-card text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-4">
            Comece agora com o <span className="text-gradient">Genius ADS</span>
          </h2>
          <p className="text-muted-foreground mb-2">🆓 Teste grátis com 60 créditos — sem cartão de crédito, sem compromisso</p>
          <p className="text-muted-foreground mb-8">Crie até 6 criativos completos gratuitamente e veja o Genius ADS trabalhando por você.</p>
          <Button variant="hero" size="lg" onClick={() => navigate("/signup")}>
            COMECE AGORA GRÁTIS
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <h2 className="text-2xl font-display text-foreground mb-8 text-center">
          Perguntas Frequentes
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {[
            {
              q: "Os criativos gerados parecem genéricos ou são personalizados para minha marca?",
              a: "Todos os criativos são gerados com base na identidade da sua marca — cores, logo, tom de voz e público-alvo que você configura uma única vez na plataforma. O resultado é um criativo com a cara do seu negócio, não um template genérico.",
            },
            {
              q: "Funciona para qualquer nicho ou tipo de produto?",
              a: "Sim. O Genius ADS gera criativos para infoprodutos, produtos físicos, serviços locais, e-commerce, consultorias e muito mais. Basta informar o seu produto e o público-alvo — a IA adapta a copy e a composição visual para o seu contexto.",
            },
            {
              q: "Preciso saber escrever copy ou entender de design?",
              a: "Não. Você informa o produto, o público e os benefícios — o Genius ADS gera a imagem e a copy estruturada para conversão automaticamente. Nenhum conhecimento técnico é necessário.",
            },
            {
              q: "Os criativos funcionam no Meta Ads, Instagram e outras redes?",
              a: "Sim. Os criativos são gerados em formatos prontos para uso em Meta Ads, feed do Instagram, stories e demais redes sociais. Você pode baixar o arquivo ou publicar diretamente pela plataforma.",
            },
            {
              q: "Como funciona o sistema de créditos?",
              a: "Cada criativo estático gerado ou cada slide de carrossel consome 10 créditos. O seu plano inclui um volume mensal de créditos — 500 no PRO, 1.000 no Advanced e 2.000 no Social Media. Se precisar de mais, é só comprar créditos avulsos. Não existe limite fixo de geração.",
            },
            {
              q: "Os créditos que não usei no mês são acumulados?",
              a: "Não. Os créditos do plano mensal são renovados a cada ciclo de faturamento e créditos não utilizados são perdidos na renovação. Créditos avulsos comprados separadamente não expiram e ficam disponíveis até serem consumidos.",
            },
            {
              q: "Posso testar antes de assinar?",
              a: "Sim. O plano Free oferece 60 créditos gratuitos — equivalente a 6 criativos completos — sem precisar de cartão de crédito. Você tem acesso a todas as funcionalidades da plataforma durante o teste.",
            },
            {
              q: "Posso cancelar quando quiser?",
              a: "Sim. Você pode cancelar sua assinatura a qualquer momento pelas configurações da sua conta. O cancelamento interrompe a renovação automática e você mantém acesso até o fim do período já pago. Para reembolsos, o prazo é de 7 dias corridos após a compra, conforme o Código de Defesa do Consumidor.",
            },
            {
              q: "O pagamento é seguro?",
              a: "Sim. Todas as transações realizadas no Genius ADS são processadas e asseguradas pela Hotmart, uma das maiores e mais confiáveis plataformas de pagamento digital da América Latina. O Genius ADS não armazena nenhum dado de cartão de crédito — todas as informações de pagamento são gerenciadas exclusivamente pela Hotmart.",
            },
            {
              q: "Consigo publicar direto nas redes sociais pelo Genius ADS?",
              a: "Sim. Nos planos Advanced e Social Media você conecta seus perfis de Instagram e Facebook e publica ou agenda os criativos diretamente pela plataforma, sem precisar baixar o arquivo e fazer upload manualmente em cada rede.",
            },
            {
              q: "O que é o calendário de postagens?",
              a: "É uma funcionalidade disponível nos planos Advanced e Social Media que permite visualizar, organizar e agendar todos os seus criativos em um calendário mensal, mantendo a frequência de postagem consistente sem esforço manual.",
            },
            {
              q: "Posso gerenciar múltiplas marcas na mesma conta?",
              a: "Sim. O plano PRO suporta até 4 marcas, o Advanced até 10 e o Social Media oferece marcas ilimitadas — ideal para social media managers e agências que gerenciam vários clientes na mesma conta.",
            },
            {
              q: "Como funciona o suporte?",
              a: "O plano PRO inclui suporte via e-mail. Os planos Advanced e Social Media incluem suporte via WhatsApp com atendimento mais ágil. Em todos os planos você tem acesso à documentação e materiais de ajuda disponíveis na plataforma.",
            },
          ].map(({ q, a }, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border">
              <AccordionTrigger className="text-foreground hover:no-underline">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          © 2025 Genius ADS. Todos os direitos reservados.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/privacy-policy" className="hover:text-primary transition-colors underline underline-offset-2">
            Política de Privacidade
          </a>
          <span>·</span>
          <a href="/terms-of-use" className="hover:text-primary transition-colors underline underline-offset-2">
            Termos de Uso
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
