import { Button } from "@/components/ui/button";
import { ImageIcon, ChevronRight, ArrowRight } from "lucide-react";
import {
  type FeatureKey,
  FEATURE_HEADLINES,
  FEATURE_EXPLANATIONS,
} from "@/lib/paywallRouting";
import alavancagemImg from "@/assets/popups/alavancagem.png";
import multiplasImg from "@/assets/popups/multiplas_bingo.png";
import mercadosImg from "@/assets/popups/mercados_secundarios.png";
import esportesImg from "@/assets/popups/esportes_americanos.png";
import oddsSafesImg from "@/assets/popups/plano_premium.webp";
import oddsProImg from "@/assets/popups/plano_premium.webp";
import oddsUltraImg from "@/assets/popups/plano_premium.webp";

interface Props {
  feature: FeatureKey;
  onContinue: () => void;
  /** Optional override image (e.g. plan hero for premium/diamante variants) */
  imageOverride?: string;
}

const FEATURE_IMAGES: Partial<Record<FeatureKey, string>> = {
  alavancagem: alavancagemImg,
  multiplas_bingo: multiplasImg,
  mercados_secundarios: mercadosImg,
  esportes_americanos: esportesImg,
  odds_safes: oddsSafesImg,
  odds_pro: oddsProImg,
  odds_ultra: oddsUltraImg,
};

/** Step 1 shared between `premium` and `diamante_upgrade` paywall variants */
export function PaywallEducationStep({ feature, onContinue, imageOverride }: Props) {
  const headline = feature !== "free" ? FEATURE_HEADLINES[feature] : "";
  const explanation = feature !== "free" ? FEATURE_EXPLANATIONS[feature] : "";
  const image = imageOverride ?? FEATURE_IMAGES[feature];

  return (
    <div className="space-y-4 text-center">
      <h2
        className="text-2xl sm:text-3xl font-bold leading-tight text-balance px-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {headline}
      </h2>
      {image ? (
        <div className="w-full rounded-lg overflow-hidden bg-black/40 mx-auto" style={{ maxWidth: "280px" }}>
          <img
            src={image}
            alt={headline}
            className="w-full h-auto block"
            style={{ aspectRatio: "1 / 1", objectFit: "contain" }}
          />
        </div>
      ) : (
        <div
          className="w-full rounded-lg border border-dashed border-white/30 bg-white/5 flex flex-col items-center justify-center text-white/40 mx-auto"
          style={{ aspectRatio: "1 / 1", maxWidth: "280px" }}
        >
          <ImageIcon className="w-10 h-10 mb-1" />
          <span className="text-xs">Imagem em breve</span>
        </div>
      )}
      <p className="text-sm text-white/70 leading-relaxed">{explanation}</p>
      {feature === "alavancagem" && <AlavancagemSchema />}
      <Button
        className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold"
        onClick={onContinue}
      >
        Entendi, tenho interesse <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function AlavancagemSchema() {
  const steps = [
    { label: "ETAPA 1", bet: "Aposta R$ 100", odd: "Odd 1.5x", win: "Ganha R$ 150" },
    { label: "ETAPA 2", bet: "Aposta R$ 150", odd: "Odd 1.5x", win: "Ganha R$ 225" },
    { label: "ETAPA 3", bet: "Aposta R$ 225", odd: "Odd 1.5x", win: "Ganha R$ 337" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-stretch justify-between gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-stretch flex-1 gap-1">
            <div
              className="flex-1 rounded-md p-2 text-center"
              style={{
                background: "rgba(0,255,127,0.06)",
                border: "1px solid rgba(0,255,127,0.25)",
              }}
            >
              <div className="text-[9px] font-bold tracking-wider text-[#00FF7F] mb-1">{s.label}</div>
              <div className="text-[10px] text-white leading-tight">{s.bet}</div>
              <div className="text-[10px] text-white/60 leading-tight">{s.odd}</div>
              <div className="text-[10px] font-bold text-[#00FF7F] leading-tight mt-0.5">{s.win}</div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center">
                <ArrowRight className="w-3 h-3 text-[#00FF7F]" />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/60 leading-snug text-center px-2">
        Cada acerto reinveste o ganho na próxima entrada, multiplicando o retorno final.
      </p>
    </div>
  );
}
