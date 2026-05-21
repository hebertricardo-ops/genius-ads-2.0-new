import { Sparkles, Globe, Share2, Zap, Check } from "lucide-react";

// Para adicionar novos pilares no futuro, inclua um novo objeto neste array.
// O grid se ajusta automaticamente (2 colunas em desktop).
const pilars = [
  {
    icon: Sparkles,
    title: "Criação Inteligente",
    subtitle: "O motor que elimina o bloqueio criativo",
    description:
      "Gere criativos estáticos e carrosséis completos em menos de 60 segundos. A IA analisa as dores, desejos e objeções do seu público e entrega imagem profissional + 3 opções de copy estruturadas para conversão — sem você precisar pensar em nada.",
    benefits: [
      "Criativo completo: imagem + copy em um clique",
      "Carrosséis gerados slide a slide automaticamente",
      "3 ângulos de copy diferentes a cada geração",
      "Baseado nas dores reais do seu público-alvo",
    ],
    highlight: true,
  },
  {
    icon: Globe,
    title: "Identidade de Marca",
    subtitle: "Configure uma vez. Use em todas as gerações.",
    description:
      "Cole a URL do seu site ou o @ do seu Instagram e o Genius ADS extrai automaticamente sua identidade visual, tom de voz e posicionamento. A partir daí, todos os criativos gerados já nascem com a cara da sua marca.",
    benefits: [
      "Extração automática de marca via site ou Instagram",
      "Paleta de cores, estilo visual e tom de voz preservados",
      "Múltiplas marcas na mesma conta",
      "Consistência visual em todos os criativos gerados",
    ],
    highlight: false,
  },
  {
    icon: Share2,
    title: "Publicação e Gestão",
    subtitle: "Do criativo ao feed — sem sair da plataforma",
    description:
      "Publique diretamente nas suas redes sociais pelo próprio Genius ADS, agende posts no calendário integrado ou baixe os arquivos e use onde quiser. O fluxo completo de criação e distribuição em um único lugar.",
    benefits: [
      "Publicação direta nas redes sociais pela plataforma",
      "Calendário de postagens para manter frequência",
      "Download dos criativos em alta resolução",
      "Visão geral do conteúdo agendado por marca",
    ],
    highlight: false,
  },
  {
    icon: Zap,
    title: "Escala e Volume",
    subtitle: "Produza mais sem aumentar o esforço",
    description:
      "Com criativos ilimitados no plano Advanced, o Genius ADS foi construído para quem precisa de volume — afiliados em campanha, social media com múltiplos clientes, agências com várias contas.",
    benefits: [
      "Criativos ilimitados no plano Advanced",
      "Geração em série: múltiplos criativos em minutos",
      "Créditos avulsos para picos de demanda",
      "Validação de ofertas até 10x mais rápido",
    ],
    highlight: false,
  },
];

export function FeaturesPilarsSection() {
  return (
    <section className="w-full py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">

        {/* Título */}
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-3">
            Tudo que você precisa para criar, publicar e escalar —{" "}
            <span className="text-gradient">em um só lugar</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            O Genius ADS não é só um gerador de criativos. É o sistema completo que cuida
            de cada etapa da sua produção de conteúdo.
          </p>
        </div>

        {/* Grid 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pilars.map(({ icon: Icon, title, subtitle, description, benefits, highlight }, index) => (
            <div
              key={title}
              className={`
                rounded-2xl p-8 border flex flex-col gap-5 transition-all duration-300
                shadow-sm animate-fade-in
                ${highlight
                  ? "border-transparent bg-orange-900/80 text-white"
                  : "border-transparent bg-zinc-200"
                }
              `}
              style={{ animationDelay: `${index * 150}ms`, animationFillMode: "both" }}
            >
              {/* Ícone + títulos */}
              <div className="flex items-start gap-4">
                <div
                  className={`
                    w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                    ${highlight ? "gradient-primary shadow-glow" : "bg-primary/10 border border-primary/20"}
                  `}
                >
                  <Icon className={`w-5 h-5 ${highlight ? "text-primary-foreground" : "text-primary"}`} />
                </div>
                <div>
                  <h3 className={`font-display text-lg leading-tight ${highlight ? "text-white" : "text-foreground"}`}>{title}</h3>
                  <p className={`text-sm italic mt-0.5 ${highlight ? "text-orange-200" : "text-primary"}`}>{subtitle}</p>
                </div>
              </div>

              {/* Descrição */}
              <p className={`text-sm leading-relaxed ${highlight ? "text-orange-100/80" : "text-muted-foreground"}`}>{description}</p>

              {/* Benefícios */}
              <ul className="space-y-2.5">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${highlight ? "bg-white/10 border-white/30" : "bg-primary/10 border-primary/30"}`}>
                      <Check className={`w-3 h-3 ${highlight ? "text-white" : "text-primary"}`} />
                    </span>
                    <span className={`text-sm ${highlight ? "text-white" : "text-foreground"}`}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
