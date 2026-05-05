import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import type { PayCardData } from "@/hooks/usePayCards";
import { PRICES } from "@/lib/paywallRouting";
import { TelegramRedeemModal } from "@/components/TelegramRedeemModal";

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
    { label: "2 odds por dia", available: true },
    { label: "Entrega via Telegram", available: true },
    { label: "Odds Safes", available: false },
    { label: "Odds Pró", available: false },
    { label: "Mercados Secundários", available: false },
    { label: "Alavancagem", available: false },
    { label: "Múltiplas / Bingo", available: false },
    { label: "Ligas Americanas", available: false },
    { label: "Odds Ultra", available: false },
  ],
  premium: [
    { label: "+20 odds por dia", available: true },
    { label: "Entrega pelo app", available: true },
    { label: "Odds Safes", available: true },
    { label: "Odds Pró", available: true },
    { label: "Odds Ultra", available: true },
    { label: "Mercados Secundários", available: false },
    { label: "Alavancagem", available: false },
    { label: "Múltiplas / Bingo", available: false },
    { label: "Ligas Americanas", available: false },
  ],
  diamante: [
    { label: "+50 odds por dia", available: true },
    { label: "Entrega pelo app", available: true },
    { label: "Odds Safes", available: true },
    { label: "Odds Pró", available: true },
    { label: "Mercados Secundários", available: true },
    { label: "Alavancagem", available: true },
    { label: "Múltiplas / Bingo", available: true },
    { label: "Ligas Americanas", available: true },
    { label: "Odds Ultra", available: true },
  ],
};

const PLAN_META: Record<PlanKey, { title: string; color: string; price: string; suffix?: string; glow?: { border: string } }> = {
  free: { title: "Free", color: "#94A3B8", price: "Grátis" },
  premium: {
    title: "Premium",
    color: "#FACC15",
    price: `R$ ${PRICES.premium}`,
    suffix: "vitalício",
    glow: { border: "#FACC15" },
  },
  diamante: {
    title: "Diamante",
    color: "#A855F7",
    price: `R$ ${PRICES.diamante_upgrade}`,
    suffix: "vitalício",
    glow: { border: "#A855F7" },
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
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramGroupUrl, setTelegramGroupUrl] = useState<string | null>(null);

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
      if (houseId) {
        const { data: hd } = await supabase
          .from("betting_houses")
          .select("telegram_group_url")
          .eq("id", houseId)
          .maybeSingle();
        setTelegramGroupUrl((hd as any)?.telegram_group_url ?? null);
      }
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
    | { type: "button"; label: string; card: PayCardData | null }
    | { type: "telegram"; label: string };

  const getCta = (plan: PlanKey): CtaSpec => {
    if (plan === "free") {
      return { type: "telegram", label: "Grátis" };
    }
    if (plan === "premium") {
      if (isPremium) return { type: "current" };
      if (isDiamante) return { type: "info", label: "Incluso no Diamante" };
      return { type: "button", label: `Assinar por R$ ${PRICES.premium}`, card: premiumCard };
    }
    // diamante — sempre R$ 127, copy "Fazer Upgrade"
    if (isDiamante) return { type: "current" };
    if (isPremium) return { type: "button", label: `Fazer Upgrade R$ ${PRICES.diamante_upgrade}`, card: upgradeCard };
    return { type: "button", label: `Fazer Upgrade R$ ${PRICES.diamante_upgrade}`, card: diamanteCard };
  };

  const renderCard = (plan: PlanKey) => {
    const meta = PLAN_META[plan];
    const cta = getCta(plan);
    const isCurrent = cta.type === "current";

    const glow = meta.glow;
    const borderColor = isCurrent
      ? meta.color
      : glow
        ? glow.border
        : "rgba(255,255,255,0.08)";

    return (
      <div
        key={plan}
        className="flex-1 basis-0 flex flex-col rounded-xl p-2 md:p-4 min-w-0"
        style={{
          background: isCurrent ? `${meta.color}14` : "rgba(255,255,255,0.03)",
          border: `1px solid ${borderColor}`,
        }}
      >
        {/* Header */}
        <div className="text-center pb-3 mb-3 border-b border-white/10">
          <h3
            className="text-lg md:text-xl font-bold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: meta.color }}
          >
            {meta.title}
          </h3>
          <div className="mt-1 text-lg md:text-xl font-bold text-white leading-tight">{meta.price}</div>
          <div className="text-[9px] md:text-[10px] text-white/50 uppercase tracking-wide">
            {meta.suffix ?? "\u00A0"}
          </div>
        </div>

        {/* Bullets unificados */}
        <ul className="flex-1 space-y-2 mb-3">
          {BULLETS[plan].map((b, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1.5 text-[11px] md:text-xs"
            >
              {b.available ? (
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-400" strokeWidth={3} />
              ) : (
                <X className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/25" />
              )}
              <span
                className={
                  b.available
                    ? "text-white font-semibold"
                    : "text-white/30 line-through"
                }
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
              className="w-full py-2 rounded-lg text-[11px] md:text-xs font-bold opacity-80 cursor-not-allowed"
              style={{ background: `${meta.color}26`, color: meta.color, border: `1px solid ${meta.color}` }}
            >
              Plano atual
            </button>
          )}
          {cta.type === "info" && (
            <button
              disabled
              className="w-full py-2 rounded-lg text-[11px] md:text-xs font-bold opacity-60 cursor-not-allowed bg-white/5 text-white/50 border border-white/10"
            >
              {cta.label}
            </button>
          )}
          {cta.type === "button" && (
            <button
              disabled={!cta.card || loading}
              onClick={() => cta.card && setFunnel(cta.card)}
              className="w-full py-2 rounded-lg text-[11px] md:text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed leading-tight"
              style={{ background: meta.color, color: "#060D1E" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : cta.card ? (
                cta.label
              ) : (
                "Em breve"
              )}
            </button>
          )}
          {cta.type === "telegram" && (
            <button
              onClick={() => setShowTelegramModal(true)}
              className="w-full py-2 rounded-lg text-[11px] md:text-xs font-bold transition-all hover:scale-[1.01] leading-tight"
              style={{ background: meta.color, color: "#060D1E" }}
            >
              {cta.label}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#112236] border-[#00FF7F]/20 text-white w-[98vw] max-w-5xl p-3 md:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-white/10 z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h2
          className="text-2xl font-bold text-center mb-5"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Compare os planos
        </h2>

        <div className="flex flex-row gap-2 md:gap-3">
          {(["free", "premium", "diamante"] as PlanKey[]).map(renderCard)}
        </div>
      </DialogContent>
      <TelegramRedeemModal
        open={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
        telegramUrl={telegramGroupUrl}
      />
    </Dialog>
  );
}
