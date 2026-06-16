import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mockLogin } from "@/mocks/user";
import { storeToken, trackEvent } from "@/lib/events";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { Crown, Loader2, ShoppingCart, Sparkles, Users, Ticket } from "lucide-react";
import { isPreviewEnv } from "@/lib/previewEnv";
import iaTipsterCartoon from "@/assets/ia-tipster-cartoon.png";
import logoImg from "@/assets/clscore-logo.png";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { useLinks } from "@/contexts/LinksContext";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import { getTierBadgeStyle } from "@/lib/tierColors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LastGreen {
  title: string;
  condition_to_win: string;
  odd: number;
  tier_required: string;
  addon_required: string | null;
  created_at: string;
}

function formatGreenDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return isYesterday ? `ayer · ${hours}:${minutes}` : `${date.getDate()}/${date.getMonth() + 1} · ${hours}:${minutes}`;
}

const useLastGreens = () => {
  const [greens, setGreens] = useState<LastGreen[]>([]);
  const [greenLabel, setGreenLabel] = useState("AYER");

  useEffect(() => {
    const fetchGreens = async () => {
      try {
        // Calcular hoje e ontem em Brasília
        const nowBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
        const yesterdayDate = new Date(nowBR + "T12:00:00");
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayBR = yesterdayDate.toISOString().split("T")[0];

        // Tentar hoje primeiro
        const { data: todayData } = await supabase
          .from("content_entries")
          .select("title, condition_to_win, odd, tier_required, addon_required, created_at")
          .eq("result", "green")
          .eq("date", nowBR)
          .order("odd", { ascending: false });

        if (todayData && todayData.length > 0) {
          setGreens(
            todayData.map((d) => ({
              title: d.title,
              condition_to_win: d.condition_to_win ?? "",
              odd: d.odd ?? 0,
              tier_required: d.tier_required ?? "",
              addon_required: d.addon_required ?? null,
              created_at: d.created_at,
            }))
          );
          setGreenLabel("HOY");
          return;
        }

        // Se não tem hoje, buscar ontem
        const { data: yesterdayData } = await supabase
          .from("content_entries")
          .select("title, condition_to_win, odd, tier_required, addon_required, created_at")
          .eq("result", "green")
          .eq("date", yesterdayBR)
          .order("odd", { ascending: false });

        if (yesterdayData && yesterdayData.length > 0) {
          setGreens(
            yesterdayData.map((d) => ({
              title: d.title,
              condition_to_win: d.condition_to_win ?? "",
              odd: d.odd ?? 0,
              tier_required: d.tier_required ?? "",
              addon_required: d.addon_required ?? null,
              created_at: d.created_at,
            }))
          );
          setGreenLabel("AYER");
        }
      } catch {
        // silently fail
      }
    };
    fetchGreens();
  }, []);

  return { greens, greenLabel };
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();
  const { subscribe } = usePushNotifications();
  const { triggerPayCard, payCard, open: payCardOpen, closePayCard } = usePayCardTrigger();
  const { links } = useLinks();
  const { greens, greenLabel } = useLastGreens();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Carrossel alternado: IA Tipster → Green → IA → Green ... (só em preview enquanto a
  // feature não tem launch oficial). Quando liberar em produção, remover esse gate.
  const showIaCard = isPreviewEnv();

  // Odds fake variadas — cada aparição do card IA exibe uma odd diferente,
  // dando ideia da variedade que a IA pode gerar (de safe a alavancagem).
  const IA_FAKE_ODDS = [35.40, 2.15, 12.50, 1.75, 8.30, 4.20, 1.55, 22.00];

  // Cor dourada de destaque
  const ACCENT_GOLD = "#10ff80";

  // Monta array unificado de slides com alternância IA + green.
  type Slide =
    | { type: "ia"; iaIndex: number }
    | { type: "green"; data: typeof greens[number] };
  const slides: Slide[] = (() => {
    if (!showIaCard) return greens.map((g) => ({ type: "green" as const, data: g }));
    if (greens.length === 0) return [{ type: "ia" as const, iaIndex: 0 }];
    const result: Slide[] = [];
    let iaIdx = 0;
    greens.forEach((g) => {
      result.push({ type: "ia", iaIndex: iaIdx++ });
      result.push({ type: "green", data: g });
    });
    return result;
  })();
  const totalSlides = slides.length;

  useEffect(() => {
    if (totalSlides <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 3000);
    return () => clearInterval(interval);
  }, [totalSlides]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    if (!email || !validateEmail(email)) {
      setEmailError("Por favor, ingresa un correo válido.");
      return;
    }
    setIsLoading(true);
    try {
      const { data: isAdminEmail } = await (supabase.rpc as any)("check_is_admin_email", {
        p_email: email.toLowerCase().trim(),
      });

      if (isAdminEmail) {
        navigate("/admin/verify", { state: { email: email.toLowerCase().trim() } });
      } else {
        let dbUser: { id?: string; main_tier?: string; betting_house_id?: string | null } = {};
        try {
          const { data: loginData, error: loginError } = await supabase.functions.invoke('auth-login', {
            body: { email: email.toLowerCase().trim() },
          });
          if (!loginError && loginData?.success && loginData?.user) {
            dbUser = {
              id: loginData.user.id,
              main_tier: loginData.user.main_tier,
            };
            if (loginData.token) {
              storeToken(loginData.token);
            }
            if (loginData.show_paywall_popup && loginData.checkout) {
              localStorage.setItem('premier_show_paywall', 'true');
              localStorage.setItem('premier_checkout_url', loginData.checkout);
            }
          }
        } catch (err) {
          console.warn('[Login] auth-login edge function failed, continuing with mock:', err);
        }

        mockLogin(email, dbUser.id, dbUser.main_tier);
        window.dispatchEvent(new CustomEvent('premier:login'));
        trackEvent("user_login");
        toast.success("¡Inicio de sesión exitoso!");
        navigate("/", { replace: true });

        try {
          if (dbUser.id) {
            subscribe(dbUser.id, email);
          }
        } catch {
          // Silently ignore push subscription errors
        }
      }
    } catch (err) {
      console.warn('[Login] outer catch, falling back to mock login:', err);
      mockLogin(email);
      window.dispatchEvent(new CustomEvent('premier:login'));
      toast.success("Login realizado con éxito!");
      navigate("/", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcquireAccess = async () => {
    // Try the dedicated login acquisition funnel first, then fallback to generic basic plan
    let found = await triggerPayCard('LOGIN_AQUISICAO');
    if (!found) found = await triggerPayCard('basic');
    if (!found) {
      const url = links.acquire_access_url || CHECKOUT_LINKS.funil_premium_full;
      window.open(url, "_blank");
    }
  };

  const isDisabled = !email.trim() || isLoading;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: "#0a1420" }}>
      {/* Shine dourado girando na borda das boxes de odd */}
      <style>{`
        @property --gold-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes gold-rotate { to { --gold-angle: 360deg; } }
        .gold-shine::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.5px;
          background: conic-gradient(
            from var(--gold-angle),
            rgba(16, 255, 128,0) 0deg,
            rgba(16, 255, 128,0) 230deg,
            rgba(245,215,122,0.9) 300deg,
            #FFF3C9 330deg,
            rgba(16, 255, 128,0) 360deg
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: gold-rotate 3.5s linear infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .gold-shine::before { animation: none; }
        }
      `}</style>
      {/* Light trail decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="light-trail-1 absolute rounded-full"
          style={{
            width: "600px",
            height: "200px",
            top: "-40px",
            left: "-100px",
            background: "radial-gradient(ellipse, hsl(155 100% 45% / 0.07) 0%, transparent 70%)",
          }}
        />
        <div
          className="light-trail-2 absolute rounded-full"
          style={{
            width: "500px",
            height: "180px",
            bottom: "100px",
            right: "-80px",
            background: "radial-gradient(ellipse, hsl(155 100% 45% / 0.05) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Content */}
      <main className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full max-w-md mx-auto" style={{ zIndex: 2 }}>
        {/* Logo — hero element */}
        <div className="mb-6 pointer-events-none w-full">
          <img
            src={logoImg}
            alt="CL Score"
            className="w-full max-w-[300px] h-auto mx-auto object-contain"
          />
        </div>

        {/* Last Greens Carousel + IA Tipster teaser */}
        {totalSlides > 0 && (
          <div className="w-full mb-8">
            {/* Container with overflow hidden for slide animation */}
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                  transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  willChange: 'transform',
                }}
              >
                {slides.map((slide, slideIndex) => {
                  // Slide do tipo IA Tipster
                  if (slide.type === "ia") {
                    const iaOdd = IA_FAKE_ODDS[slide.iaIndex % IA_FAKE_ODDS.length];
                    const iaReturn = Math.round(100 * iaOdd);
                    return (
                      <div key={`ia-${slideIndex}`} className="w-full shrink-0" style={{ minWidth: '100%' }}>
                        <div
                          className="gold-shine"
                          style={{
                            position: 'relative',
                            backgroundColor: '#112236',
                            border: '1.5px solid rgba(16, 255, 128,0.85)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 0 24px rgba(16, 255, 128,0.22)',
                          }}
                        >
                          {/* LINHA 1: badge IA esquerda | odd direita (mesma estrutura dos greens) */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '14px 16px 10px 16px',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'Barlow Condensed, sans-serif',
                                fontWeight: 900,
                                fontSize: '15px',
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(0,255,127,0.14)',
                                border: '1.5px solid rgba(0,255,127,0.55)',
                                color: '#00FF7F',
                                lineHeight: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <Sparkles size={13} />
                              IA Tipster
                            </span>
                            <span
                              style={{
                                fontFamily: 'Barlow Condensed, sans-serif',
                                fontWeight: 900,
                                fontSize: '36px',
                                color: '#00FF7F',
                                lineHeight: 1,
                              }}
                            >
                              {iaOdd.toFixed(2)}
                            </span>
                          </div>

                          {/* LINHA 2: título+sub esquerda | retorno direita (igual greens) */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0 16px 14px 16px',
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontFamily: 'Barlow Condensed, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '18px',
                                  color: '#ffffff',
                                  lineHeight: 1.2,
                                  margin: 0,
                                }}
                              >
                                Crea tus propias cuotas
                              </p>
                              <p
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontWeight: 400,
                                  fontSize: '13px',
                                  color: 'rgba(255,255,255,0.45)',
                                  marginTop: '2px',
                                  margin: 0,
                                }}
                              >
                                Análise de IA em segundos
                              </p>
                            </div>
                            <span
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontWeight: 400,
                                fontSize: '13px',
                                color: '#94A3B8',
                                whiteSpace: 'nowrap',
                                marginLeft: '12px',
                                flexShrink: 0,
                              }}
                            >
                              {`R$ 100 → R$ ${iaReturn.toLocaleString('pt-BR')}`}
                            </span>
                          </div>

                          {/* FAIXA INFERIOR */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '10px 16px',
                              backgroundColor: 'rgba(0,255,127,0.10)',
                              borderTop: '1px solid rgba(0,255,127,0.25)',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'Barlow Condensed, sans-serif',
                                fontWeight: 700,
                                fontSize: '13px',
                                color: '#00FF7F',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                              }}
                            >
                              ✨ Disponível dentro do app
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Slide do tipo green (bilhete batido)
                  const green = slide.data;
                  const index = slideIndex;
                  const color = getTierBadgeStyle(green.tier_required, green.addon_required);
                  return (
                    <div
                      key={index}
                      className="w-full shrink-0"
                      style={{ minWidth: '100%' }}
                    >
                      {/* Card */}
                      <div
                        style={{
                          backgroundColor: '#112236',
                          border: '1.5px solid rgba(16, 255, 128,0.45)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          boxShadow: '0 0 20px rgba(16, 255, 128,0.15)',
                        }}
                      >
                        {/* LINHA 1: badge esquerda | odd direita */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 16px 10px 16px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 900,
                              fontSize: '15px',
                              textTransform: 'uppercase',
                              letterSpacing: '1.5px',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              backgroundColor: color.bg,
                              border: `1.5px solid ${color.border}`,
                              color: color.text,
                              lineHeight: 1,
                            }}
                          >
                            {color.label}
                          </span>
                          <span
                            style={{
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 900,
                              fontSize: '36px',
                              color: '#10ff80',
                              lineHeight: 1,
                            }}
                          >
                            {Number(green.odd).toFixed(2)}
                          </span>
                        </div>
                        {/* LINHA 2: nome+dica esquerda | retorno direita */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 16px 14px 16px',
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontFamily: 'Barlow Condensed, sans-serif',
                                fontWeight: 700,
                                fontSize: '18px',
                                color: '#ffffff',
                                lineHeight: 1.2,
                                margin: 0,
                              }}
                            >
                              {green.title}
                            </p>
                            <p
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontWeight: 400,
                                fontSize: '13px',
                                color: 'rgba(255,255,255,0.45)',
                                marginTop: '2px',
                                margin: 0,
                              }}
                            >
                              {green.condition_to_win}
                            </p>
                          </div>
                          <span
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontWeight: 400,
                              fontSize: '13px',
                              color: '#94A3B8',
                              whiteSpace: 'nowrap',
                              marginLeft: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {`$100 → $${(100 * Number(green.odd)).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                          </span>
                        </div>
                        {/* FAIXA INFERIOR: ENTRADA BATEU */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 16px',
                            backgroundColor: 'rgba(16, 255, 128,0.08)',
                            borderTop: '1px solid rgba(16, 255, 128,0.15)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#10ff80',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}
                          >
                            ✓ TIP DE {greenLabel} GANÓ
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Dots indicator */}
            {totalSlides > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: index === currentIndex ? '20px' : '6px',
                      height: '6px',
                      backgroundColor: index === currentIndex ? '#10ff80' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full space-y-3 mb-6">
          <div className="flex flex-col gap-1.5">
            {/* Label */}
            <label
              htmlFor="email"
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: '11px',
                letterSpacing: '1.5px',
                color: '#10ff80',
                textTransform: 'uppercase',
              }}
            >
              CORREO
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              disabled={isLoading}
              className="w-full h-[52px] rounded-[10px] px-4 text-base font-sans bg-card text-foreground outline-none transition-colors duration-200 disabled:opacity-50 placeholder:text-white/50 focus:border-primary"
              style={{
                border: emailError
                  ? "1.5px solid hsl(var(--destructive))"
                  : "1.5px solid rgba(255,255,255,0.15)",
              }}
              onFocus={(e) => {
                if (!emailError) {
                  e.currentTarget.style.border = "1.5px solid hsl(155,100%,45%)";
                }
              }}
              onBlur={(e) => {
                if (!emailError) {
                  e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.15)";
                }
              }}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={isDisabled}
            style={{ background: "linear-gradient(180deg, #1AFF93 0%, #00C853 100%)", boxShadow: "0 6px 20px rgba(0,200,83,0.40)" }}
            className="w-full h-14 rounded-[10px] font-display font-extrabold text-base uppercase tracking-wide text-background transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Entrar a CL"
            )}
          </button>
        </form>

        {/* Secondary CTA */}
        <button
          onClick={handleAcquireAccess}
          className="w-full h-12 rounded-[10px] font-display font-bold text-sm uppercase flex items-center justify-center gap-2 transition-colors duration-200 active:scale-[0.98] text-white border-2 border-white/15 bg-transparent hover:border-white/30"
        >
          <ShoppingCart className="w-4 h-4" style={{ color: ACCENT_GOLD }} />
          Adquirir acesso
        </button>

        {/* Social Proof Pills */}
        <div className="w-full flex gap-2 items-stretch flex-nowrap mt-8 mb-6">
          <div className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-[#00FF7F]/30 rounded-xl px-3 py-3.5">
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "#00FF7F" }} />
            <span className="text-white/70 whitespace-nowrap font-sans" style={{ fontSize: '12px', fontWeight: 500 }}>+50.000 apostadores</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-[#00FF7F]/30 rounded-xl px-3 py-3.5">
            <Ticket className="w-3.5 h-3.5 shrink-0" style={{ color: "#00FF7F" }} />
            <span className="text-white/70 whitespace-nowrap font-sans" style={{ fontSize: '12px', fontWeight: 500 }}>+10 entradas por dia</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3">
          <p className="text-sm text-[#4A5568]">
            Al continuar, aceptas nuestros{" "}
            <button
              onClick={() => setShowTermsModal(true)}
              style={{ color: "#00FF7F" }}
              className="hover:underline underline-offset-2 transition-colors"
            >
              Términos y Privacidad
            </button>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-[#4A5568] hover:text-primary transition-colors"
            >
              Términos y Privacidad
            </button>
            <span className="text-[#4A5568]/40">|</span>
            <a
              href={links.support_whatsapp_url || "https://wa.link/1p68qg"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4A5568] hover:text-primary transition-colors"
            >
              Soporte
            </a>
          </div>
          <p className="text-xs text-[#4A5568]">+18 • Juega con responsabilidad.</p>
        </div>
      </main>

      {/* Terms Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-sm bg-card border border-white/[0.07]" style={{ backdropFilter: "blur(20px)" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold text-foreground">
              Términos y Privacidad
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="text-sm space-y-4 leading-relaxed text-muted-foreground">
              <p className="font-bold text-foreground">TÉRMINOS Y CONDICIONES DE USO — CL ULTRA</p>
              <p>Estos Términos y Condiciones ("Términos") regulan el acceso y uso de la aplicación y/o plataforma CL Ultra ("CL", "Aplicación", "Plataforma").</p>
              <p>Al acceder, registrarte o utilizar CL, declaras que has leído, comprendido y aceptado íntegramente estos Términos y nuestra Política de Privacidad.</p>

              <p className="font-bold text-foreground">1. Elegibilidad y Juego Responsable</p>
              <p>1.1. CL está destinado exclusivamente a mayores de 18 (dieciocho) años. Al utilizar la Plataforma, declaras ser mayor de edad y tener capacidad legal para contratar.</p>
              <p>1.2. CL apoya e incentiva el juego responsable. Las apuestas implican riesgo y pueden causar pérdidas financieras. Nunca apuestes valores que comprometan tu presupuesto y busca ayuda si percibes señales de compulsión.</p>
              <p>1.3. El usuario es el único responsable por decidir si va a apostar, cuánto va a apostar y por cualquier consecuencia derivada de las apuestas realizadas.</p>

              <p className="font-bold text-foreground">2. Qué es CL (y qué NO es)</p>
              <p>2.1. CL es una plataforma que entrega contenido informativo y/o sugerencias estadísticas ("tips", "análisis", "contenido") basadas en datos, modelos y criterios propios.</p>
              <p>2.2. CL no es: una casa de apuestas; una institución financiera; un gestor de inversiones; un intermediario de apuestas; un servicio de asesoría financiera individualizada.</p>
              <p>2.3. CL no realiza apuestas en nombre del usuario, no opera cuentas en casas de apuestas y no garantiza resultados, ganancias, retornos, greens ni ningún desempeño.</p>

              <p className="font-bold text-foreground">3. Ausencia de Vínculo con Casas de Apuestas</p>
              <p>3.1. CL no tiene control sobre sitios, aplicaciones, políticas, reglas, límites, cuotas, mercados, suspensiones, cambios de líneas, liquidaciones, cancelaciones ni cualquier otra decisión tomada por las casas de apuestas ("Operadores").</p>
              <p>3.2. CL no tiene responsabilidad por: saldo, bloqueos, restricciones, cierre de cuenta; divergencias de cuotas o cambios de mercado; fallas de pago, retiros, depósitos; problemas de autenticación, KYC, verificación de identidad; decisiones de liquidación, void, cashout, retraso, cancelación.</p>
              <p>3.3. Cuando exista mención a Operadores/socios, esto no constituye garantía ni implica responsabilidad solidaria de CL por actos de terceros.</p>

              <p className="font-bold text-foreground">4. Registro, Acceso y Seguridad</p>
              <p>4.1. El acceso a CL puede exigir registro por correo electrónico y/u otros medios. Te comprometes a entregar información verdadera y actualizada.</p>
              <p>4.2. Eres responsable de mantener la seguridad de tu acceso y de todas las actividades realizadas en tu cuenta.</p>
              <p>4.3. Podemos suspender, bloquear o cancelar accesos en caso de sospecha de fraude, uso indebido, violación de estos Términos o por exigencia legal.</p>

              <p className="font-bold text-foreground">5. Contenido, Actualizaciones y Disponibilidad</p>
              <p>5.1. El contenido puede ser modificado, corregido, actualizado, eliminado o reorganizado en cualquier momento, sin aviso previo.</p>
              <p>5.2. No garantizamos que el servicio esté disponible ininterrumpidamente. Pueden ocurrir inestabilidades por mantenimiento, fallas técnicas, actualizaciones o factores externos.</p>
              <p>5.3. CL puede incluir recursos de IA y automatizaciones. Estos recursos generan probabilidades y estimaciones, no certezas.</p>

              <p className="font-bold text-foreground">6. Pagos, Suscripciones, Reembolsos y Cancelación</p>
              <p>6.1. El acceso a ciertos recursos puede requerir pago (suscripción, plan, licencia o acceso vitalicio, según la oferta).</p>
              <p>6.2. Las condiciones comerciales (precio, duración, renovación, beneficios) son las informadas en el checkout y pueden variar.</p>
              <p>6.3. Si existe garantía legal aplicable (por ejemplo, derecho a retracto en compras online según corresponda), será respetada conforme a las reglas del medio de pago y de la legislación vigente.</p>
              <p>6.4. Las cancelaciones y reembolsos pueden estar sujetos a: validaciones antifraude; uso indebido; solicitudes duplicadas; chargeback; reglas del procesador de pagos.</p>

              <p className="font-bold text-foreground">7. Limitación de Responsabilidad (Cláusula de "Blindaje")</p>
              <p>7.1. Reconoces y aceptas que: las apuestas pueden generar pérdidas; las cuotas varían; los resultados son impredecibles; el contenido es informativo y no es una promesa de ganancia.</p>
              <p>7.2. En la máxima extensión permitida por la ley, CL y sus socios, administradores, colaboradores y aliados no serán responsables por daños directos, indirectos, incidentales, especiales, punitivos o consecuenciales, incluyendo: pérdidas financieras; lucro cesante; caída de saldo; pérdida de oportunidades; interrupción del servicio; decisiones del usuario en casas de apuestas.</p>
              <p>7.3. Si aún así existiera responsabilización judicial, la indemnización máxima queda limitada al monto pagado por el usuario a CL en los últimos 3 (tres) meses anteriores al evento, cuando corresponda, salvo prohibición legal.</p>

              <p className="font-bold text-foreground">8. Obligaciones del Usuario</p>
              <p>8.1. Te comprometes a: usar CL de forma lícita; no explotar fallas, vulnerar sistemas ni acceder a datos indebidos; no compartir tu acceso de forma irregular; no revender, redistribuir ni replicar el contenido; respetar los derechos de autor y la propiedad intelectual.</p>
              <p>8.2. Está prohibido: ingeniería inversa, scraping, bots, automatizaciones abusivas; copiar layout, textos, modelos, tips, base de datos; usar la marca CL sin autorización.</p>

              <p className="font-bold text-foreground">9. Propiedad Intelectual</p>
              <p>9.1. CL, sus marcas, layouts, textos, base de datos, modelos, algoritmos, métodos y materiales son de titularidad de la Empresa o licenciados a esta.</p>
              <p>9.2. El uso de la App no concede al usuario ninguna licencia más allá del derecho de uso personal, revocable, no exclusivo e intransferible.</p>

              <p className="font-bold text-foreground">10. Privacidad y Protección de Datos</p>
              <p>10.1. Tratamos los datos personales conforme a la legislación aplicable, incluyendo la Ley N° 19.628 sobre Protección de la Vida Privada.</p>
              <p>10.2. Los datos pueden ser tratados para: autenticación y seguridad; prevención de fraude; soporte; mejora del producto; obligaciones legales/regulatorias.</p>
              <p>10.3. Para más detalles, consulta la Política de Privacidad.</p>

              <p className="font-bold text-foreground">11. Medidas Antifraude y Compliance</p>
              <p>11.1. Podemos adoptar mecanismos de verificación, limitación de acceso, análisis de riesgo y bloqueo preventivo en caso de sospecha de fraude, cuentas múltiples, abuso de promociones, chargeback o violación de estos Términos.</p>
              <p>11.2. Podemos cooperar con autoridades, mediante orden legal, cuando sea necesario.</p>

              <p className="font-bold text-foreground">12. Suspensión y Término</p>
              <p>12.1. Podemos suspender o terminar el acceso del usuario en cualquier momento en caso de: violación de estos Términos; sospecha de fraude; uso indebido; exigencia legal.</p>
              <p>12.2. El usuario puede dejar de usar el servicio en cualquier momento, observando las reglas de cancelación y reembolso del plan contratado.</p>

              <p className="font-bold text-foreground">13. Modificaciones de los Términos</p>
              <p>13.1. Podemos modificar estos Términos en cualquier momento. La versión vigente será siempre la publicada en la Plataforma.</p>
              <p>13.2. El uso continuado después de una actualización significa la aceptación de los cambios.</p>

              <p className="font-bold text-foreground">14. Contacto y Soporte</p>
              <p>Dudas, solicitudes y soporte: equipepremierfc@gmail.com</p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-[10px] text-sm text-muted-foreground border border-white/[0.07] hover:text-foreground transition-colors"
            >
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {payCard && (
        <PayCardFunnelModal
          payCard={payCard}
          open={payCardOpen}
          onClose={closePayCard}
        />
      )}
    </div>
  );
};

export default Login;
