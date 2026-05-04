import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import {
  type FeatureKey,
  FEATURE_HEADLINES,
  FEATURE_EXPLANATIONS,
} from "@/lib/paywallRouting";

interface Props {
  feature: FeatureKey;
  onContinue: () => void;
}

/** Step 1 shared between `premium` and `diamante_upgrade` paywall variants */
export function PaywallEducationStep({ feature, onContinue }: Props) {
  const headline = feature !== "free" ? FEATURE_HEADLINES[feature] : "";
  const explanation = feature !== "free" ? FEATURE_EXPLANATIONS[feature] : "";

  return (
    <div className="space-y-4 text-center">
      <h2
        className="text-2xl sm:text-3xl font-bold leading-tight text-balance px-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {headline}
      </h2>
      <div
        className="w-full rounded-lg border border-dashed border-white/30 bg-white/5 flex flex-col items-center justify-center text-white/40"
        style={{ aspectRatio: "5 / 3" }}
      >
        <ImageIcon className="w-10 h-10 mb-1" />
        <span className="text-xs">Imagem em breve</span>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{explanation}</p>
      <Button
        className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold"
        onClick={onContinue}
      >
        Continuar
      </Button>
    </div>
  );
}
