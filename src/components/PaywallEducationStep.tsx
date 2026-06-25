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
import oddsSafesImg from "@/assets/popups/odds_safe.png";
import oddsProImg from "@/assets/popups/odds_pro.png";
import oddsUltraImg from "@/assets/popups/odds_ultra.png";

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
          <span className="text-xs">Imagen próximamente</span>
        </div>
      )}
      <p className="text-sm text-white/70 leading-relaxed">{explanation}</p>
      {feature === "alavancagem" && <AlavancagemSchema />}
      {feature === "esportes_americanos" && <LigasChips />}
      {feature === "mercados_secundarios" && <MercadosChips />}
      <Button
        className="w-full bg-[#e9b949] hover:bg-[#e9b949]/90 text-black font-bold"
        onClick={onContinue}
      >
        Entendido, me interesa <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function AlavancagemSchema() {
  const steps = [
    { label: "ETAPA 1", bet: "Apuesta $ 100", odd: "Cuota 1.5x", win: "Gana $ 150" },
    { label: "ETAPA 2", bet: "Apuesta $ 150", odd: "Cuota 1.5x", win: "Gana $ 225" },
    { label: "ETAPA 3", bet: "Apuesta $ 225", odd: "Cuota 1.5x", win: "Gana $ 337" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-stretch justify-between gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-stretch flex-1 gap-1">
            <div
              className="flex-1 rounded-md p-2 text-center"
              style={{
                background: "rgba(233,185,73,0.06)",
                border: "1px solid rgba(233,185,73,0.25)",
              }}
            >
              <div className="text-[9px] font-bold tracking-wider text-[#e9b949] mb-1">{s.label}</div>
              <div className="text-[10px] text-white leading-tight">{s.bet}</div>
              <div className="text-[10px] text-white/60 leading-tight">{s.odd}</div>
              <div className="text-[10px] font-bold text-[#e9b949] leading-tight mt-0.5">{s.win}</div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center">
                <ArrowRight className="w-3 h-3 text-[#e9b949]" />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/60 leading-snug text-center px-2">
        Cada acierto reinvierte la ganancia en el siguiente tip, multiplicando el retorno final.
      </p>
    </div>
  );
}

/** Lâmina 2.3 — chips de ligas USA (estilo dourado mono do design) */
function LigasChips() {
  const ligas = ["NBA", "NFL", "MLB", "NHL"];
  return (
    <div className="flex gap-1.5">
      {ligas.map((l) => (
        <span
          key={l}
          className="flex-1 text-center font-mono text-[11px] font-semibold py-2"
          style={{
            color: "#e7c878",
            border: "1px solid rgba(214,177,95,.3)",
            background: "rgba(214,177,95,.07)",
            borderRadius: "9px",
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

/** Lâmina 2.3 — chips de mercados secundários (estilo verde-sálvia do design) */
function MercadosChips() {
  const mercados = ["Córners", "Tarjetas", "Hándicap", "Ambos marcan"];
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {mercados.map((m) => (
        <span
          key={m}
          className="text-[11px] font-semibold"
          style={{
            color: "#9ad8b4",
            border: "1px solid rgba(47,124,73,.32)",
            background: "rgba(47,124,73,.08)",
            borderRadius: "999px",
            padding: "6px 12px",
          }}
        >
          {m}
        </span>
      ))}
    </div>
  );
}
