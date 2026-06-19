import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe2, ShieldCheck, Copy, Search, CheckCircle2, Sparkles, X } from "lucide-react";

interface TipHowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market?: string;
  betChoice?: string;
  odds?: number;
}

const TIER = "#10ff80";

export const TipHowItWorksModal = ({
  open,
  onOpenChange,
  market,
  betChoice,
  odds,
}: TipHowItWorksModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden border-0"
        style={{ background: "#060D1E", border: `1.5px solid ${TIER}33` }}
      >
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            width: 28, height: 28, borderRadius: 999,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <X className="w-4 h-4 text-white/80" />
        </button>

        <div style={{
          padding: "20px 20px 16px 20px",
          background: `linear-gradient(135deg, ${TIER}1A 0%, transparent 70%)`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <DialogHeader className="space-y-2">
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "3px 10px", borderRadius: 999,
              background: `${TIER}26`, border: `1px solid ${TIER}66`,
              alignSelf: "flex-start", width: "fit-content",
            }}>
              <Sparkles className="w-3 h-3" style={{ color: TIER }} />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 11, letterSpacing: "0.8px",
                color: TIER, textTransform: "uppercase",
              }}>
                Próximamente con 1 clic
              </span>
            </div>
            <DialogTitle style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800, fontSize: 22, color: "#FFFFFF", lineHeight: 1.15,
            }}>
              Cómo añadir tu tip al sportsbook
            </DialogTitle>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              color: "#94A3B8", lineHeight: 1.5, marginTop: 4,
            }}>
              Hoy tienes que copiar la apuesta manualmente en tu casa de apuestas.
              En la próxima actualización, podrás añadir el tip con <strong style={{ color: "#FFFFFF" }}>un solo clic</strong> — estamos terminando la integración con los sportsbooks de Chile.
            </p>
          </DialogHeader>
        </div>

        {(market || betChoice || typeof odds === "number") && (
          <div style={{ padding: "14px 20px 0 20px" }}>
            <div style={{
              background: "rgba(16,255,128,0.05)",
              border: `1px solid ${TIER}33`,
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                color: "#94A3B8", letterSpacing: "1px", textTransform: "uppercase",
              }}>
                Tu apuesta de hoy
              </span>
              {market && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8" }}>Mercado</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "#FFFFFF", textAlign: "right" as const }}>{market}</span>
                </div>
              )}
              {betChoice && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8" }}>Selección</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, color: "#FFFFFF", textAlign: "right" as const }}>{betChoice}</span>
                </div>
              )}
              {typeof odds === "number" && odds > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94A3B8" }}>Cuota</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: TIER }}>{odds.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: "16px 20px 4px 20px" }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800, fontSize: 13, color: "#FFFFFF",
            letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10,
          }}>
            Cómo hacerlo en 3 pasos
          </h3>

          <Step
            n={1}
            icon={<Copy className="w-4 h-4" style={{ color: TIER }} />}
            title="Anota el mercado y la cuota"
            desc="Mira el card del tip y memoriza (o copia) el mercado, la selección y la cuota."
          />
          <Step
            n={2}
            icon={<Search className="w-4 h-4" style={{ color: TIER }} />}
            title="Abre tu sportsbook y busca el partido"
            desc="Ingresa a la casa de apuestas que ya utilizas y encuentra el encuentro indicado."
          />
          <Step
            n={3}
            icon={<CheckCircle2 className="w-4 h-4" style={{ color: TIER }} />}
            title="Añade la apuesta en tu cupón"
            desc="Selecciona el mismo mercado y selección con cuota igual o superior a la indicada."
          />
        </div>

        <div style={{
          margin: "16px 20px 20px 20px",
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            borderRadius: 10, background: `${TIER}1A`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${TIER}33`,
          }}>
            <Globe2 className="w-5 h-5" style={{ color: TIER }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 14, color: "#FFFFFF",
              }}>
                Operación 100% en Brasil y Chile
              </span>
              <ShieldCheck className="w-4 h-4" style={{ color: TIER }} />
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              color: "#94A3B8", lineHeight: 1.5, margin: 0,
            }}>
              CL Score es una empresa con operación mundial, activa de forma plena
              en Brasil y Chile. Miles de leads ya usan nuestros tips a diario.
            </p>
          </div>
        </div>

        <div style={{ padding: "0 20px 20px 20px" }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              width: "100%", padding: "12px 0", border: "none",
              borderRadius: 10, background: TIER, color: "#000",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800, fontSize: 14, letterSpacing: "0.5px",
              textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Entendido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Step = ({ n, icon, title, desc }: { n: number; icon: React.ReactNode; title: string; desc: string }) => (
  <div style={{ display: "flex", gap: 10, padding: "8px 0", alignItems: "flex-start" }}>
    <div style={{
      width: 28, height: 28, flexShrink: 0,
      borderRadius: 999, background: `${TIER}1A`,
      border: `1px solid ${TIER}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
      fontSize: 13, color: TIER,
    }}>
      {n}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        {icon}
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800, fontSize: 13, color: "#FFFFFF",
        }}>
          {title}
        </span>
      </div>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
        color: "#94A3B8", lineHeight: 1.45, margin: 0,
      }}>
        {desc}
      </p>
    </div>
  </div>
);

export default TipHowItWorksModal;
