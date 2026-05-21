import { useState } from "react";
import { Check } from "lucide-react";
import imgCriadores from "@/assets/criador-de-conteudo.png";
import imgInfoprodutores from "@/assets/infoprodutor.png";
import imgServicos from "@/assets/prestador-de-servico.png";
import imgNegocios from "@/assets/negocios-online.png";
import imgSocialMedia from "@/assets/social-media.png";
import imgAgencias from "@/assets/agencia.png";

interface UseCase {
  tab: string;
  title: string;
  headline: string;
  description: string;
  benefits: string[];
  imageClass: string;
  image: string;
}

const useCases: UseCase[] = [
  {
    tab: "Criadores de Conteúdo",
    title: "Criadores de Conteúdo",
    headline: "Mais conteúdo, menos tempo parado",
    description:
      "Pare de travar na hora de criar posts. Com o Genius ADS você gera criativos e carrosséis prontos para publicar em segundos, mantém frequência de postagem com o calendário integrado e publica direto nas suas redes sem sair da plataforma.",
    benefits: [
      "Criativos e carrosséis gerados em menos de 60 segundos",
      "Calendário de postagens para manter consistência",
      "Publicação direta nas redes sociais pela plataforma",
    ],
    imageClass: "usecase-image-criadores",
    image: imgCriadores,
  },
  {
    tab: "Infoprodutores e Afiliados",
    title: "Infoprodutores e Afiliados",
    headline: "Volume de criativos para testar mais e vender mais rápido",
    description:
      "No mercado de infoprodutos, quem testa mais vence. O Genius ADS gera dezenas de criativos com ângulos, dores e copies diferentes em minutos — para você descobrir o que converte sem depender de designer ou agência.",
    benefits: [
      "Criativos ilimitados por mês com copy estruturada para conversão",
      "Múltiplos ângulos gerados a partir do mesmo produto",
      "Valide ofertas até 10x mais rápido",
    ],
    imageClass: "usecase-image-infoprodutores",
    image: imgInfoprodutores,
  },
  {
    tab: "Prestadores de Serviços",
    title: "Prestadores de Serviços",
    headline: "Apareça todo dia sem precisar pensar no que postar",
    description:
      "Você é bom no que faz — mas não tem tempo para criar conteúdo todo dia. O Genius ADS gera criativos profissionais para divulgar seus serviços, construir autoridade e atrair clientes sem você precisar aprender design ou copywriting.",
    benefits: [
      "Criativos personalizados para o seu nicho de serviço",
      "Copy baseada nas dores reais dos seus clientes",
      "Agenda e publica por você — sem sair da plataforma",
    ],
    imageClass: "usecase-image-servicos",
    image: imgServicos,
  },
  {
    tab: "Negócios Online",
    title: "Negócios Online",
    headline: "Do produto ao anúncio em menos de 60 segundos",
    description:
      "Você tem o produto. O Genius ADS cria o anúncio. Configure sua marca uma vez e gere criativos com a identidade visual do seu negócio, prontos para rodar no Meta Ads, Instagram ou onde você quiser anunciar.",
    benefits: [
      "Criativos com a identidade visual da sua marca",
      "Copy com foco em conversão e vendas diretas",
      "Pronto para anunciar no mesmo dia",
    ],
    imageClass: "usecase-image-negocios",
    image: imgNegocios,
  },
  {
    tab: "Social Media",
    title: "Social Media",
    headline: "Escale a entrega para todos os seus clientes sem aumentar a equipe",
    description:
      "Gerenciar múltiplos clientes significa criar conteúdo em volume, todo dia. O Genius ADS centraliza a produção de criativos, aplica a identidade de cada marca automaticamente e publica direto nas redes — para você entregar mais em menos tempo.",
    benefits: [
      "Múltiplas marcas configuradas na mesma conta",
      "Geração em escala sem perder a identidade de cada cliente",
      "Calendário e postagem direta integrados",
    ],
    imageClass: "usecase-image-socialmedia",
    image: imgSocialMedia,
  },
  {
    tab: "Agências",
    title: "Agências",
    headline: "Produza mais e entregue mais rápido. Mais clientes com menos custo",
    description:
      "Reduza o tempo de produção de criativos da sua agência e aumente a margem por cliente. Com o Genius ADS, sua equipe gera, agenda e publica criativos profissionais em escala — sem gargalo criativo e sem depender de um único designer para tudo.",
    benefits: [
      "Produção de criativos em escala para múltiplos clientes",
      "Identidade visual de cada marca preservada automaticamente",
      "Fluxo completo: criação → agendamento → publicação",
    ],
    imageClass: "usecase-image-agencias",
    image: imgAgencias,
  },
];

export function UseCasesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = useCases[activeIndex];

  return (
    <section className="w-full py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4">

        {/* Título */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-3">
            O Genius ADS trabalha para você —{" "}
            <span className="text-gradient">em qualquer segmento</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            De criadores de conteúdo a agências — a plataforma se adapta ao seu
            segmento e ao seu volume de produção.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex overflow-x-auto scrollbar-hide bg-zinc-200 border border-zinc-300 rounded-full p-1 gap-1">
            {useCases.map((uc, i) => (
              <button
                key={uc.tab}
                onClick={() => setActiveIndex(i)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap
                  ${i === activeIndex
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "bg-transparent text-zinc-500 hover:text-zinc-800"
                  }
                `}
              >
                {uc.tab}
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div
          key={activeIndex}
          className="rounded-2xl border border-border bg-secondary/20 overflow-hidden animate-fade-in"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* Texto */}
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <p className="text-xs font-mono text-primary/60 font-semibold tracking-widest mb-3 uppercase">
                {active.title}
              </p>
              <h3 className="text-xl md:text-2xl font-display text-primary leading-snug mb-4">
                {active.headline}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {active.description}
              </p>
              <ul className="space-y-3">
                {active.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </span>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${active.imageClass} aspect-video md:aspect-auto min-h-[220px] overflow-hidden`}>
              <img
                src={active.image}
                alt={active.title}
                className="w-full h-full object-cover"
              />
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
