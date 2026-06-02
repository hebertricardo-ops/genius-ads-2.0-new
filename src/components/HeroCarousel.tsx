import { useState, useEffect } from "react";

// Imagens do carrossel — colocar os arquivos em public/assets/creatives/
// O array pode ser expandido com novas imagens a qualquer momento
// sem alterar o componente.
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

const INTERVAL_MS = 3000;
const TRANSITION_MS = 800;

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(heroSlides.map(() => false));

  // Auto-rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroSlides.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Preload all images after page load
  useEffect(() => {
    heroSlides.forEach((src, idx) => {
      const img = new Image();
      img.src = src;
      img.onload = () =>
        setLoaded((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Slides */}
      {heroSlides.map((src, idx) => (
        <div
          key={src}
          className="absolute inset-0"
          style={{
            opacity: idx === current ? 1 : 0,
            transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
            zIndex: idx === current ? 1 : 0,
          }}
        >
          {loaded[idx] ? (
            <img
              src={src}
              alt=""
              loading={idx === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover object-center"
              aria-hidden="true"
            />
          ) : (
            // Placeholder enquanto a imagem real não está disponível
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, #f97316 0%, #0f0f0f 100%)`,
              }}
            />
          )}
        </div>
      ))}

      {/* Overlay com gradiente vertical para legibilidade */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.65) 100%)",
          zIndex: 2,
        }}
      />
    </div>
  );
}
