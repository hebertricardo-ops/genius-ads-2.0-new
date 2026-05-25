import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_CTAS = [
  { label: "Clique em Saiba Mais",           action: "Tráfego"      },
  { label: "Faça o seu cadastro",            action: "Cadastro"     },
  { label: "Fale conosco",                   action: "Contato"      },
  { label: "Clique para obter a oferta",     action: "Oferta"       },
  { label: "Compre agora",                   action: "Compra"       },
  { label: "Clique e agende já",             action: "Agendamento"  },
  { label: "Curta se você passa por isso",   action: "Curtir"       },
  { label: "Marca um amigo",                 action: "Comentar"     },
  { label: "Salva para não esquecer",        action: "Salvar"       },
  { label: "Comenta o que achou",            action: "Comentar"     },
  { label: "Segue para mais dicas",          action: "Seguir"       },
  { label: "Compartilha com quem precisa",   action: "Compartilhar" },
  { label: "Curta se quer ver mais",         action: "Curtir"       },
  { label: "Comenta SIM se faz sentido",     action: "Comentar"     },
  { label: "Compartilha e ajuda alguém",     action: "Compartilhar" },
  { label: "Segue para não perder nada",     action: "Seguir"       },
  { label: "Clica no link da bio",           action: "Tráfego"      },
];

interface CTASelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CTASelector({ value, onChange, placeholder = 'Ex: "Compre agora com 30% OFF"' }: CTASelectorProps) {
  const isPresetSelected = (label: string) => value === label;

  return (
    <div className="space-y-3">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background/50 border-border"
      />
      <Label className="text-xs text-muted-foreground">Sugestões rápidas:</Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_CTAS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.label)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
              isPresetSelected(preset.label)
                ? "border-primary bg-primary/10 text-primary"
                : "bg-background/50 text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
