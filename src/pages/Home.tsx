import { LogOut, Headphones, X, Gift, Sparkles, ShoppingCart, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppHeader from "@/components/AppHeader";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isAuthenticated, clearAuth, getStoredConfig, getBackgroundImageUrl } from "@/lib/auth";
import { parseAudience, matchesAudienceCriteria } from "@/lib/audienceUtils";
import { supabase } from "@/integrations/supabase/client";
import type { PayCardData } from "@/hooks/usePayCards";
import { mockGetUser } from "@/mocks/user";
import { trackEvent } from "@/lib/events";
import BasicPlanModal from "@/components/BasicPlanModal";

import { BottomNav } from "@/components/BottomNav";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import logoImg from "@/assets/premier-logo-custom.png";

import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { useCards, useCardsBySlugs, CardData } from "@/hooks/useCards";
import { useUserAccess } from "@/hooks/useUserAccess";
import { CardType1Lateral } from "@/components/cards/CardType1Lateral";
import CardType2Top from "@/components/cards/CardType2Top";
import { CardFunnelModal } from "@/components/cards/CardFunnelModal";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import { PaywallPopup } from "@/components/PaywallPopup";
import { resolvePaywallVariant, type FeatureKey } from "@/lib/paywallRouting";
import { useLinks } from "@/contexts/LinksContext";
import { isPreviewEnv } from "@/lib/previewEnv";
import iaTipsterCartoon from "@/assets/ia-tipster-cartoon.png";
import robotFootball from "@/assets/robot-football.png";
import { IATipsterOnboardingModal } from "@/components/ia-tipster/IATipsterOnboardingModal";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { clearPersistedStep } from "@/components/onboarding/hooks/useOnboardingState";
import { startActivationGate } from "@/components/onboarding/startActivationGate";
import { useActivationLock } from "@/components/onboarding/ActivationGateProvider";
import { STEPS, FINAL_CTA_LABEL } from "@/data/steps";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Mesmo localStorage key usado em IATipster.tsx — mantém sincronizado o estado
// "lead já viu o anúncio da feature" entre Home e a página interna.
const LS_IA_ONBOARDING_SEEN = "ia_tipster_onboarding_seen_v2";

// Onboarding de 1º acesso (5 steps: tour → atalho → ativação no Telegram).
// Quem já tem essa flag (base antiga) NÃO revê — só novos leads passam pelo fluxo.
const LS_APP_ONBOARDING_SEEN = "app_onboarding_seen_v1";
// Flag ligada só pela rota isolada /onboarding (pós-compra).
const LS_APP_ONBOARDING_FLOW = "app_onboarding_flow_v1";

// LIGA/DESLIGA o onboarding pra TODOS os novos leads. Quando `true`, todo lead
// no 1º acesso passa pelo fluxo; `?test_onb=1` continua forçando em qualquer caso.
const ONBOARDING_LIVE = true;
const LS_ONBOARDING_TEST_MODE = "onb_test_mode";

// Deep-link do bot de ativação no Telegram (última etapa do onboarding).
// Mesmo bot CL usado em Obg.tsx (pós-checkout).
const ONBOARDING_TELEGRAM_URL =
  "https://t.me/Clscore_bot?start=6a16457d978ba54070095b90";

