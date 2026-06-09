import { Button } from "@/components/ui/button";

const packages = [
  {
    name: "Básico",
    credits: 300,
    price: "R$ 39,90",
    highlight: false,
    cta: "COMPRAR PACOTE BÁSICO",
    checkoutUrl: "https://pay.hotmart.com/V106013862G?off=neqe89bq&checkoutMode=10",
  },
  {
    name: "Plus",
    credits: 500,
    price: "R$ 59,90",
    highlight: true,
    cta: "COMPRAR PACOTE PLUS",
    checkoutUrl: "https://pay.hotmart.com/V106013862G?off=qilvstb0&checkoutMode=10",
  },
];

const AddCredits = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-normal text-foreground mb-3">
          Comprar <span className="text-gradient">Créditos Extras</span>
        </h1>
        <p className="text-muted-foreground">
          Escolha o pacote ideal e continue criando seus anúncios sem interrupção
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
        {packages.map(({ name, credits, price, highlight, cta, checkoutUrl }) => (
          <div
            key={name}
            className={`gradient-card rounded-2xl p-7 border shadow-card flex flex-col relative ${
              highlight ? "border-primary shadow-glow" : "border-border"
            }`}
          >
            {highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground whitespace-nowrap">
                Mais popular
              </div>
            )}
            <div className="text-center mb-6 flex-1">
              <h3 className="font-display font-normal text-foreground text-xl mb-4">
                Pacote {name}
              </h3>
              <p className="text-4xl font-display font-normal text-foreground mb-1">{price}</p>
              <p className="text-sm text-muted-foreground">
                {credits.toLocaleString("pt-BR")} créditos
              </p>
            </div>
            <Button
              variant={highlight ? "hero" : "outline"}
              size="sm"
              className="w-full text-[10px] whitespace-normal text-center leading-tight py-2"
              onClick={() => window.open(checkoutUrl, "_blank", "noopener,noreferrer")}
            >
              {cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddCredits;
