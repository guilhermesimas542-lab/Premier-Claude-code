import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, Loader2, Check } from "lucide-react";
import { PaywallEducationStep } from "@/components/PaywallEducationStep";
import { supabase } from "@/integrations/supabase/client";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";
import { TelegramRedeemModal } from "@/components/TelegramRedeemModal";
import type { PayCardData } from "@/hooks/usePayCards";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { mockGetUser } from "@/mocks/user";
import {
  type FeatureKey,
  type PaywallVariant,
  FEATURE_LABELS,
  FEATURE_EXPLANATIONS,
  FEATURE_HEADLINES,
  PRICES,
  TELEGRAM_URL_PLACEHOLDER,
  variantToPlanKey,
  featureToBackredirectPlanKey,
  featureToDiscountPlanKey,
  DIAMANTE_ONLY_FEATURES,
} from "@/lib/paywallRouting";

interface Props {
  open: boolean;
  onClose: () => void;
  variant: PaywallVariant;
  /** Feature originally clicked — drives backredirect copy */
  feature: FeatureKey;
}

const PREMIUM_BENEFITS = [
  "Acesso a Odds Safes",
  "Acesso a Odds Pró",
  "Odds diárias liberadas",
  "Suporte via grupo",
];

const DIAMANTE_BENEFITS = [
  "Tudo do Premium",
  "Múltiplas / Bingo",
  "Mercados Secundários",
  "Esportes Americanos",
  "Alavancagem",
  "Suporte prioritário",
];

type Phase = "main_step1" | "main_step2" | "backredirect";

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

