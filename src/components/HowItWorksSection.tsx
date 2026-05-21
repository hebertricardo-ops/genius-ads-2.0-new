import step1Image from "@/assets/step1-brande-ai.png";
import step2Image from "@/assets/step2.png";
import step3Image from "@/assets/step3.png";
import step4Image from "@/assets/step4.png";
import step5Image from "@/assets/step5.png";
import step6Image from "@/assets/step6.png";

const step1 = {
  number: "01",
  title: "Configure sua marca uma vez",
  desc: "Cole a URL do seu site ou o @ do seu Instagram. O Genius ADS lê sua marca, extrai cores, tom de voz e identidade visual — e usa tudo isso em todas as suas gerações automaticamente.",
  badge: "Por onde começar",
};

const steps = [
  {
    number: "02",
    title: "Informe seu produto ou serviço",
    desc: "Descreva o que você vende, a promessa principal e o público. Ou deixe a IA sugerir com base na sua marca configurada.",
    image: step2Image,
  },
  {
    number: "03",
    title: "Envie suas imagens",
    desc: "Produto, logo, print ou modelo. Qualquer imagem serve como ponto de partida.",
    image: step3Image,
  },
  {
    number: "04",
    title: "Gere criativos ou carrosséis",
    desc: "Em menos de 60 segundos o Genius ADS entrega o criativo completo — imagem profissional + 3 opções de copy estruturadas para conversão.",
    image: step4Image,
  },
  {
    number: "05",
    title: "Agende ou baixe",
    desc: "Publique direto nas suas redes pelo próprio Genius ADS, agende no calendário de postagens ou baixe o arquivo e use onde quiser.",
    image: step5Image,
  },
  {
    number: "06",
    title: "Pronto para anunciar ou postar",
    desc: "Sem sair da plataforma. Sem Canva. Sem designer. Sem perder tempo.",
    image: step6Image,
  },
];

export function HowItWorksSection() {
  return (
    <section className="w-full bg-white py-16">
      <div className="max-w-4xl mx-auto px-4">
      <h2 className="text-2xl md:text-3xl font-display text-foreground mb-12 text-center">
        Como funciona o <span className="text-gradient">Genius ADS</span>
      </h2>

      {/* Passo 1 — destaque full width */}
      <div className="relative rounded-2xl gradient-primary p-px mb-8 shadow-glow">
        <div className="rounded-2xl bg-background/95 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-3">
              <div className="w-28 h-28 rounded-2xl overflow-hidden">
                <img src={step1Image} alt="Configure sua marca" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full px-3 py-1 whitespace-nowrap">
                {step1.badge}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-primary/60 font-semibold tracking-widest">
                  PASSO {step1.number}
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-display text-foreground mb-3">
                {step1.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{step1.desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Passos 2–6 — grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map(({ number, title, desc, image }) => (
          <div
            key={number}
            className="rounded-xl border border-border bg-secondary/30 p-6 flex items-start gap-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
              <img src={image} alt={title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-primary/50 font-semibold tracking-widest mb-1">
                PASSO {number}
              </div>
              <h3 className="font-display text-foreground text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
