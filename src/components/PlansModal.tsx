import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import type { PayCardData } from "@/hooks/usePayCards";
import { PRICES } from "@/lib/paywallRouting";

interface Props {
  open: boolean;
  onClose: () => void;
}

type PlanKey = "free" | "premium" | "diamante";

// Lista unificada de 9 bullets por plano.
// Os 2 primeiros (Odds/dia + Entrega) são sempre disponíveis (variam apenas o texto).
// Os 7 seguintes são features booleanas — riscadas quando indisponíveis.
type Bullet = { label: string; available: boolean };

const BULLETS: Record<PlanKey, Bullet[]> = {
  free: [
    { label: "2 cuotas por día", available: true },
    { label: "Entrega vía Telegram", available: true },
    { label: "Cuotas Safes", available: false },
    { label: "Cuotas Pro", available: false },
    { label: "Mercados Secundarios", available: false },
    { label: "Apalancamiento", available: false },
    { label: "Múltiples / Bingo", available: false },
    { label: "Ligas Americanas", available: false },
    { label: "Cuotas Ultra", available: false },
  ],
  premium: [
    { label: "+20 cuotas por día", available: true },
    { label: "Entrega por la app", available: true },
    { label: "Cuotas Safes", available: true },
    { label: "Cuotas Pro", available: true },
    { label: "Cuotas Ultra", available: true },
    { label: "Mercados Secundarios", available: false },
    { label: "Apalancamiento", available: false },
    { label: "Múltiples / Bingo", available: false },
    { label: "Ligas Americanas", available: false },
  ],
  diamante: [
    { label: "+50 cuotas por día", available: true },
    { label: "Entrega por la app", available: true },
    { label: "Cuotas Safes", available: true },
    { label: "Cuotas Pro", available: true },
    { label: "Mercados Secundarios", available: true },
    { label: "Apalancamiento", available: true },
    { label: "Múltiples / Bingo", available: true },
    { label: "Ligas Americanas", available: true },
    { label: "Cuotas Ultra", available: true },
  ],
};

const PLAN_META: Record<PlanKey, { title: string; color: string; price: string; suffix?: string; glow?: { border: string } }> = {
  free: { title: "Gratis", color: "#c2c4cc", price: "Gratis" },
  premium: {
    title: "Premium",
    color: "#e9b949",
    price: `$${PRICES.premium}`,
    suffix: "vitalicio",
    glow: { border: "#e9b949" },
  },
  diamante: {
    title: "Diamante",
    color: "#96a0eb",
    price: `$${PRICES.diamante_upgrade}`,
    suffix: "vitalicio",
    glow: { border: "#96a0eb" },
  },
};

async function fetchPayCardByPlan(plan: string, houseId?: string | null): Promise<PayCardData | null> {
  if (houseId) {
    const { data } = await supabase
      .from("pay_cards" as any)
      .select("*")
      .eq("associated_plan", plan)
      .eq("betting_house_id", houseId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as any;
  }
  const { data } = await supabase
    .from("pay_cards" as any)
    .select("*")
    .eq("associated_plan", plan)
    .is("betting_house_id", null)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any) ?? null;
}

