import { Sparkles, ArrowLeft, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import logoImg from "@/assets/premier-logo-custom.png";
import { useNavigate, useLocation } from "react-router-dom";
import { PlansModal } from "@/components/PlansModal";
import { BuyCreditsModal } from "@/components/ia-tipster/BuyCreditsModal";
import { isPreviewEnv } from "@/lib/previewEnv";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";

interface AppHeaderProps {
  onShowLifetimeInfoModal?: () => void; // kept for backward compat (unused)
  leftContent?: React.ReactNode;
  headerStyle?: React.CSSProperties;
  showTelegramPill?: boolean; // kept for backward compat (unused)
  showVitalicioPill?: boolean; // kept for backward compat (unused)
  title?: string;
}

const AppHeader = ({ leftContent, headerStyle, title }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const mockUser = mockGetUser();
  const { house: userHouse } = useUserBettingHouse();
  const isHome = location.pathname === "/" || location.pathname === "/tips";

  const [tier, setTier] = useState<string>("");
  const [tierLoaded, setTierLoaded] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const isIATipsterRoute = location.pathname === "/ia-tipster";

  useEffect(() => {
    if (!mockUser) {
      setTierLoaded(true);
      return;
    }
    supabase
      .from("users")
      .select("main_tier")
      .eq("email", mockUser.email.toLowerCase().trim())
      .maybeSingle()
      .then(({ data }) => {
        setTier(((data?.main_tier as string) || "free").toLowerCase().trim());
        setTierLoaded(true);
      });
  }, [mockUser?.email]);

  const isPaid = tier === "premium" || tier === "diamante";
  const isFree = tier === "free" || !tier;

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', ...headerStyle }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {leftContent ? leftContent : (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {!isHome && (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-white"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <img src={logoImg} alt="CL Score" className="h-10 sm:h-12 w-auto" onClick={() => navigate("/")} style={{ cursor: "pointer" }} />
                {title && (
                  <span className="font-bold text-white text-sm">{title}</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              {/* CTA IA Tipster — só na aba Tips (rotas /sport/*) e em preview */}
              {isPreviewEnv() && location.pathname.startsWith("/sport") && (
                <button
                  onClick={() => navigate("/ia-tipster")}
                  className="inline-flex items-center gap-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    padding: "7px 14px",
                    background: "rgba(233,185,73,0.10)",
                    border: "1px solid rgba(233,185,73,0.5)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#FFFFFF",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={14} style={{ color: "#e9b949" }} />
                  Crear Cuotas
                </button>
              )}
              {tierLoaded && isFree && (
                <button
                  onClick={() => window.open("https://t.me/Clscore_bot", "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center gap-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    padding: "7px 14px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#FFFFFF",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={14} />
                  Reclamar Cuota Gratis
                </button>
              )}
              {tierLoaded && isPaid && (
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    padding: "7px 14px",
                    background: "rgba(233,185,73,0.12)",
                    border: "1px solid rgba(233,185,73,0.5)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#e9b949",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={14} />
                  Planes
                </button>
              )}
              {isIATipsterRoute && (
                <button
                  onClick={() => setShowBuyCreditsModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    padding: "7px 14px",
                    background: "#e9b949",
                    border: "1px solid rgba(233,185,73,0.5)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#FFFFFF",
                    letterSpacing: "0.5px",
                    boxShadow: "0 0 14px rgba(233,185,73,0.3)",
                  }}
                  aria-label="Comprar créditos"
                >
                  <Coins size={14} />
                  + Créditos
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <PlansModal
        open={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />
      <BuyCreditsModal
        open={showBuyCreditsModal}
        onClose={() => setShowBuyCreditsModal(false)}
      />
    </>
  );
};

export default AppHeader;
