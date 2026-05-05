import { Button } from "@/components/ui/button";
import { ImageIcon, ChevronRight } from "lucide-react";
import {
  type FeatureKey,
  FEATURE_HEADLINES,
  FEATURE_EXPLANATIONS,
} from "@/lib/paywallRouting";
import alavancagemImg from "@/assets/popups/alavancagem.png";
import multiplasImg from "@/assets/popups/multiplas_bingo.png";
import mercadosImg from "@/assets/popups/mercados_secundarios.png";
import esportesImg from "@/assets/popups/esportes_americanos.png";

interface Props {
  feature: FeatureKey;
  onContinue: () => void;
}

const FEATURE_IMAGES: Partial<Record<FeatureKey, string>> = {
  alavancagem: alavancagemImg,
  multiplas_bingo: multiplasImg,
  mercados_secundarios: mercadosImg,
  esportes_americanos: esportesImg,
};

/** Step 1 shared between `premium` and `diamante_upgrade` paywall variants */
export function PaywallEducationStep({ feature, onContinue }: Props) {
  const headline = feature !== "free" ? FEATURE_HEADLINES[feature] : "";
  const explanation = feature !== "free" ? FEATURE_EXPLANATIONS[feature] : "";
  const image = FEATURE_IMAGES[feature];

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
      <Button
        className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold"
        onClick={onContinue}
      >
        Entendi, tenho interesse <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
