import { Sparkles, ArrowLeft, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import logoImg from "@/assets/premier-logo-custom.png";
import { useNavigate, useLocation } from "react-router-dom";
import { TelegramRedeemModal } from "@/components/TelegramRedeemModal";
import { PlansModal } from "@/components/PlansModal";
import { BuyCreditsModal } from "@/components/ia-tipster/BuyCreditsModal";
import { isPreviewEnv } from "@/lib/previewEnv";

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
  const [telegramGroupUrl, setTelegramGroupUrl] = useState<string | null>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
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

  useEffect(() => {
    if (!userHouse?.id) return;
    supabase
      .from("betting_houses")
      .select("telegram_group_url")
      .eq("id", userHouse.id)
      .maybeSingle()
      .then(({ data }) => {
        setTelegramGroupUrl((data as any)?.telegram_group_url ?? null);
      });
  }, [userHouse?.id]);

  const isPaid = tier === "premium" || tier === "diamante";
  const isFree = tier === "free";

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
                    aria-label="Voltar"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <img src="/images/Copa/Logo/header-logo.png" alt="Premier FC" className="h-10 sm:h-12 w-auto" onClick={() => navigate("/")} style={{ cursor: "pointer", filter: "drop-shadow(0 0 10px rgba(224,179,65,0.5))" }} />
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
                    background: "rgba(234, 192, 100,0.10)",
                    border: "1px solid rgba(234, 192, 100,0.5)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#FFFFFF",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={14} style={{ color: "#eac064" }} />
                  Criar Odds
                </button>
              )}
              {tierLoaded && isFree && (
                <button
                  onClick={() => setShowTelegramModal(true)}
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
                  Resgatar Odd Grátis
                </button>
              )}
              {tierLoaded && isPaid && (
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    padding: "7px 14px",
                    background: "rgba(224,179,65,0.12)",
                    border: "1px solid rgba(224,179,65,0.5)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#E0B341",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Sparkles size={14} />
                  Planos
                </button>
              )}
              {isIATipsterRoute && (
                <button
                  onClick={() => setShowBuyCreditsModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full transition-all hover:scale-105"
                  style={{
                    padding: "7px 14px",
                    background: "#eac064",
                    border: "1px solid rgba(234, 192, 100,0.5)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#FFFFFF",
                    letterSpacing: "0.5px",
                    boxShadow: "0 0 14px rgba(234, 192, 100,0.3)",
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

      <TelegramRedeemModal
        open={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
        telegramUrl={telegramGroupUrl}
      />
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
