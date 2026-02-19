import { FileText, TrendingUp, Target, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickCard {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: React.ReactNode;
}

const cards: QuickCard[] = [
  {
    id: "odds-altas",
    title: "Odds Altas",
    subtitle: "Seleções com odds maiores",
    route: "/odds-altas",
    icon: <Target className="w-5 h-5" />,
  },
  {
    id: "alavancagem",
    title: "Alavancagem",
    subtitle: "Sequências e progresso",
    route: "/alavancagem",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: "bilhetes",
    title: "Últimos Bilhetes",
    subtitle: "Histórico de greens",
    route: "/ultimos-greens",
    icon: <FileText className="w-5 h-5" />,
  },
];

export const QuickAccessCards = () => {
  const navigate = useNavigate();

  return (
    <section className="space-y-2.5">
      <h2 className="text-base sm:text-lg font-bold" style={{ color: "#00FF00", textShadow: "0 0 12px rgba(0,255,0,0.3)" }}>
        Acesso Rápido
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => navigate(card.route)}
            className="group relative overflow-hidden rounded-xl text-left transition-all active:scale-[0.98]"
            style={{
              background: "rgba(0, 15, 0, 0.7)",
              border: "1px solid rgba(0,255,0,0.2)",
              padding: "14px 16px",
              minHeight: "64px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,255,0,0.45)";
              e.currentTarget.style.background = "rgba(0,20,0,0.85)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(0,255,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,255,0,0.2)";
              e.currentTarget.style.background = "rgba(0, 15, 0, 0.7)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.2)", color: "#00CC00" }}
              >
                {card.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate" style={{ color: "#00DD00" }}>
                  {card.title}
                </h3>
                <p className="text-[11px]" style={{ color: "#006600" }}>
                  {card.subtitle}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="shrink-0 w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" style={{ color: "#00AA00" }} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
