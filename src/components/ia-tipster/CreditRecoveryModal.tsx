import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Crown, Coins, Infinity as InfinityIcon, Loader2, Clock, ArrowLeft, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { ShirtIcon } from "@/components/ShirtIcon";

interface CreditProduct {
  id: string;
  product_name: string;
  product_type: "ai_credit_pack" | "ai_credit_unlimited";
  pricing: {
    price_brl?: number;
    credits_amount?: number;
    unlimited_days?: number;
  } | null;
  checkout_url: string | null;
}

interface UpcomingMatch {
  fixture_id: number;
  home: string;
  away: string;
  league: string;
  kickoff_at: string;
  kickoff_label: string;
}

interface MatchLogos {
  home: string | null;
  away: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "hook" | "plans";

/**
 * Countdown HH:MM:SS (mesma fórmula do PremiumBettingCard).
 */
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "AO VIVO";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Horário humanizado ("Hoje 21:30" / "Amanhã 18:00" / "28/05 21:30").
 */
function formatMatchTime(kickoffIso: string): string {
  try {
    const kickoff = new Date(kickoffIso);
    const now = new Date();
    const sameDay = kickoff.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = kickoff.toDateString() === tomorrow.toDateString();

    const time = kickoff.toLocaleString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    if (sameDay) return `Hoje ${time}`;
    if (isTomorrow) return `Amanhã ${time}`;

    const date = kickoff.toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    return `${date} ${time}`;
  } catch {
    return "—";
  }
}

/**
 * Modal de recuperação de créditos em DUAS ETAPAS (progressive disclosure):
 *   Etapa 1 ("hook"): headline emocional + card do siguiente jogo + 1 CTA grande
 *   Etapa 2 ("plans"): grid dos 4 produtos pra escolha real
 *
 * Quem clica em "Recargar" já está mentalmente comprometido — CTR na escolha sobe.
 */
export function CreditRecoveryModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("hook");
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [nextMatch, setNextMatch] = useState<UpcomingMatch | null>(null);
  const [matchLoading, setMatchLoading] = useState(true);
  const [logos, setLogos] = useState<MatchLogos>({ home: null, away: null });
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // Reset pra etapa 1 toda vez que abrir
  useEffect(() => {
    if (open) setStep("hook");
  }, [open]);

