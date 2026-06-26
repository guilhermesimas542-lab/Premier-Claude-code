import { LogOut, Headphones, X, Gift, Sparkles, ShoppingCart, Crown, Download, ArrowRight, ChevronRight, ScrollText } from "lucide-react";
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
import chatBg from "@/assets/chat-bg.png";

import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { useCards, useCardsBySlugs, CardData } from "@/hooks/useCards";
import { useUserAccess } from "@/hooks/useUserAccess";
import { CardType1Lateral } from "@/components/cards/CardType1Lateral";
import CardType2Top from "@/components/cards/CardType2Top";
import { OddsTicker } from "@/components/OddsTicker";
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
  const [showMarquee, setShowMarquee] = useState(true);
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
    // O flag de fluxo é uma "senha" de uso único: só é ligado pela rota
    // /onboarding (em Login). Consumimos (lê + apaga) já na 1ª chegada ao
    // Home, garantindo que o onboarding NUNCA re-dispare em acessos normais
    // (login direto / refresh) caso o lead não conclua o funil.
    const onbFlow = localStorage.getItem(LS_APP_ONBOARDING_FLOW) === "1";
    if (onbFlow) localStorage.removeItem(LS_APP_ONBOARDING_FLOW);
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
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
      .dc-mono { font-family: 'JetBrains Mono', monospace; }
      @keyframes dc-pulseDot { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
      @keyframes dc-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

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
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0 bg-navy-dark" style={{ background: "radial-gradient(130% 70% at 50% -15%, rgba(140,147,200,.06), rgba(140,147,200,0) 55%), linear-gradient(180deg, #0d0e12 0%, #0a0b0e 32%, #090a0d 100%)" }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none" style={{ background: "rgba(233,185,73,0.06)" }} />

      <AppHeader onShowLifetimeInfoModal={() => setShowLifetimeInfoModal(true)} />

      <main className="container max-w-md mx-auto px-4 pt-2 pb-24 relative z-10">
        {showMarquee && (
          <div style={{ position: "relative", display: "flex", alignItems: "center", height: 30, borderRadius: 10, background: "#111217", border: "1px solid rgba(233,185,73,0.18)", overflow: "hidden", marginBottom: 16 }}>
            <div style={{ display: "flex", whiteSpace: "nowrap", animation: "dc-marquee 20s linear infinite", willChange: "transform" }}>
              {[0,1].map((i) => (
                <span key={i} aria-hidden={i===1} style={{ display: "inline-flex", alignItems: "center", gap: 9, paddingRight: 18, fontSize: 11, fontWeight: 600, color: "#d7d9e0" }}>
                  <Download className="w-3.5 h-3.5" style={{ color: "#e9b949" }} />
                  <span style={{ fontWeight: 800, color: "#e9b949", letterSpacing: ".04em" }}>DESCARGA LA APP DE CL ULTRA</span>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.35)" }} />
                  <span>Directo en tu pantalla de inicio</span>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.35)" }} />
                  <span style={{ color: "#9a9ca4" }}>Android y iPhone</span>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.35)" }} />
                </span>
              ))}
            </div>
            <button onClick={() => setShowMarquee(false)} aria-label="Cerrar" style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", padding: "0 10px 0 16px", background: "linear-gradient(90deg, rgba(17,18,23,0), #111217 38%)", border: "none", cursor: "pointer" }}>
              <X className="w-4 h-4" style={{ color: "#9a9ca4" }} />
            </button>
          </div>
        )}

        <div onClick={() => { if (isLocked) { requestActivation(); return; } navigate("/sport/1"); }} style={{ border: "1px solid rgba(235,235,245,.08)", borderRadius: 18, overflow: "hidden", background: "radial-gradient(130% 170% at 50% -25%, rgba(47,124,73,.18), rgba(47,124,73,0) 55%), #101218", cursor: "pointer", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px 9px", borderBottom: "1px solid rgba(235,235,245,.06)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e5484d", animation: "dc-pulseDot 1.6s infinite" }} />
              <span className="dc-mono" style={{ fontSize: 10, fontWeight: 600, color: "#e5484d", letterSpacing: ".14em" }}>EN VIVO</span>
              <span className="dc-mono" style={{ fontSize: 9, color: "#6a6c74", letterSpacing: ".12em" }}>&middot; COPA DEL MUNDO</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#7d7c76", fontSize: 11, fontWeight: 600 }}>Ver an&aacute;lisis <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 23, height: 23, borderRadius: "50%", backgroundImage: "url('https://flagcdn.com/w80/br.png')", backgroundSize: "cover", backgroundPosition: "center" }} /><span style={{ fontSize: 14, fontWeight: 600, color: "#ECEAE4" }}>Brasil</span></div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><span style={{ fontWeight: 700, fontSize: 23, color: "#ECEAE4" }}>1 <span style={{ color: "#5c5e66", fontWeight: 400 }}>-</span> 0</span><span className="dc-mono" style={{ fontSize: 9, color: "#e5484d", fontWeight: 600 }}>78&#39;</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 600, color: "#ECEAE4" }}>Hait&iacute;</span><span style={{ width: 23, height: 23, borderRadius: "50%", backgroundImage: "url('https://flagcdn.com/w80/ht.png')", backgroundSize: "cover", backgroundPosition: "center" }} /></div>
          </div>
        </div>

        <div className="dc-mono" style={{ fontSize: 10, letterSpacing: ".22em", color: "#ECEAE4", marginBottom: 15 }}>FUNCIONALIDADES</div>

        <div style={{ border: "1px solid rgba(235,235,245,.08)", borderRadius: 24, background: "#111217", padding: "16px 20px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 18, left: 0, width: 3, height: 56, background: "#6fd18a", borderRadius: "0 3px 3px 0" }} />
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em", color: "#fff", marginBottom: 10, textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif" }}>Tips Disponibles</div>
          <div style={{ height: 1, background: "rgba(235,235,245,.07)", margin: "0 0 12px" }} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: "#ECEAE4", lineHeight: 1.08, textTransform: "uppercase" }}>Las mejores <span style={{ color: "#e9b949" }}>entradas</span> del d&iacute;a</div>
          <div style={{ fontSize: 13.5, color: "#9a9ca4", marginTop: 7, lineHeight: 1.45 }}>Tickets listos analizados por la inteligencia de CL Ultra.</div>
          <OddsTicker />
          <button onClick={() => { if (isLocked) { requestActivation(); return; } navigate("/sport/1"); }} style={{ width: "100%", border: "none", cursor: "pointer", padding: 14, borderRadius: 13, background: "#ECEAE4", color: "#15161a", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Ver Tips <ArrowRight className="w-4 h-4" /></button>
        </div>

        <div style={{ border: "1px solid rgba(235,235,245,.08)", borderRadius: 24, background: "#111217", padding: "16px 20px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 18, left: 0, width: 3, height: 56, background: "#8c93c8", borderRadius: "0 3px 3px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em", color: "#fff", textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif" }}>IA Tipster</span><span style={{ background: "rgba(233,185,73,0.15)", border: "1px solid rgba(233,185,73,0.3)", color: "#e9b949", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "1px", padding: "1px 8px", borderRadius: 6 }}>NUEVO</span></div>
          <div style={{ height: 1, background: "rgba(235,235,245,.07)", margin: "0 0 12px" }} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: "#ECEAE4", lineHeight: 1.08, textTransform: "uppercase" }}>Pregunta a la IA sobre <span style={{ color: "#e9b949" }}>cualquier partido</span></div>
          <div style={{ fontSize: 13.5, color: "#9a9ca4", marginTop: 7, lineHeight: 1.45 }}>Conversa con el chat de inteligencia artificial de CL Ultra.</div>
          <div style={{ margin: "18px 0", border: "1px solid rgba(235,235,245,.09)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#1a1c23", borderBottom: "1px solid rgba(235,235,245,.08)" }}><span style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(140,147,200,.16)", display: "grid", placeItems: "center" }}><Sparkles className="w-3 h-3" style={{ color: "#9aa0d8" }} /></span><span style={{ fontSize: 12.5, fontWeight: 600, color: "#ECEAE4" }}>Haz tu pregunta:</span></div>
            <div style={{ padding: "16px 14px", background: `linear-gradient(rgba(8,9,12,.62), rgba(8,9,12,.62)), url(${chatBg})`, backgroundSize: "auto, 300px", backgroundPosition: "center" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}><div style={{ background: "#3b4276", color: "#eceefb", fontSize: 11.5, padding: "9px 13px", borderRadius: "14px 14px 4px 14px", maxWidth: "82%" }}>&iquest;Francia x Espa&ntilde;a cu&aacute;l mejor cuota?</div></div>
              <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ background: "#1b1d24", border: "1px solid rgba(235,235,245,.08)", color: "#d4d6de", fontSize: 11.5, lineHeight: 1.5, padding: "9px 13px", borderRadius: "14px 14px 14px 4px", maxWidth: "88%" }}>Media alta de goles de ambos equipos. Entrada sugerida: <span style={{ color: "#7fc6a0", fontWeight: 600 }}>+2.5 goles pagando 3.7x.</span></div></div>
            </div>
          </div>
          <button onClick={() => { if (isLocked) { requestActivation(); return; } navigate("/ia-tipster"); }} style={{ width: "100%", border: "none", cursor: "pointer", padding: 14, borderRadius: 13, background: "#ECEAE4", color: "#15161a", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Abrir IA Tipster <ArrowRight className="w-4 h-4" /></button>
        </div>

        <div onClick={() => { if (isLocked) { requestActivation(); return; } navigate("/ultimos-greens"); }} style={{ display: "flex", alignItems: "center", gap: 13, border: "1px solid rgba(37,150,190,.3)", borderRadius: 16, background: "#0d1418", padding: "14px 16px", cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(37,150,190,.14)", display: "grid", placeItems: "center" }}><ScrollText className="w-5 h-5" style={{ color: "#2596be" }} /></span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#ECEAE4" }}>{ultimosGreensCard?.title || "Historial de Tips"}</div><div style={{ fontSize: 11.5, color: "#7f8c92", marginTop: 3 }}>Ve los tickets que ganaron</div></div>
          <ChevronRight className="w-4 h-4" style={{ color: "#2596be" }} />
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