/** Primeiro nome (capitalizado) a partir do `full_name` do comprador. */
function firstNameFromFull(full?: string | null): string | undefined {
  const token = (full ?? "").trim().split(/\s+/)[0] ?? "";
  if (!token) return undefined;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

const CARD_TO_FEATURE: Record<string, FeatureKey> = {
  odds_altas: "multiplas_bingo",
  "odds-altas": "multiplas_bingo",
  alavancagem: "alavancagem",
};

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBasicModal, setShowBasicModal] = useState(false);
  const [showPromotionsModal, setShowPromotionsModal] = useState(false);
  // Anúncio da nova feature IA Tipster — aparece UMA VEZ pra todo lead
  // que entrar no app pela primeira vez após a release.
  const [showIaAnnouncement, setShowIaAnnouncement] = useState(false);
  const [showAppOnboarding, setShowAppOnboarding] = useState(false);
  // Primeiro nome do lead (do full_name salvo pelo webhook de pagamento). Usado
  // pra personalizar o onboarding ("Hola, [Nome]."). undefined → saudação neutra.
  const [leadFirstName, setLeadFirstName] = useState<string | undefined>(undefined);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);
  const [showLifetimeInfoModal, setShowLifetimeInfoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [funnelCard, setFunnelCard] = useState<CardData | null>(null);
  const [bannerPayCard, setBannerPayCard] = useState<PayCardData | null>(null);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);

  const mockUser = mockGetUser();
  const config = getStoredConfig();
  const { house: userHouse } = useUserBettingHouse();
  const { cards: availableEntries, loading: loadingEntries } = useCardsBySlugs(["futebol"]);
  const { cards: quickCards } = useCards("quick_access");
  const { cards: ultimosGreensCards } = useCardsBySlugs(["ultimos-greens"]);
  const ultimosGreensCard = ultimosGreensCards?.[0] || null;
  const access = useUserAccess();
  const { triggerPayCard, payCard: pcData, open: pcOpen, closePayCard } = usePayCardTrigger();
  const { links } = useLinks();
  const { subscribe: subscribeToPush } = usePushNotifications();
  const { isLocked, requestActivation } = useActivationLock();

  // Derive lifetime for info modal only
  const [isLifetime, setIsLifetime] = useState(false);
  const [telegramGroupUrl, setTelegramGroupUrl] = useState<string | null>(null);
  useEffect(() => {
    const checkEntitlements = async () => {
      if (!mockUser) return;
      const { data: userData } = await supabase.from("users").select("id, full_name").eq("email", mockUser.email.toLowerCase().trim()).maybeSingle();
      if (!userData?.id) return;
      setLeadFirstName(firstNameFromFull(userData.full_name));
      const { data: ents } = await supabase
        .from("entitlements")
        .select("product_key")
        .eq("user_id", userData.id)
        .eq("status", "active");
      const keys = (ents ?? []).map((e) => e.product_key);
      setIsLifetime(keys.includes("acesso_vitalicio"));
    };
    checkEntitlements();
  }, []);

  // Track app_open event once on mount
  useEffect(() => {
    trackEvent("app_open");
  }, []);

  useEffect(() => {
    if (mockUser?.email) {
      subscribeToPush(mockUser.dbId, mockUser.email);
    }
  }, [mockUser?.dbId, mockUser?.email, subscribeToPush]);


  useEffect(() => {
    console.log("DADOS BRUTOS RECEBIDOS DO BANCO:", JSON.stringify(availableEntries, null, 2));
  }, [availableEntries]);

  useEffect(() => {
    // Modo teste do onboarding: ?test_onb=1 persiste em localStorage pra
    // sobreviver ao redirect de login; ?test_onb=0 desliga.
    const testParam = new URLSearchParams(window.location.search).get("test_onb");
    if (testParam === "1") localStorage.setItem(LS_ONBOARDING_TEST_MODE, "1");
    if (testParam === "0") localStorage.removeItem(LS_ONBOARDING_TEST_MODE);

    if (!isAuthenticated()) { navigate("/login"); return; }
    setLoading(false);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('popup_shown_') || key === 'welcome_popup_shown') localStorage.removeItem(key);
    });
    // Onboarding de 5 steps abre só em 2 casos: modo teste (?test_onb=1) OU
    // fluxo isolado pós-compra (rota /onboarding, que liga a flag). O /login
    // normal NÃO liga a flag — leads recorrentes não veem o funil.
    const testOnb = localStorage.getItem(LS_ONBOARDING_TEST_MODE) === "1";
    const onbFlow = localStorage.getItem(LS_APP_ONBOARDING_FLOW) === "1";
    const firstAccess = localStorage.getItem(LS_APP_ONBOARDING_SEEN) !== "true";
    if (testOnb || (ONBOARDING_LIVE && onbFlow && firstAccess)) {
      setShowAppOnboarding(true);
      return;
    }
    // Anúncio IA Tipster: aparece 1x pra todo lead autenticado (só em preview).
    if (isPreviewEnv() && localStorage.getItem(LS_IA_ONBOARDING_SEEN) !== "true") {
      setShowIaAnnouncement(true);
    }
  }, [navigate]);

  const handleAppOnboardingComplete = () => {
    localStorage.setItem(LS_APP_ONBOARDING_SEEN, "true");
    localStorage.removeItem(LS_APP_ONBOARDING_FLOW);
    // Limpa o ponteiro do step persistido — próxima vez (se houver) começa
    // do 1, em vez de retomar no final.
    clearPersistedStep();
    // Arma a trava de 10min — popup "Cuenta en activación" aparece quando o
    // lead clicar em features gated (não trava o app inteiro).
    startActivationGate(ONBOARDING_TELEGRAM_URL);
    setShowAppOnboarding(false);
  };

  /** Conclusão do funil de onboarding (todos os 4 steps do modal vistos).
   *  Marca onboarding+tutorial como concluídos pra não exibir mais o tutorial
   *  da sidebar quando o lead chegar em /ia-tipster, e redireciona pra lá. */
  const handleIaOnboardingComplete = () => {
    localStorage.setItem(LS_IA_ONBOARDING_SEEN, "true");
    localStorage.setItem("ia_tipster_tutorial_completed_v2", "true");
    setShowIaAnnouncement(false);
    navigate("/ia-tipster");
  };

  const handleLogout = () => { clearAuth(); toast.success("Sesión cerrada"); navigate("/login"); };
  const handleSupport = () => { navigate("/support"); };
  const handlePromotions = () => { setShowPromotionsModal(true); };
  const handleBuyLifetime = () => { window.open(CHECKOUT_LINKS.inapp_premium, '_blank'); setShowLifetimeModal(false); };

  const hasAccess = (card: CardData): boolean => {
    if (!card.requires_access) return true;
    const criteria = parseAudience(card.access_field);
    if (criteria.length === 0) return true;
    const isBlocked = matchesAudienceCriteria(
      criteria,
      access.mainTier,
      access.isVitalicio,
      [
        ...(access.hasAlavancagem ? ["alavancagem"] : []),
        ...(access.hasMultiplasBingo ? ["multiplas_bingo"] : []),
        ...(access.hasLiveTelegram ? ["live_telegram"] : []),
      ],
    );
    return !isBlocked;
  };

  const handleOpenPayCardById = async (payCardId: string) => {
    const { data } = await supabase.from("pay_cards" as any).select("*").eq("id", payCardId).eq("is_active", true).maybeSingle();
    if (data) setBannerPayCard(data as any as PayCardData);
  };

  const handleCardAction = (card: CardData) => {
    if (isLocked) { requestActivation(); return; }
    if (card.requires_access && !hasAccess(card)) {
      const slug = (card.slug || "").toLowerCase();
      const feature = CARD_TO_FEATURE[slug];
      if (feature) {
        setPaywallFeature(feature);
        return;
      }
      if (card.pay_card_id) {
        handleOpenPayCardById(card.pay_card_id);
        return;
      }
      if ((card.questions && card.questions.length > 0) || card.checkout_url) {
        setFunnelCard(card);
      }
      return;
    }
    const s = (card.slug || "").toLowerCase();
    if (s === "futebol") { navigate("/sport/1"); return; }
    if (s === "odds_altas" || s === "odds-altas") {
      navigate("/sport/1?tab=multiplas_bingo&fallback=auto"); return;
    }
    if (s === "alavancagem") {
      navigate("/sport/1?tab=alavancagem&fallback=auto"); return;
    }
    if (s === "multiplas_bingo") { navigate("/odds-altas"); return; }
  };

  const renderCard = (card: CardData) => {
    const access = hasAccess(card);
    if (card.card_type === "type1_lateral") {
      return <CardType1Lateral key={card.id} card={card} hasAccess={access} onAction={() => handleCardAction(card)} />;
    }
    return (
      <CardType2Top key={card.id} card={card} hasAccess={access} onAction={() => handleCardAction(card)} />
    );
  };

  return (
    <>
    <style>{`
  @keyframes futebol-frame-pulse {
        0%, 100% {
      background-color: rgba(233,185,73, 0.4);
        }
        50% {
      background-color: rgba(233,185,73, 1);
        }
      }
      .futebol-glow-wrapper {
    animation: futebol-frame-pulse 0.9s ease-in-out infinite;
    border-radius: 20px;
    padding: 5px;
        display: block;
  }
  .futebol-glow-wrapper > * {
    border-radius: 15px;
    overflow: hidden;
      }

    `}</style>
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0 bg-navy-dark" style={{ backgroundColor: "#0a0f08" }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none" style={{ background: "rgba(233,185,73,0.06)" }} />

      <AppHeader onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)} />

      <main className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 relative z-10">

        {/* IA Tipster — Hero (somente preview/local até liberação em produção) */}
        {isPreviewEnv() && (
          <section className="space-y-3">
            <h2
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: '20px',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ✨ IA Tipster
            </h2>
            <button
              onClick={() => { if (isLocked) { requestActivation(); return; } navigate("/ia-tipster"); }}
              className="relative w-full overflow-hidden rounded-xl border flex hover:-translate-y-0.5 transition-all duration-200 text-left group"
              style={{
                background: "#112236",
                borderColor: 'rgba(233,185,73,0.55)',
                minHeight: '140px',
                boxShadow: '0 0 30px rgba(233,185,73,0.15)',
              }}
            >
              {/* Badge NUEVO */}
              <div className="absolute top-2 right-2 z-20 flex gap-1">
                <span style={{
                  background: 'rgba(233,185,73,0.15)',
                  border: '1px solid rgba(233,185,73,0.3)',
                  color: '#e9b949',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '1px',
                  padding: '2px 10px',
                  borderRadius: '6px',
                }}>
                  NUEVO
                </span>
              </div>

              {/* Cartoon IA Tipster — padrão lateral idêntico ao CardType1Lateral */}
              <div className="relative shrink-0 self-stretch" style={{ width: '120px', minHeight: '140px' }}>
                <img
                  src={iaTipsterCartoon}
                  alt="IA Tipster"
                  className="w-full h-full object-cover rounded-l-xl"
                />
                {/* Gradient fade pro conteúdo do card */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, transparent 55%, #112236 100%)" }} />
              </div>

              {/* Conteúdo direito */}
              <div className="flex-1 p-4 flex flex-col justify-center gap-2 pr-3">
                <h3 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: '20px',
                  color: '#FFFFFF',
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  paddingRight: '90px',
                }}>
                  Análisis de IA en tiempo real
                </h3>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: '12px',
                  color: '#94A3B8',
                  lineHeight: 1.3,
                }}>
                  Pregunta sobre cualquier partido o elige uno en vivo.
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); if (isLocked) { requestActivation(); return; } navigate("/ia-tipster"); }}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    background: '#e9b949',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800,
                    fontSize: '13px',
                    color: '#0a0f08',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                  }}
                >
                  PROBAR LA IA TIPSTER
                </button>
              </div>
            </button>
          </section>
        )}

        {/* Main Entry Cards */}
        <section className="space-y-4 sm:space-y-6">
          <h2
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '20px',
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Tips Disponibles
          </h2>
          <div className="space-y-3">
            {loadingEntries ? (
              <p className="px-1 text-sm text-muted-foreground">Cargando...</p>
            ) : availableEntries.length > 0 ? (
              availableEntries.map((card) => (
              card.slug?.toLowerCase() === "futebol" ? (
                  <div key={card.id} className="futebol-glow-wrapper">
                    <CardType1Lateral card={card} onAction={() => handleCardAction(card)} />
                  </div>
                ) : (
                  <CardType1Lateral key={card.id} card={card} onAction={() => handleCardAction(card)} />
                )
              ))
            ) : (
              <p className="px-1 text-sm text-muted-foreground">Ningún tip disponible en este momento.</p>
            )}
          </div>
        </section>

        {/* Quick Access */}
        {quickCards.length > 0 && (
          <section className="space-y-2.5">
            <h2
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: '18px',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              ⚡ Acceso Rápido
            </h2>
            <div className="flex flex-col gap-3">
              {quickCards.map(renderCard)}
            </div>
          </section>
        )}

        {/* Seção Últimos Bilhetes */}
        <div>
          {/* Título da seção */}
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: '18px',
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🎫 ÚLTIMOS TICKETS
          </h2>
          {/* Card no formato lateral — idêntico ao CardType1Lateral */}
          <div
            onClick={() => { if (isLocked) { requestActivation(); return; } navigate("/ultimos-greens"); }}
            style={{
              background: '#112236',
              border: '1.5px solid rgba(233,185,73,0.4)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'stretch',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* Imagem lateral esquerda — 100×120px igual ao CardType1Lateral */}
            <div style={{
              width: '100px',
              minWidth: '100px',
              minHeight: '120px',
              alignSelf: 'stretch',
              borderRadius: '10px 0 0 10px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #1a2a1a 0%, #0d1f0d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={robotFootball}
                alt="Últimos Greens"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {/* Conteúdo direito */}
            <div style={{
              flex: 1,
              padding: '12px 12px 12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}>
              {/* Badge GREENS no canto superior direito */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(233,185,73,0.15)',
                border: '1px solid rgba(233,185,73,0.3)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '11px',
                color: '#F0B429',
                letterSpacing: '1px',
              }}>
                🏆 GREENS
              </div>
              {/* Título e subtítulo */}
              <div style={{ paddingRight: '70px' }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: '18px',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                  marginBottom: '4px',
                }}>
                  {ultimosGreensCard?.title || 'Últimos Greens'}
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: '12px',
                  color: '#94A3B8',
                  lineHeight: 1.3,
                }}>
                  {ultimosGreensCard?.subtitle || 'Ve los tickets que ganaron'}
                </div>
              </div>
              {/* Botão VER HISTÓRICO */}
              <button
                onClick={(e) => { e.stopPropagation(); if (isLocked) { requestActivation(); return; } navigate("/ultimos-greens"); }}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '7px 0',
                  background: '#e9b949',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#0a0f08',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                }}
              >
                VER HISTORIAL
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="pt-6 text-center space-y-2" style={{ borderTop: "1px solid rgba(233,185,73,0.1)" }}>
            <p className="text-sm font-medium" style={{ color: "#FFFFFF" }}>Premier Ultra ©</p>
            <p className="text-xs" style={{ color: "#AAAAAA" }}>Análises processadas continuamente</p>
            <p className="text-[11px] pt-2" style={{ color: "#888888" }}>
              Datos protegidos • +18 • Juega con responsabilidad
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px]" style={{ color: "#AAAAAA" }}>
              <button onClick={() => setShowTermsModal(true)} className="transition-colors hover:underline" style={{ color: "#CCCCCC" }}>
                Términos y Privacidad
              </button>
              <span style={{ color: "#555555" }}>|</span>
              <a href={links.support_whatsapp_url || "https://wa.link/1p68qg"} target="_blank" rel="noopener noreferrer" className="transition-colors hover:underline" style={{ color: "#CCCCCC" }}>
                Soporte
              </a>
            </div>
          </div>
        </div>
      </footer>

      <BasicPlanModal open={showBasicModal} onClose={() => setShowBasicModal(false)} />

      {/* Funil de onboarding IA Tipster — modal 4 steps, 1x por lead. */}
      <IATipsterOnboardingModal
        open={showIaAnnouncement}
        onComplete={handleIaOnboardingComplete}
      />

      {/* Onboarding de 1º acesso — 5 steps; o último congela forçando a
          ativação no Telegram. `onComplete` marca como visto e libera o app. */}
      <OnboardingModal
        open={showAppOnboarding}
        steps={STEPS}
        user={{ firstName: leadFirstName, telegramUrl: ONBOARDING_TELEGRAM_URL }}
        finalLabel={FINAL_CTA_LABEL}
        onComplete={handleAppOnboardingComplete}
      />

      {/* Modal Promoções */}
      {showPromotionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPromotionsModal(false)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(233,185,73,0.25)", boxShadow: "0 0 40px rgba(233,185,73,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(233,185,73,0.15)" }}>
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(233,185,73,0.1)", border: "1px solid rgba(233,185,73,0.3)" }}>
                  <Gift className="w-5 h-5" style={{ color: "#e9b949" }} />
                </div>
                <div><h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Promociones de CL Ultra</h2></div>
              </div>
              <button onClick={() => setShowPromotionsModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(233,185,73,0.08)]">
                <X className="w-5 h-5" style={{ color: "#e9b949" }} />
              </button>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "rgba(233,185,73,0.08)", border: "1px solid rgba(233,185,73,0.2)" }}>
                <Sparkles className="w-8 h-8" style={{ color: "#e9b949" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#FFFFFF" }}>¡Próximamente!</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Bonos, condiciones especiales y liberaciones exclusivas para miembros de CL Ultra.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowPromotionsModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(233,185,73,0.08)", border: "1px solid rgba(233,185,73,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra Vitalício is now in AppHeader */}

      {/* Modal Info Vitalício */}
      {showLifetimeInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLifetimeInfoModal(false)}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(233,185,73,0.25)", boxShadow: "0 0 40px rgba(233,185,73,0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5" style={{ borderBottom: "1px solid rgba(233,185,73,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(233,185,73,0.1)", border: "1px solid rgba(233,185,73,0.3)" }}>
                  <Crown className="w-5 h-5" style={{ color: "#e9b949" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>¡Felicitaciones! 🎉</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>Miembro Vitalicio</p>
                </div>
              </div>
              <button onClick={() => setShowLifetimeInfoModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(233,185,73,0.08)]">
                <X className="w-5 h-5" style={{ color: "#e9b949" }} />
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
                Tú tem <span style={{ color: "#e9b949", fontWeight: 600 }}>acesso vitalício e ilimitado</span> a todas as funcionalidades e futuras atualizações do Premier Ultra. Aprovecha!
              </p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowLifetimeInfoModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(233,185,73,0.08)", border: "1px solid rgba(233,185,73,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}


      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto" style={{ background: "rgba(0,8,0,0.97)", border: "1px solid rgba(233,185,73,0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-5 sticky top-0 z-10" style={{ background: "rgba(0,8,0,0.97)", borderBottom: "1px solid rgba(233,185,73,0.15)" }}>
              <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>Términos de Uso & Privacidad</h2>
              <button onClick={() => setShowTermsModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-[rgba(233,185,73,0.08)]">
                <X className="w-5 h-5" style={{ color: "#e9b949" }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm leading-relaxed" style={{ color: "#CCCCCC" }}>
              <p>CL Ultra es una plataforma de análisis y predicción de resultados deportivos. Al utilizar nuestros servicios, aceptas los siguientes términos:</p>
              <p><strong style={{ color: "#FFFFFF" }}>1. Naturaleza del servicio:</strong> Entregamos análisis estadísticos y pronósticos basados en datos. No garantizamos resultados.</p>
              <p><strong style={{ color: "#FFFFFF" }}>2. Responsabilidad:</strong> El usuario es responsable de sus decisiones de apuestas. Juega con responsabilidad.</p>
              <p><strong style={{ color: "#FFFFFF" }}>3. Edad mínima:</strong> Debes tener 18 años o más para utilizar nuestros servicios.</p>
              <p><strong style={{ color: "#FFFFFF" }}>4. Privacidad:</strong> Tus datos están protegidos y se utilizan únicamente para mejorar tu experiencia en la plataforma.</p>
              <p><strong style={{ color: "#FFFFFF" }}>5. Reembolso:</strong> Política de reembolso según los términos del proveedor de pago.</p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setShowTermsModal(false)} className="w-full py-3 rounded-xl font-medium transition-colors" style={{ background: "rgba(233,185,73,0.08)", border: "1px solid rgba(233,185,73,0.3)", color: "#FFFFFF" }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}


      <BottomNav />

      {funnelCard && (
        <CardFunnelModal card={funnelCard} open={!!funnelCard} onClose={() => setFunnelCard(null)} />
      )}
      {/* PayCard modal now in AppHeader for header pills; keep for banner pay cards */}
      {bannerPayCard && (
        <PayCardFunnelModal payCard={bannerPayCard} open={!!bannerPayCard} onClose={() => setBannerPayCard(null)} />
      )}
      {paywallFeature && (
        <PaywallPopup
          open={paywallFeature !== null}
          onClose={() => setPaywallFeature(null)}
          variant={resolvePaywallVariant(paywallFeature, access.mainTier)}
          feature={paywallFeature}
        />
      )}
    </div>
    </>
  );
};

export default Home;