  // Fetch produtos + siguiente jogo (faz no open mesmo, pra estar pronto quando o user clicar)
  useEffect(() => {
    if (!open) return;

    setProductsLoading(true);
    supabase
      .from("products_catalog")
      .select("id, product_name, product_type, pricing, checkout_url")
      .in("product_type", ["ai_credit_pack", "ai_credit_unlimited"])
      .eq("active", true)
      .then(({ data }) => {
        const list = ((data ?? []) as any[]) as CreditProduct[];
        // Ordem CRO: ilimitados (maior LTV) primeiro, depois packs de crédito.
        // Dentro de cada grupo, por preço crescente.
        const sorted = [...list].sort((a, b) => {
          const aIsUnlimited = a.product_type === "ai_credit_unlimited" ? 0 : 1;
          const bIsUnlimited = b.product_type === "ai_credit_unlimited" ? 0 : 1;
          if (aIsUnlimited !== bIsUnlimited) return aIsUnlimited - bIsUnlimited;
          const priceA = a.pricing?.price_brl ?? 0;
          const priceB = b.pricing?.price_brl ?? 0;
          return priceA - priceB;
        });
        setProducts(sorted);
        setProductsLoading(false);
      });

    setMatchLoading(true);
    setLogos({ home: null, away: null });
    invokeWithAuth("ai-upcoming-suggestions", {})
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNextMatch(null);
          return;
        }
        const list = ((data as any)?.suggestions || []) as UpcomingMatch[];
        const match = list[0] ?? null;
        setNextMatch(match);

        if (match) {
          try {
            const { data: teamsData } = await supabase
              .from("teams")
              .select("name, logo_url")
              .in("name", [match.home, match.away]);
            const homeLogo = teamsData?.find((t: any) => t.name === match.home)?.logo_url ?? null;
            const awayLogo = teamsData?.find((t: any) => t.name === match.away)?.logo_url ?? null;
            setLogos({ home: homeLogo, away: awayLogo });
          } catch {
            // Fallback pra ShirtIcon
          }
        }
      })
      .catch(() => setNextMatch(null))
      .finally(() => setMatchLoading(false));
  }, [open]);

  // Tick do countdown
  useEffect(() => {
    if (!nextMatch) {
      setCountdown("");
      return;
    }
    const update = () => {
      const target = new Date(nextMatch.kickoff_at).getTime();
      const remaining = Math.floor((target - Date.now()) / 1000);
      setCountdown(formatCountdown(remaining));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  // Checkout aberto: substitui o modal
  if (checkoutUrl) {
    return (
      <EmbeddedCheckout
        open
        url={checkoutUrl}
        onClose={() => {
          setCheckoutUrl(null);
          onClose();
        }}
      />
    );
  }

  const isHighlighted = (p: CreditProduct) =>
    p.product_type === "ai_credit_unlimited" && p.pricing?.unlimited_days === 30;

  const matchAccent = "#10ff80";
  const matchGradient = "linear-gradient(135deg, rgba(16, 255, 128,0.08) 0%, transparent 60%)";

  // ============================================================
  // CARD DO PRÓXIMO JOGO (mesmo visual do PremiumBettingCard)
  // ============================================================
  const renderMatchCard = () => {
    if (matchLoading) {
      return (
        <div
          className="rounded-2xl flex items-center justify-center py-10"
          style={{
            background: "#060D1E",
            border: "1.5px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
          }}
        >
          <Loader2 className="w-6 h-6 animate-spin text-[#10ff80]" />
        </div>
      );
    }

    if (!nextMatch) return null;

    const isLive = countdown === "AO VIVO";

    return (
      <div
        className="select-none relative flex flex-col w-full"
        style={{
          background: `${matchGradient}, #060D1E`,
          border: `1.5px solid ${matchAccent}`,
          borderRadius: 16,
          boxShadow: `0 0 20px ${matchAccent}1A`,
          overflow: "hidden",
        }}
      >
        <div className="relative z-10 flex flex-col">
          {/* Linha 1: timer | badge | horário */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px 4px 12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, width: 90, flexShrink: 0 }}>
              {isLive ? (
                <>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#EF4444",
                      display: "inline-block",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#EF4444",
                    }}
                  >
                    AO VIVO
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" style={{ color: "#94A3B8" }} />
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#94A3B8",
                    }}
                  >
                    {countdown}
                  </span>
                </>
              )}
            </div>

            <div
              style={{
                background: `${matchAccent}26`,
                border: `1px solid ${matchAccent}66`,
                color: matchAccent,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: "1px",
                textTransform: "uppercase" as const,
                padding: "2px 10px",
                borderRadius: 6,
              }}
            >
              Siguiente
            </div>

            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: "#FFFFFF",
                width: 90,
                flexShrink: 0,
                textAlign: "right" as const,
              }}
            >
              {formatMatchTime(nextMatch.kickoff_at)}
            </span>
          </div>

          {/* Linha 2: escudos + nomes */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 14,
              padding: "8px 10px 10px 10px",
            }}
          >
            {/* Home */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, maxWidth: 110 }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {logos.home ? (
                  <img src={logos.home} alt={nextMatch.home} style={{ width: 48, height: 48, objectFit: "contain" }} />
                ) : (
                  <ShirtIcon variant="solid" primaryColor="#6B7280" size={50} />
                )}
              </div>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#FFFFFF",
                  textAlign: "center" as const,
                  maxWidth: 100,
                  lineHeight: 1.1,
                  marginTop: 2,
                }}
              >
                {nextMatch.home}
              </span>
            </div>

            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: "#94A3B8",
                marginTop: 22,
              }}
            >
              VS
            </span>

            {/* Away */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, maxWidth: 110 }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {logos.away ? (
                  <img src={logos.away} alt={nextMatch.away} style={{ width: 48, height: 48, objectFit: "contain" }} />
                ) : (
                  <ShirtIcon variant="solid" primaryColor="#6B7280" size={50} />
                )}
              </div>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#FFFFFF",
                  textAlign: "center" as const,
                  maxWidth: 100,
                  lineHeight: 1.1,
                  marginTop: 2,
                }}
              >
                {nextMatch.away}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "2px 12px 8px",
              textAlign: "center" as const,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              color: "#94A3B8",
              textTransform: "uppercase" as const,
              letterSpacing: "1px",
            }}
          >
            {nextMatch.league}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ETAPA 1: GANCHO (headline + match card + 1 CTA grande)
  // ============================================================
  const renderHookStep = () => (
    <div className="flex flex-col">
      {/* Headline */}
      <div className="text-center mb-4 pr-6">
        <h2
          className="text-2xl md:text-3xl font-bold leading-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Seus créditos <span style={{ color: "#EF4444" }}>acabaram!</span>
        </h2>
        <p className="text-sm text-white/70 mt-2 max-w-md mx-auto">
          {nextMatch ? (
            <>
              No te pierdas el siguiente partido. Ve el análisis de la IA antes del inicio.
            </>
          ) : (
            "Recarga para seguir accediendo a los análisis de la IA."
          )}
        </p>
      </div>

      {/* Card do siguiente jogo */}
      {nextMatch && <div className="mb-5">{renderMatchCard()}</div>}

      {/* CTA principal — único botão da etapa */}
      <button
        onClick={() => setStep("plans")}
        className="w-full py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.99] flex items-center justify-center gap-2"
        style={{
          background: "#10ff80",
          color: "#000000",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          border: "none",
          boxShadow: "0 0 30px rgba(16, 255, 128,0.3)",
        }}
      >
        <Zap className="w-5 h-5" />
        Recargar créditos
      </button>

      {/* Reforço sutil */}
      <p className="text-center text-[11px] text-white/50 mt-3">
        Acesso liberado em segundos · Pagamento seguro
      </p>
    </div>
  );

  // ============================================================
  // ETAPA 2: PLANOS (grid dos 4 produtos)
  // ============================================================
  const renderProductCard = (product: CreditProduct) => {
    const highlighted = isHighlighted(product);
    const price = product.pricing?.price_brl ?? 0;
    const credits = product.pricing?.credits_amount;
    const days = product.pricing?.unlimited_days;
    const isUnlimited = product.product_type === "ai_credit_unlimited";

    const detailLabel = credits
      ? `${credits} crédito${credits === 1 ? "" : "s"}`
      : days
        ? `${days} dias`
        : "";

    const subDetail = credits
      ? "Análises pontuais"
      : days === 30
        ? "Sem limite · 1 mês"
        : days === 90
          ? "Sem limite · 3 meses"
          : "";

    const accentColor = highlighted ? "#10ff80" : isUnlimited ? "#FACC15" : "#94A3B8";
    const borderColor = highlighted ? "#10ff80" : "rgba(255,255,255,0.10)";
    const disabled = !product.checkout_url;

    return (
      <div
        key={product.id}
        className="relative flex flex-col rounded-xl p-3 min-w-0"
        style={{
          background: highlighted ? "rgba(16, 255, 128,0.06)" : "rgba(255,255,255,0.03)",
          border: `${highlighted ? "2px" : "1px"} solid ${borderColor}`,
          boxShadow: highlighted ? "0 0 24px rgba(16, 255, 128,0.18)" : "none",
          transform: highlighted ? "scale(1.03)" : "none",
          zIndex: highlighted ? 1 : 0,
        }}
      >
        {highlighted && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap"
            style={{
              background: "#10ff80",
              color: "#000",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: "10px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              boxShadow: "0 0 12px rgba(16, 255, 128,0.5)",
            }}
          >
            <Crown className="w-3 h-3" />
            Mais Popular
          </div>
        )}

        <div className="text-center mb-2 mt-1">
          <div className="flex items-center justify-center gap-1 mb-1">
            {isUnlimited ? (
              <InfinityIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
            ) : (
              <Coins className="w-3.5 h-3.5" style={{ color: accentColor }} />
            )}
            <span
              className="text-[9px] uppercase tracking-wide"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                color: accentColor,
                letterSpacing: "1px",
              }}
            >
              {isUnlimited ? "Ilimitado" : "Pacote"}
            </span>
          </div>

          <h3
            className="text-sm md:text-base font-bold text-white leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {detailLabel}
          </h3>
          <p className="text-[10px] text-white/50 mt-0.5 leading-tight">{subDetail}</p>
        </div>

        <div className="text-center py-1.5 my-1 border-y border-white/10">
          <div
            className="text-lg md:text-xl font-bold leading-tight"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: highlighted ? "#10ff80" : "#FFFFFF",
            }}
          >
            R$ {price.toFixed(2).replace(".", ",")}
          </div>
        </div>

        <button
          onClick={() => product.checkout_url && setCheckoutUrl(product.checkout_url)}
          disabled={disabled || productsLoading}
          className="w-full py-2 rounded-lg text-[11px] font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed leading-tight mt-auto"
          style={{
            background: highlighted ? "#10ff80" : `${accentColor}20`,
            color: highlighted ? "#000" : accentColor,
            border: highlighted ? "none" : `1px solid ${accentColor}50`,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.5px",
          }}
        >
          {productsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : disabled ? (
            "EM BREVE"
          ) : highlighted ? (
            "QUERO ESSE"
          ) : (
            "ESCOLHER"
          )}
        </button>
      </div>
    );
  };

  const renderPlansStep = () => (
    <div className="flex flex-col">
      {/* Header da etapa 2 com voltar */}
      <div className="flex items-center gap-2 mb-4 pr-6">
        <button
          onClick={() => setStep("hook")}
          className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <h2
            className="text-xl md:text-2xl font-bold leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Escolha seu plano
          </h2>
          {nextMatch && (
            <p className="text-[11px] text-white/50 mt-0.5">
              Para analisar <span className="text-white/70 font-semibold">{nextMatch.home}</span> ×{" "}
              <span className="text-white/70 font-semibold">{nextMatch.away}</span> e os siguientes jogos
            </p>
          )}
        </div>
        <div className="w-7" /> {/* espaçador pra centralizar o título */}
      </div>

      {/* Grid de produtos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
        {productsLoading ? (
          <div className="col-span-2 md:col-span-4 flex justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin text-[#10ff80]" />
          </div>
        ) : products.length === 0 ? (
          <div className="col-span-2 md:col-span-4 text-center py-8 text-white/60 text-sm">
            Nenhum pacote disponível no momento.
          </div>
        ) : (
          products.map(renderProductCard)
        )}
      </div>

      <p className="text-center text-[10px] text-white/40 mt-4">
        Pagamento seguro · Acesso liberado em segundos
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#112236] border-[#10ff80]/30 text-white w-[98vw] max-w-3xl p-4 md:p-6 rounded-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white hover:bg-black hover:border-white/40 z-50 transition shadow-lg"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "hook" ? renderHookStep() : renderPlansStep()}
      </DialogContent>
    </Dialog>
  );
}