export function PlansModal({ open, onClose }: Props) {
  const { house } = useUserBettingHouse();
  const [tier, setTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [premiumCard, setPremiumCard] = useState<PayCardData | null>(null);
  const [diamanteCard, setDiamanteCard] = useState<PayCardData | null>(null);
  const [upgradeCard, setUpgradeCard] = useState<PayCardData | null>(null);
  const [funnel, setFunnel] = useState<PayCardData | null>(null);

  useEffect(() => {
    if (!open) return;
    const run = async () => {
      setLoading(true);
      const mu = mockGetUser();
      let userTier = "free";
      if (mu?.email) {
        const { data } = await supabase
          .from("users")
          .select("main_tier")
          .eq("email", mu.email.toLowerCase().trim())
          .maybeSingle();
        userTier = (data?.main_tier as string) || "free";
      }
      setTier(userTier);
      const houseId = house?.id ?? null;
      const [p, d, u] = await Promise.all([
        fetchPayCardByPlan("premium", houseId),
        fetchPayCardByPlan("diamante", houseId),
        fetchPayCardByPlan("diamante_upgrade", houseId),
      ]);
      setPremiumCard(p);
      setDiamanteCard(d);
      setUpgradeCard(u);
      setLoading(false);
    };
    run();
  }, [open, house?.id]);

  if (funnel) {
    return (
      <PayCardFunnelModal
        payCard={funnel}
        open={true}
        onClose={() => {
          setFunnel(null);
          onClose();
        }}
      />
    );
  }

  const isFree = tier === "free";
  const isPremium = tier === "premium";
  const isDiamante = tier === "diamante" || tier === "ultra";

  type CtaSpec =
    | { type: "current" }
    | { type: "info"; label: string }
    | { type: "button"; label: string; card: PayCardData | null };

  const getCta = (plan: PlanKey): CtaSpec => {
    if (plan === "free") {
      if (tier === "free") return { type: "current" };
      return { type: "info", label: "Plan Gratis" };
    }
    if (plan === "premium") {
      if (isPremium) return { type: "current" };
      if (isDiamante) return { type: "info", label: "Incluido en Diamante" };
      return { type: "button", label: `Suscribirse por $${PRICES.premium}`, card: premiumCard };
    }
    // diamante — sempre $127, copy "Mejorar Plan"
    if (isDiamante) return { type: "current" };
    if (isPremium) return { type: "button", label: `Mejorar Plan $${PRICES.diamante_upgrade}`, card: upgradeCard };
    return { type: "button", label: `Mejorar Plan $${PRICES.diamante_upgrade}`, card: diamanteCard };
  };

  const renderCard = (plan: PlanKey) => {
    const meta = PLAN_META[plan];
    const cta = getCta(plan);
    const isCurrent = cta.type === "current";

    // Fundo / borda / glow por plano, seguindo o design dourado-quase-preto.
    let cardBackground = "rgba(235,235,245,0.02)";
    let cardBorder = "1px solid rgba(235,235,245,0.1)";
    let cardShadow: string | undefined;

    if (plan === "premium") {
      cardBackground =
        "radial-gradient(120% 80% at 50% 0%, rgba(233,185,73,.1), rgba(233,185,73,0) 60%), rgba(235,235,245,.02)";
      cardBorder = "1px solid rgba(233,185,73,.5)";
    } else if (plan === "diamante") {
      cardBackground =
        "radial-gradient(130% 85% at 50% 0%, rgba(150,160,235,.26), rgba(150,160,235,.04) 62%), rgba(150,160,235,.03)";
      cardBorder = "1px solid rgba(150,160,235,.7)";
      cardShadow = "0 0 0 1px rgba(150,160,235,.25), 0 12px 34px -8px rgba(120,132,230,.55)";
    }

    if (isCurrent) {
      cardBackground = `${meta.color}14`;
      cardBorder = `1px solid ${meta.color}`;
    }

    // Cor do \u00EDcone de check: verde no Free, dourado/periwinkle nos pagos.
    const checkColor = plan === "free" ? "#6fb58c" : meta.color;

    return (
      <div
        key={plan}
        className="flex-1 basis-0 flex flex-col rounded-2xl p-2.5 md:p-3.5 min-w-0 relative"
        style={{
          background: cardBackground,
          border: cardBorder,
          boxShadow: cardShadow,
        }}
      >
        {/* Header */}
        <div className="text-center mb-3.5">
          <h3
            className="text-sm md:text-base font-extrabold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: meta.color, letterSpacing: "0.01em" }}
          >
            {meta.title}
          </h3>
          <div
            className="mt-1 text-lg md:text-xl font-extrabold leading-tight"
            style={{ color: "#ECEAE4" }}
          >
            {meta.price}
          </div>
          <div
            className="text-[8px] md:text-[9px] uppercase mt-0.5"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.14em",
              color: meta.suffix ? "#c9a56b" : "transparent",
              fontWeight: 600,
            }}
          >
            {meta.suffix ?? "\u00A0"}
          </div>
        </div>

        {/* Bullets unificados */}
        <ul className="flex-1 space-y-2 mb-3.5">
          {BULLETS[plan].map((b, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1.5 text-[11px] md:text-xs leading-tight"
            >
              {b.available ? (
                <Check
                  className="w-3 h-3 mt-px shrink-0"
                  strokeWidth={3}
                  style={{ color: checkColor }}
                />
              ) : (
                <X className="w-3 h-3 mt-px shrink-0" style={{ color: "#5c5e66" }} />
              )}
              <span
                style={{
                  color: b.available ? "#d4d6de" : "#6a6c74",
                  textDecoration: b.available ? "none" : "line-through",
                }}
              >
                {b.label}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto">
          {cta.type === "current" && (
            <button
              disabled
              className="w-full py-2.5 rounded-[10px] text-[11px] md:text-xs font-bold opacity-80 cursor-not-allowed"
              style={{
                background: `${meta.color}26`,
                color: meta.color,
                border: `1px solid ${meta.color}`,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Plan actual
            </button>
          )}
          {cta.type === "info" && (
            <button
              disabled
              className="w-full py-2.5 rounded-[10px] text-[11px] md:text-xs font-semibold cursor-not-allowed leading-tight"
              style={{
                background: "rgba(235,235,245,.03)",
                color: "#8a8c94",
                border: "1px solid rgba(235,235,245,.1)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {cta.label}
            </button>
          )}
          {cta.type === "button" && (
            <button
              disabled={!cta.card || loading}
              onClick={() => cta.card && setFunnel(cta.card)}
              className="w-full py-2.5 rounded-[10px] text-[11px] md:text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed leading-tight"
              style={{ background: meta.color, color: "#0a0b0e", fontFamily: "'DM Sans', sans-serif" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : cta.card ? (
                cta.label
              ) : (
                "Próximamente"
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="text-white w-[98vw] max-w-3xl p-4 md:p-6 rounded-3xl max-h-[90vh] overflow-y-auto [&>button]:hidden"
        style={{
          background: "linear-gradient(180deg, #14161c, #101116)",
          border: "1px solid rgba(235,235,245,.12)",
          boxShadow: "0 30px 70px -18px rgba(0,0,0,.75)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-[30px] h-[30px] rounded-full grid place-items-center z-10"
          style={{ background: "rgba(235,235,245,.06)" }}
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" style={{ color: "#9a9ca4" }} />
        </button>

        <h2
          className="text-xl font-extrabold text-center mb-5"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#ECEAE4", letterSpacing: "-0.01em" }}
        >
          Compara los planes
        </h2>

        <div className="flex flex-row gap-2 md:gap-2.5 items-stretch">
          {(["free", "premium", "diamante"] as PlanKey[]).map(renderCard)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
