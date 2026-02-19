import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

interface BannerItem {
  id: string;
  image_url: string;
  tag: string;
  title: string;
  subtitle: string;
  button_text: string | null;
  button_link: string | null;
  target_audience: string;
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
  const impressionsSent = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchBanners = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("content_banners")
        .select("id, image_url, tag, title, subtitle, button_text, button_link, target_audience")
        .eq("context", context)
        .eq("status", "active")
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("display_order", { ascending: true });

      const allBanners = (data as unknown as BannerItem[]) ?? [];

      const user = mockGetUser();
      const userEmail = user?.email;

      let userTier = "free";
      let activeEntitlements: string[] = [];

      if (userEmail) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, main_tier")
          .eq("email", userEmail)
          .maybeSingle();

        if (userData) {
          userTier = userData.main_tier;
          const { data: ents } = await supabase
            .from("entitlements")
            .select("product_key")
            .eq("user_id", userData.id)
            .eq("status", "active");
          activeEntitlements = (ents ?? []).map((e: any) => e.product_key);
        }
      }

      const filtered = allBanners.filter((b) => {
        const t = b.target_audience || "all";
        if (t === "all") return true;
        if (["free", "basic", "pro", "ultra"].includes(t)) return userTier === t;
        if (t === "no_alavancagem") return !activeEntitlements.includes("alavancagem");
        if (t === "no_desaltas") return !activeEntitlements.includes("desaltas");
        if (t === "no_live_telegram") return !activeEntitlements.includes("live_telegram");
        if (t === "no_acesso_vitalicio") return !activeEntitlements.includes("acesso_vitalicio");
        return true;
      });

      setBanners(filtered);
      setLoading(false);
    };
    fetchBanners();
  }, [context]);

  useEffect(() => {
    if (banners.length === 0) return;
    const user = mockGetUser();
    let userId: string | null = null;

    const trackImpressions = async () => {
      if (user?.email) {
        const { data: u } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();
        userId = u?.id ?? null;
      }

      const toInsert = banners
        .filter((b) => !impressionsSent.current.has(b.id))
        .map((b) => {
          impressionsSent.current.add(b.id);
          return { banner_id: b.id, user_id: userId, event_type: "impression" as const };
        });

      if (toInsert.length > 0) {
        await supabase.from("banner_analytics").insert(toInsert);
      }
    };

    trackImpressions();
  }, [banners]);

  const trackClick = async (bannerId: string) => {
    const user = mockGetUser();
    let userId: string | null = null;
    if (user?.email) {
      const { data: u } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      userId = u?.id ?? null;
    }
    await supabase.from("banner_analytics").insert({ banner_id: bannerId, user_id: userId, event_type: "click" });
  };

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

  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [emblaApi, banners.length]);

  const handleClick = async (bannerId: string, link: string | null) => {
    if (!link) return;
    await trackClick(bannerId);
    if (link.startsWith("http")) window.open(link, "_blank");
    else navigate(link);
  };

  if (loading) return (
    <div
      className="w-full rounded-xl"
      style={{ height: "clamp(160px, 26vw, 300px)", background: "rgba(0,255,0,0.04)", animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
    />
  );
  if (banners.length === 0) return null;

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {banners.map((b) => (
            <div key={b.id} className="flex-[0_0_100%] min-w-0">
              <div
                className="relative overflow-hidden rounded-xl cursor-pointer group"
                style={{
                  /* Mobile: ~190px, desktop: ~300px */
                  height: "clamp(160px, 26vw, 300px)",
                  border: "1px solid rgba(0,255,0,0.2)",
                  boxShadow: "0 0 20px rgba(0,255,0,0.06)",
                }}
                onClick={() => handleClick(b.id, b.button_link)}
              >
                {b.image_url ? (
                  <img
                    src={b.image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #001400, #002800)" }} />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

                <div className="relative h-full flex flex-col justify-end px-4 sm:px-8 py-3 sm:py-6">
                  {b.tag && (
                    <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 mb-2 rounded-full text-[11px] font-medium uppercase tracking-wider"
                      style={{ background: "rgba(0,255,0,0.15)", border: "1px solid rgba(0,255,0,0.3)", color: "#00DD00" }}>
                      {b.tag}
                    </span>
                  )}
                  <h3 className="text-base sm:text-2xl font-bold text-white mb-0.5 sm:mb-1.5">
                    {b.title}
                  </h3>
                  <p className="text-xs sm:text-sm mb-2 sm:mb-4" style={{ color: "rgba(0,255,0,0.6)" }}>{b.subtitle}</p>
                  {b.button_text && (
                    <button
                      className="inline-flex items-center gap-1.5 w-fit px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all"
                      style={{ background: "#003300", border: "1px solid rgba(0,255,0,0.6)", color: "#00FF00", boxShadow: "0 0 12px rgba(0,255,0,0.2)" }}
                    >
                      {b.button_text}
                      <ChevronRight className="w-3.5 h-3.5" />
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
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,255,0,0.3)" }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: "#00FF00" }} />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,255,0,0.3)" }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "#00FF00" }} />
          </button>
          <div className="flex justify-center gap-1.5 mt-2.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === selectedIndex ? "20px" : "6px",
                  height: "6px",
                  background: i === selectedIndex ? "#00FF00" : "rgba(0,255,0,0.25)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
