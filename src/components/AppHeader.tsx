import { Sparkles, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import logoImg from "@/assets/premier-logo-custom.png";
import { useNavigate, useLocation } from "react-router-dom";
import { TelegramRedeemModal } from "@/components/TelegramRedeemModal";
import { PlansModal } from "@/components/PlansModal";

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
      <header className="sticky top-0 z-50" style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.07)', ...headerStyle }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {leftContent ? leftContent : (
              <div className="flex items-center gap-3 shrink-0">
                <img src={logoImg} alt="Premier Ultra" className="h-10 sm:h-12 w-auto" onClick={() => navigate("/")} style={{ cursor: "pointer", filter: "drop-shadow(0 0 10px rgba(0,255,0,0.5))" }} />
                {title && (
                  <span className="font-bold text-white text-sm">{title}</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3">
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
                  Planos
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
    </>
  );
};

export default AppHeader;
