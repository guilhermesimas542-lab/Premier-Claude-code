import { FileText, TrendingUp, Target, ChevronRight, Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useFunnelPopup } from "@/context/FunnelPopupContext";

interface QuickCard {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: React.ReactNode;
  /** If set, this addon is required to freely access this card */
  addonKey?: string;
  /** Funnel popup type to show when locked */
  popupType?: string;
}

const cards: QuickCard[] = [
  {
    id: "multiplas-bingo",
    title: "Múltiples / Bingo",
    subtitle: "Combinaciones y tickets",
    route: "/odds-altas",
    icon: <Target className="w-5 h-5" />,
    addonKey: "hasMultiplasBingo",
    popupType: "addon_odds",
  },
  {
    id: "alavancagem",
    title: "Alavancagem",
    subtitle: "Secuencias y progreso",
    route: "/alavancagem",
    icon: <TrendingUp className="w-5 h-5" />,
    addonKey: "hasAlavancagem",
    popupType: "addon_alavancagem",
  },
  {
    id: "bilhetes",
    title: "Últimos Tickets",
    subtitle: "Historial de greens",
    route: "/ultimos-greens",
    icon: <FileText className="w-5 h-5" />,
  },
];

export const QuickAccessCards = () => {
  const navigate = useNavigate();
  const access = useUserAccess();
  const { openPopup } = useFunnelPopup();

  const isLocked = (card: QuickCard): boolean => {
    if (!card.addonKey) return false;
    if (access.loading) return false; // don't lock while loading
    return !(access as any)[card.addonKey];
  };

  const handleClick = (card: QuickCard) => {
    if (isLocked(card) && card.popupType) {
      openPopup(card.popupType);
      return;
    }
    navigate(card.route);
  };

  return (
    <section className="space-y-2.5">
      <h2 className="text-base sm:text-lg font-bold" style={{ color: "#FFFFFF" }}>
        Acceso Rápido
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {cards.map((card) => {
          const locked = isLocked(card);

          return (
            <button
              key={card.id}
              onClick={() => handleClick(card)}
              className="group relative overflow-hidden rounded-xl text-left transition-all active:scale-[0.98]"
              style={{
                background: locked ? "rgba(20, 0, 0, 0.7)" : "rgba(0, 15, 0, 0.7)",
                border: locked
                  ? "1px solid rgba(255,100,0,0.25)"
                  : "1px solid rgba(234, 192, 100,0.2)",
                padding: "14px 16px",
                minHeight: "64px",
              }}
              onMouseEnter={(e) => {
                if (locked) {
                  e.currentTarget.style.borderColor = "rgba(255,120,0,0.5)";
                  e.currentTarget.style.background = "rgba(30, 5, 0, 0.85)";
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(255,100,0,0.1)";
                } else {
                  e.currentTarget.style.borderColor = "rgba(234, 192, 100,0.45)";
                  e.currentTarget.style.background = "rgba(0,20,0,0.85)";
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(234, 192, 100,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = locked
                  ? "rgba(255,100,0,0.25)"
                  : "rgba(234, 192, 100,0.2)";
                e.currentTarget.style.background = locked
                  ? "rgba(20, 0, 0, 0.7)"
                  : "rgba(0, 15, 0, 0.7)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: locked
                      ? "rgba(255,100,0,0.08)"
                      : "rgba(234, 192, 100,0.08)",
                    border: locked
                      ? "1px solid rgba(255,100,0,0.2)"
                      : "1px solid rgba(234, 192, 100,0.2)",
                    color: locked ? "#FF8800" : "#00CC00",
                  }}
                >
                  {access.loading && card.addonKey ? (
                    <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                  ) : (
                    card.icon
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: "#FFFFFF" }}>
                    {card.title}
                  </h3>
                  <p className="text-[11px]" style={{ color: locked ? "rgba(255,160,80,0.7)" : "#AAAAAA" }}>
                    {locked ? "Add-on necesario • Toca para adquirir" : card.subtitle}
                  </p>
                </div>

                {/* Right indicator */}
                {locked ? (
                  <Lock
                    className="shrink-0 w-4 h-4"
                    style={{ color: "#FF8800", opacity: 0.8 }}
                  />
                ) : (
                  <ChevronRight
                    className="shrink-0 w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all"
                    style={{ color: "#CCCCCC" }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
