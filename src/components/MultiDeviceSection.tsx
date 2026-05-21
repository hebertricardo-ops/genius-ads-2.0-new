import mockupDevices from "@/assets/mockup-genius-devices.png";

export function MultiDeviceSection() {
  return (
    <section className="w-full py-20 bg-gradient-to-br from-zinc-50 to-zinc-100">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-12">

          {/* Texto — 40% */}
          <div className="flex-shrink-0 md:w-[38%] text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-display text-foreground mb-4 leading-snug">
              Acesse o Genius ADS de{" "}
              <span className="text-gradient">qualquer lugar</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Crie, agende e publique seus criativos pelo computador, tablet ou
              celular — com todo o histórico de geração sincronizado entre os
              dispositivos.
            </p>
          </div>

          {/* Mockup — 60% */}
          <div className="flex-1 flex items-center justify-center">
            <img
              src={mockupDevices}
              alt="Genius ADS em múltiplos dispositivos"
              className="w-full max-w-lg h-auto object-contain rounded-[2rem]"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
