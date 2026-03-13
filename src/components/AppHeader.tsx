import { Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import logoImg from "@/assets/premier-logo-custom.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface AppHeaderProps {
  onShowLifetimeInfoModal?: () => void;
  leftContent?: React.ReactNode;
  headerStyle?: React.CSSProperties;
}

const AppHeader = ({ onShowLifetimeInfoModal, leftContent, headerStyle }: AppHeaderProps) => {
  const mockUser = mockGetUser();
  const { house: userHouse } = useUserBettingHouse();
  const { triggerPayCard, payCard: pcData, open: pcOpen, closePayCard } = usePayCardTrigger();

  const [isLifetime, setIsLifetime] = useState(false);
  const [isTelegramMember, setIsTelegramMember] = useState(false);
  const [telegramGroupUrl, setTelegramGroupUrl] = useState<string | null>(null);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);

  useEffect(() => {
    const checkEntitlements = async () => {
      if (!mockUser) return;
      const { data: userData } = await supabase.from("users").select("id").eq("email", mockUser.email.toLowerCase().trim()).maybeSingle();
      if (!userData?.id) return;
      const { data: ents } = await supabase
        .from("entitlements")
        .select("product_key")
        .eq("user_id", userData.id)
        .eq("status", "active");
      const keys = (ents ?? []).map((e) => e.product_key);
      setIsLifetime(keys.includes("acesso_vitalicio"));
      setIsTelegramMember(keys.includes("live_telegram"));
    };
    checkEntitlements();
  }, []);

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

  const handleBuyLifetime = () => {
    window.open(CHECKOUT_LINKS.vitalicio, '_blank');
    setShowLifetimeModal(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.07)', ...headerStyle }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo or custom left content */}
            {leftContent ? leftContent : (
              <div className="shrink-0">
                <img src={logoImg} alt="Premier Ultra" className="h-10 sm:h-12 w-auto" style={{ filter: "drop-shadow(0 0 10px rgba(0,255,0,0.5))" }} />
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live Telegram pill */}
              {isTelegramMember ? (
                <a
                  href={telegramGroupUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full cursor-pointer transition-all hover:scale-105"
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0,255,127,0.1)',
                    border: '1px solid rgba(0,255,127,0.4)',
                    borderRadius: '999px',
                    boxShadow: '0 0 10px rgba(0,255,127,0.2)',
                    animation: 'telegramPulse 2s ease-in-out infinite',
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: "#FFFFFF" }}>
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L9.1 13.617l-2.97-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                  </svg>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#FFFFFF',
                    letterSpacing: '1px',
                  }}>
                    CANAL
                  </span>
                </a>
              ) : (
                <button
                  onClick={async () => { await triggerPayCard('live_telegram'); }}
                  className="flex items-center gap-1.5 rounded-full animate-pulse cursor-pointer"
                  style={{
                    padding: "6px 12px",
                    background: "rgba(255,0,0,0.1)",
                    border: "1.5px solid rgba(255,0,0,0.4)",
                    borderRadius: "999px",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#FF4444",
                    letterSpacing: "0.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🛒 LIVE
                </button>
              )}

              {/* Vitalício pill */}
              {isLifetime ? (
                <div
                  onClick={() => onShowLifetimeInfoModal?.()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'rgba(0,255,127,0.1)',
                    border: '1px solid rgba(0,255,127,0.4)',
                    borderRadius: '999px',
                    boxShadow: '0 0 10px rgba(0,255,127,0.2)',
                    cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#FFFFFF',
                    letterSpacing: '0.5px',
                    transition: 'transform 0.2s',
                  }}
                >
                  <Crown size={14} color="#FFFFFF" />
                  VITALÍCIO
                </div>
              ) : (
                <button
                  onClick={async () => { const found = await triggerPayCard('vitalicio'); if (!found) setShowLifetimeModal(true); }}
                  className="flex items-center gap-1.5 rounded-full animate-pulse cursor-pointer"
                  style={{
                    padding: "6px 12px",
                    background: "rgba(255,0,0,0.1)",
                    border: "1.5px solid rgba(255,0,0,0.4)",
                    borderRadius: "999px",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#FF4444",
                    letterSpacing: "0.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  👑 VITALÍCIO
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Lifetime purchase modal */}
      <Dialog open={showLifetimeModal} onOpenChange={setShowLifetimeModal}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl border-0 p-6" style={{ background: "#0D1929", border: "1px solid rgba(0,255,127,0.2)" }}>
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold" style={{ color: "#FFFFFF" }}>
              Acesso Vitalício
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: "#AAAAAA" }}>Garanta acesso permanente a todos os recursos Premium.</p>
            <button
              onClick={handleBuyLifetime}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: "#00FF7F", color: "#060D1E" }}
            >
              ADQUIRIR AGORA
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PayCard funnel modal */}
      {pcData && (
        <PayCardFunnelModal
          open={pcOpen}
          onClose={closePayCard}
          payCard={pcData}
        />
      )}
    </>
  );
};

export default AppHeader;