export function PaywallPopup({ open, onClose, variant, feature }: Props) {
  const { house } = useUserBettingHouse();
  const [phase, setPhase] = useState<Phase>("main_step1");
  const [loadingPayCard, setLoadingPayCard] = useState(false);
  const [mainPayCard, setMainPayCard] = useState<PayCardData | null>(null);
  const [backPayCard, setBackPayCard] = useState<PayCardData | null>(null);
  const [discountPayCard, setDiscountPayCard] = useState<PayCardData | null>(null);
  const [upgradePayCard, setUpgradePayCard] = useState<PayCardData | null>(null);
  const [discountUsed, setDiscountUsed] = useState<boolean>(true); // default safe = no discount
  const [funnelOpen, setFunnelOpen] = useState<PayCardData | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [telegramGroupUrl, setTelegramGroupUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!house?.id) return;
    supabase
      .from("betting_houses")
      .select("telegram_group_url")
      .eq("id", house.id)
      .maybeSingle()
      .then(({ data }) => {
        setTelegramGroupUrl((data as any)?.telegram_group_url ?? null);
      });
  }, [house?.id]);

  const isDiamanteUpgrade = variant === "diamante_upgrade";

  useEffect(() => {
    if (!open) {
      setPhase("main_step1");
      setMainPayCard(null);
      setBackPayCard(null);
      setDiscountPayCard(null);
      setUpgradePayCard(null);
      setHasFetched(false);
      return;
    }
  }, [open]);

  // Fetch pay_cards + user discount_used when popup opens
  useEffect(() => {
    if (!open || hasFetched) return;
    if (variant === "telegram") { setHasFetched(true); return; }
    setHasFetched(true);

    const fetchAll = async () => {
      setLoadingPayCard(true);
      const mainKey = variantToPlanKey(variant);
      const backKey = featureToBackredirectPlanKey(feature);
      const discountKey = featureToDiscountPlanKey(feature);
      const upgradeKey = "diamante_upgrade";
      const houseId = house?.id ?? null;

      // discount_used lookup (best-effort)
      let used = true;
      const mu = mockGetUser();
      if (mu?.email) {
        const { data: udata } = await supabase
          .from("users")
          .select("discount_used")
          .eq("email", mu.email.toLowerCase().trim())
          .maybeSingle();
        if (udata && (udata as any).discount_used === false) used = false;
      }
      setDiscountUsed(used);

      const [m, b, d, up] = await Promise.all([
        mainKey ? fetchPayCardByPlan(mainKey, houseId) : Promise.resolve(null),
        backKey ? fetchPayCardByPlan(backKey, houseId) : Promise.resolve(null),
        discountKey && !used ? fetchPayCardByPlan(discountKey, houseId) : Promise.resolve(null),
        isDiamanteUpgrade ? fetchPayCardByPlan(upgradeKey, houseId) : Promise.resolve(null),
      ]);
      setMainPayCard(m);
      setBackPayCard(b);
      setDiscountPayCard(d);
      setUpgradePayCard(up);
      setLoadingPayCard(false);
    };
    fetchAll();
  }, [open, variant, feature, house?.id, hasFetched, isDiamanteUpgrade]);

  if (!open) return null;

  // ===== TELEGRAM =====
  if (variant === "telegram") {
    return (
      <TelegramRedeemModal
        open={open}
        onClose={onClose}
        telegramUrl={telegramGroupUrl}
      />
    );
  }

  if (funnelOpen) {
    return (
      <PayCardFunnelModal
        payCard={funnelOpen}
        open={true}
        onClose={() => {
          setFunnelOpen(null);
          onClose();
        }}
      />
    );
  }

  // Mark discount_used = true and open discounted pay_card funnel
  const handleBuyDiscount = async () => {
    if (!discountPayCard) return;
    const mu = mockGetUser();
    if (mu?.email) {
      await supabase
        .from("users")
        .update({ discount_used: true } as any)
        .eq("email", mu.email.toLowerCase().trim());
    }
    setDiscountUsed(true);
    setFunnelOpen(discountPayCard);
  };

  const handleCloseAttempt = () => {
    if (phase === "backredirect") {
      onClose();
      return;
    }
    // Free → Premium: no backredirect/avulso offer, just close
    if (variant === "premium") {
      onClose();
      return;
    }
    setPhase("backredirect");
  };

  // ===== BACKREDIRECT =====
  if (phase === "backredirect") {
    const featureLabel = feature !== "free" ? FEATURE_LABELS[feature] : "";
    const showDiscount = !discountUsed && isDiamanteUpgrade;
    const canBuyDiscount = !!discountPayCard;
    const canBuyFull = !!backPayCard;

    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-[#112236] border-[#00FF7F]/30 text-white max-w-sm p-6">
          {showDiscount ? (
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-extrabold text-[#00FF7F]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Desconto de R$ 10
              </h2>
              <p className="text-base text-white">
                Desbloqueie só <strong>{featureLabel}</strong> por R$ {PRICES.backredirect_discount}
              </p>
              <p className="text-xs text-white/50">Oferta única, válida só agora</p>
              <Button
                className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold text-base py-6"
                disabled={!canBuyDiscount || loadingPayCard}
                onClick={handleBuyDiscount}
              >
                {loadingPayCard
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : canBuyDiscount
                    ? `Comprar ${featureLabel} por R$ ${PRICES.backredirect_discount}`
                    : "Em breve"}
              </Button>
              <button onClick={onClose} className="text-sm text-white/50 hover:text-white/80 underline">
                Não, obrigado
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Espera!
              </h2>
              <p className="text-sm text-white/70">Você ainda pode liberar só essa categoria</p>
              <div className="py-4 px-3 rounded-lg bg-[#00FF7F]/10 border border-[#00FF7F]/40">
                <p className="text-xl font-bold text-[#00FF7F]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {featureLabel} por apenas R$ {PRICES.backredirect}
                </p>
              </div>
              <Button
                className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold text-base py-6"
                disabled={!canBuyFull || loadingPayCard}
                onClick={() => backPayCard && setFunnelOpen(backPayCard)}
              >
                {loadingPayCard
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : canBuyFull ? `Comprar ${featureLabel}` : "Em breve"}
              </Button>
              <button onClick={onClose} className="text-sm text-white/50 hover:text-white/80 underline">
                Não, obrigado
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // ===== DIAMANTE UPGRADE (refactored) =====
  if (isDiamanteUpgrade) {
    const featureLabel = feature !== "free" ? FEATURE_LABELS[feature] : "";
    const explanation = feature !== "free" ? FEATURE_EXPLANATIONS[feature] : "";
    const headline = feature !== "free" ? FEATURE_HEADLINES[feature] : "";
    const canBuyAvulso = !!backPayCard;
    const canBuyUpgrade = !!upgradePayCard;

    // Other diamante features (excluding the one shown as principal)
    const otherFeatures = DIAMANTE_ONLY_FEATURES
      .filter((f) => f !== feature && f !== "free")
      .map((f) => FEATURE_LABELS[f as Exclude<FeatureKey, "free">])
      .join(" + ");

    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleCloseAttempt()}>
        <DialogContent className="bg-[#112236] border-[#00FF7F]/30 text-white w-[calc(100%-2rem)] max-w-sm p-5 sm:p-6 rounded-2xl">
          {phase === "main_step1" && (
            <PaywallEducationStep feature={feature} onContinue={() => setPhase("main_step2")} />
          )}

          {phase === "main_step2" && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col gap-2 items-stretch">
                {/* Card 1: Avulso */}
                <button
                  disabled={!canBuyAvulso || loadingPayCard}
                  onClick={() => backPayCard && setFunnelOpen(backPayCard)}
                  className="w-full text-left rounded-lg border border-[#00FF7F]/40 bg-[#00FF7F]/10 hover:bg-[#00FF7F]/15 transition px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: 70 }}
                >
                  <div className="font-bold text-white text-sm leading-snug break-words">
                    {canBuyAvulso
                      ? <>Desbloquear <span className="text-[#00FF7F]">{featureLabel}</span> por R$ {PRICES.backredirect}</>
                      : <>Desbloquear {featureLabel} — <span className="text-white/60">Em breve</span></>}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5 leading-tight">Pagamento único, acesso vitalício</div>
                </button>

                {/* Card 2: Upgrade Diamante */}
                <button
                  disabled={!canBuyUpgrade || loadingPayCard}
                  onClick={() => upgradePayCard && setFunnelOpen(upgradePayCard)}
                  className="w-full text-left rounded-lg border border-[#00FF7F]/60 bg-gradient-to-r from-[#00FF7F]/15 to-[#00FF7F]/5 hover:from-[#00FF7F]/25 transition px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: 70 }}
                >
                  <div className="font-bold text-white text-sm leading-snug break-words">
                    {canBuyUpgrade
                      ? <><span className="text-[#00FF7F]">Plano Diamante</span> (todos os mercados liberados — R$ {PRICES.diamante_upgrade})</>
                      : <>Upgrade Diamante — <span className="text-white/60">Em breve</span></>}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5 leading-tight break-words">Desbloqueia {otherFeatures}</div>
                </button>
              </div>

              <button
                onClick={() => setPhase("main_step1")}
                className="flex items-center justify-center gap-1 w-full text-xs text-white/50 hover:text-white pt-1"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // ===== MAIN PAYWALL (premium / diamante) — UNCHANGED =====
  const isDiamante = variant === "diamante";
  const title = variant === "premium" ? "Plano Premium" : "Plano Diamante";
  const benefits = isDiamante ? DIAMANTE_BENEFITS : PREMIUM_BENEFITS;
  const price = variant === "premium" ? PRICES.premium : PRICES.diamante;
  const ctaLabel = `ASSINAR ${variant === "premium" ? "PREMIUM" : "DIAMANTE"} POR R$ ${price}`;
  const canBuy = !!mainPayCard;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCloseAttempt()}>
      <DialogContent className="bg-[#112236] border-[#00FF7F]/30 text-white max-w-sm p-6">
        {phase === "main_step1" && (
          <PaywallEducationStep feature={feature} onContinue={() => setPhase("main_step2")} />
        )}

        {phase === "main_step2" && (
          <div className="space-y-5">
            <h2
              className="text-2xl font-extrabold text-center text-[#00FF7F] leading-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {ctaLabel}
            </h2>
            <Button
              className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold text-lg py-6"
              disabled={!canBuy || loadingPayCard}
              onClick={() => mainPayCard && setFunnelOpen(mainPayCard)}
            >
              {loadingPayCard
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : canBuy ? "Assinar agora" : "Em breve"}
            </Button>
            <button
              onClick={() => setPhase("main_step1")}
              className="flex items-center justify-center gap-1 w-full text-sm text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
