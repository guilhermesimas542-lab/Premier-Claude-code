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

const PREMIUM_FEATURES = ["Odds Safes", "Odds Pró", "Mercados Secundários"];
const DIAMANTE_FEATURES = [
  "Odds Safes",
  "Odds Pró",
  "Mercados Secundários",
  "Alavancagem",
  "Múltiplas / Bingo",
  "Esportes Americanos",
  "Odds Ultra",
];

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

  const isPremium = tier === "premium";
  const isDiamante = tier === "diamante" || tier === "ultra";

  const renderPlan = (
    title: string,
    price: number,
    features: string[],
    isCurrent: boolean,
    cta: { label: string; card: PayCardData | null } | null,
    accentColor: string,
  ) => {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: isCurrent ? `${accentColor}14` : "rgba(255,255,255,0.03)",
          border: `1px solid ${isCurrent ? accentColor : "rgba(255,255,255,0.08)"}`,
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: accentColor }}
          >
            {title}
          </h3>
          <div className="text-right">
            <div className="text-lg font-bold text-white">R$ {price}</div>
            <div className="text-[10px] text-white/50 uppercase tracking-wide">vitalício</div>
          </div>
        </div>

        <ul className="space-y-1">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-white/80">
              <Check className="w-3.5 h-3.5" style={{ color: accentColor }} />
              {f}
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <button
            disabled
            className="w-full py-2.5 rounded-lg text-sm font-bold opacity-70 cursor-not-allowed"
            style={{ background: `${accentColor}26`, color: accentColor, border: `1px solid ${accentColor}` }}
          >
            Plano atual
          </button>
        ) : cta ? (
          <button
            disabled={!cta.card || loading}
            onClick={() => cta.card && setFunnel(cta.card)}
            className="w-full py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: accentColor, color: "#060D1E" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : cta.card ? cta.label : "Em breve"}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#112236] border-[#00FF7F]/20 text-white max-w-md p-6 rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-white/10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h2
          className="text-2xl font-bold text-center mb-4"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Nossos planos
        </h2>

        <div className="space-y-3">
          {renderPlan(
            "Plano Premium",
            PRICES.premium,
            PREMIUM_FEATURES,
            isPremium,
            isDiamante ? null : { label: `Assinar por R$ ${PRICES.premium}`, card: premiumCard },
            "#60A5FA",
          )}
          {renderPlan(
            "Plano Diamante",
            PRICES.diamante,
            DIAMANTE_FEATURES,
            isDiamante,
            isDiamante
              ? null
              : isPremium
                ? { label: `Fazer upgrade por R$ ${PRICES.diamante_upgrade}`, card: upgradeCard }
                : { label: `Assinar por R$ ${PRICES.diamante}`, card: diamanteCard },
            "#A78BFA",
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
