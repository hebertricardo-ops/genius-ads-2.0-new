import { useEffect } from "react";

const heroSlides = [
  "/assets/creatives/creative-01.jpg",
  "/assets/creatives/creative-02.jpg",
  "/assets/creatives/creative-03.jpg",
  "/assets/creatives/creative-04.jpg",
  "/assets/creatives/creative-05.jpg",
  "/assets/creatives/creative-06.jpg",
  "/assets/creatives/creative-07.jpg",
  "/assets/creatives/creative-08.jpg",
  "/assets/creatives/creative-09.jpg",
  "/assets/creatives/creative-10.jpg",
];

// Duplicado para loop seamless: translateX(-50%) = exatamente 1 set completo
const extendedSlides = [...heroSlides, ...heroSlides];

export function HeroCarousel() {
  // Preload em background após carregamento
  useEffect(() => {
    heroSlides.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <div
      className="w-full overflow-hidden pb-8"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
    >
      <div
        className="flex"
        style={{ animation: "hero-scroll 30s linear infinite" }}
      >
        {extendedSlides.map((src, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 px-1.5 w-1/2 md:w-1/3 lg:w-[calc(100%/6)]"
          >
            <img
              src={src}
              alt=""
              aria-hidden="true"
              loading={idx < 7 ? "eager" : "lazy"}
              className="w-full aspect-[3/4] object-cover object-center rounded-xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
