import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/integrations/supabase/client";

interface BannerItem {
  id: string;
  image_url: string;
  tag: string;
  title: string;
  subtitle: string;
  button_text: string | null;
  button_link: string | null;
}

interface PromoCarouselProps {
  context?: "futebol" | "cassino";
}

export const PromoCarousel = ({ context = "futebol" }: PromoCarouselProps) => {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from("content_banners")
        .select("id, image_url, tag, title, subtitle, button_text, button_link")
        .eq("context", context)
        .eq("active", true)
        .order("display_order", { ascending: true });
      setBanners((data as BannerItem[]) ?? []);
      setLoading(false);
    };
    fetchBanners();
  }, [context]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => { emblaApi.off("select", onSelect); emblaApi.off("reInit", onSelect); };
  }, [emblaApi, onSelect]);

  // Auto-scroll
  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [emblaApi, banners.length]);

  const handleClick = (link: string | null) => {
    if (!link) return;
    if (link.startsWith("http")) window.open(link, "_blank");
    else navigate(link);
  };

  if (loading) return <div className="w-full aspect-video rounded-xl bg-gray-800/50 animate-pulse" />;
  if (banners.length === 0) return null;

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-xl sm:rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {banners.map((b) => (
            <div key={b.id} className="flex-[0_0_100%] min-w-0">
              <div
                className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-purple-500/30 shadow-lg shadow-purple-900/30 cursor-pointer group aspect-video"
                onClick={() => handleClick(b.button_link)}
              >
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1A0D2E] via-[#2D1B4E] to-[#0D0A1A]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute top-0 left-1/4 w-40 h-40 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative h-full flex flex-col justify-end px-5 sm:px-8 py-5 sm:py-8">
                  {b.tag && (
                    <span className="inline-flex w-fit items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-medium uppercase tracking-wider backdrop-blur-sm">
                      {b.tag}
                    </span>
                  )}
                  <h3 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 group-hover:text-purple-100 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-sm sm:text-base text-purple-200/70 mb-3 sm:mb-5">{b.subtitle}</p>
                  {b.button_text && (
                    <button className="inline-flex items-center gap-2 w-fit px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-900/40 group-hover:shadow-purple-700/50 group-hover:scale-[1.02]">
                      {b.button_text}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 border border-purple-500/40 hover:bg-purple-500/20 transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 border border-purple-500/40 hover:bg-purple-500/20 transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="flex justify-center gap-2 mt-3">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === selectedIndex ? "bg-purple-500 w-6" : "bg-purple-500/30 hover:bg-purple-500/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
