import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Zap, Gift, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: React.ReactNode;
}

const slides: Slide[] = [
  {
    id: "ultra",
    title: "Adquira o Ultra",
    subtitle: "Acesso completo a todas as entradas",
    route: "/ultra",
    icon: <Zap className="w-6 h-6" />,
  },
  {
    id: "promocoes",
    title: "Promoções do dia",
    subtitle: "Ofertas exclusivas para você",
    route: "/promocoes",
    icon: <Gift className="w-6 h-6" />,
  },
  {
    id: "alavancagem",
    title: "Desbloqueie Alavancagem",
    subtitle: "Sequências estratégicas de entradas",
    route: "/alavancagem",
    icon: <TrendingUp className="w-6 h-6" />,
  },
  {
    id: "odds-altas",
    title: "Desbloqueie Odds Altas",
    subtitle: "Seleções com maior potencial",
    route: "/odds-altas",
    icon: <Target className="w-6 h-6" />,
  },
];

export const PromoCarousel = () => {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-scroll
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="relative w-full">
      {/* Carousel container */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.id} className="flex-[0_0_100%] min-w-0">
              <div
                className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-purple-500/30 shadow-lg shadow-purple-900/30 cursor-pointer group"
                onClick={() => navigate(slide.route)}
              >
                {/* Background gradient with neon effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1A0D2E] via-[#2D1B4E] to-[#0D0A1A]" />
                
                {/* Neon glow effects */}
                <div className="absolute top-0 left-1/4 w-40 h-40 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-[60px] pointer-events-none" />
                
                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 blur-sm" />
                </div>

                {/* Content */}
                <div className="relative px-5 sm:px-8 py-8 sm:py-12 min-h-[140px] sm:min-h-[180px] flex flex-col justify-center">
                  {/* Icon badge */}
                  <div className="inline-flex w-fit items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300">
                    {slide.icon}
                    <span className="text-xs font-medium uppercase tracking-wider">Premier Ultra</span>
                  </div>
                  
                  <h3 className="text-xl sm:text-3xl font-bold text-white mb-2 group-hover:text-purple-100 transition-colors">
                    {slide.title}
                  </h3>
                  <p className="text-sm sm:text-base text-purple-200/70 mb-4 sm:mb-5">
                    {slide.subtitle}
                  </p>
                  <button className="inline-flex items-center gap-2 w-fit px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-900/40 group-hover:shadow-purple-700/50 group-hover:scale-[1.02]">
                    Acesse aqui
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows - desktop only */}
      <button
        onClick={scrollPrev}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 border border-purple-500/40 hover:bg-purple-500/20 transition-colors backdrop-blur-sm"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={scrollNext}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 border border-purple-500/40 hover:bg-purple-500/20 transition-colors backdrop-blur-sm"
        aria-label="Próximo slide"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === selectedIndex
                ? "bg-purple-500 w-6"
                : "bg-purple-500/30 hover:bg-purple-500/50"
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
