import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import type { PayCardData } from "@/hooks/usePayCards";
import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import {
  type FeatureKey,
  type PaywallVariant,
  FEATURE_LABELS,
  PRICES,
  TELEGRAM_URL_PLACEHOLDER,
  variantToPlanKey,
  featureToBackredirectPlanKey,
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

export function PaywallPopup({ open, onClose, variant, feature }: Props) {
  const { house } = useUserBettingHouse();
  const [phase, setPhase] = useState<Phase>("main_step1");
  const [loadingPayCard, setLoadingPayCard] = useState(false);
  const [mainPayCard, setMainPayCard] = useState<PayCardData | null>(null);
  const [backPayCard, setBackPayCard] = useState<PayCardData | null>(null);
  const [funnelOpen, setFunnelOpen] = useState<PayCardData | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state on close
      setPhase("main_step1");
      setMainPayCard(null);
      setBackPayCard(null);
      setHasFetched(false);
      return;
    }
  }, [open]);

  // Fetch pay_cards when popup opens
  useEffect(() => {
    if (!open || hasFetched) return;
    if (variant === "telegram") { setHasFetched(true); return; }
    setHasFetched(true);
    const fetchAll = async () => {
      setLoadingPayCard(true);
      const mainKey = variantToPlanKey(variant);
      const backKey = featureToBackredirectPlanKey(feature);
      const fetchByPlan = async (plan: string): Promise<PayCardData | null> => {
        // try house-specific then generic
        if (house?.id) {
          const { data } = await supabase
            .from("pay_cards" as any)
            .select("*")
            .eq("associated_plan", plan)
            .eq("betting_house_id", house.id)
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
      };
      const [m, b] = await Promise.all([
        mainKey ? fetchByPlan(mainKey) : Promise.resolve(null),
        backKey ? fetchByPlan(backKey) : Promise.resolve(null),
      ]);
      setMainPayCard(m);
      setBackPayCard(b);
      setLoadingPayCard(false);
    };
    fetchAll();
  }, [open, variant, feature, house?.id, hasFetched]);

  if (!open) return null;

  // ===== TELEGRAM (simple, single step) =====
  if (variant === "telegram") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-[#112236] border-[#00FF7F]/30 text-white max-w-sm p-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Grupo Grátis no Telegram
            </h2>
            <p className="text-sm text-white/70">
              Entre no grupo free do Telegram e resgate a odd Free do dia
            </p>
            <Button
              className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold"
              onClick={() => {
                window.open(TELEGRAM_URL_PLACEHOLDER, "_blank", "noopener,noreferrer");
                onClose();
              }}
            >
              Entrar no grupo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ===== If funnel is open, render it instead =====
  if (funnelOpen) {
    return (
      <PayCardFunnelModal
        payCard={funnelOpen}
        open={true}
        onClose={() => {
          setFunnelOpen(null);
          onClose(); // close paywall too once funnel completes/closes
        }}
      />
    );
  }

  // ===== Backredirect logic on close =====
  const handleCloseAttempt = () => {
    if (phase === "backredirect") {
      onClose();
      return;
    }
    setPhase("backredirect");
  };

  // ===== BACKREDIRECT =====
  if (phase === "backredirect") {
    const featureLabel = feature !== "free" ? FEATURE_LABELS[feature] : "";
    const canBuy = !!backPayCard;
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-[#112236] border-[#00FF7F]/30 text-white max-w-sm p-6">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Espera!
            </h2>
            <p className="text-sm text-white/70">
              Você ainda pode liberar só essa categoria
            </p>
            <div className="py-4 px-3 rounded-lg bg-[#00FF7F]/10 border border-[#00FF7F]/40">
              <p className="text-xl font-bold text-[#00FF7F]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {featureLabel} por apenas R$ {PRICES.backredirect}
              </p>
            </div>
            <Button
              className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold text-base py-6"
              disabled={!canBuy || loadingPayCard}
              onClick={() => backPayCard && setFunnelOpen(backPayCard)}
            >
              {loadingPayCard
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : canBuy
                  ? `Comprar ${featureLabel}`
                  : "Em breve"}
            </Button>
            <button
              onClick={onClose}
              className="text-sm text-white/50 hover:text-white/80 underline"
            >
              Não, obrigado
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ===== MAIN PAYWALL (premium / diamante / diamante_upgrade) =====
  const isDiamante = variant === "diamante" || variant === "diamante_upgrade";
  const title = variant === "premium" ? "Plano Premium" : "Plano Diamante";
  const benefits = isDiamante ? DIAMANTE_BENEFITS : PREMIUM_BENEFITS;
  const price =
    variant === "premium" ? PRICES.premium
    : variant === "diamante" ? PRICES.diamante
    : PRICES.diamante_upgrade;
  const ctaLabel = `ASSINAR ${variant === "premium" ? "PREMIUM" : "DIAMANTE"} POR R$ ${price}`;
  const canBuy = !!mainPayCard;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCloseAttempt()}>
      <DialogContent className="bg-[#112236] border-[#00FF7F]/30 text-white max-w-sm p-6">
        <button
          onClick={handleCloseAttempt}
          className="absolute top-3 right-3 p-1 rounded hover:bg-white/10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {phase === "main_step1" && (
          <div className="space-y-5">
            <h2
              className="text-2xl font-bold text-center"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {title}
            </h2>
            <ul className="space-y-2.5">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#00FF7F] shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold"
              onClick={() => setPhase("main_step2")}
            >
              Continuar
            </Button>
          </div>
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
