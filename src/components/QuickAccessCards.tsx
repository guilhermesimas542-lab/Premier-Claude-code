import { FileText, TrendingUp, Target, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickCard {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: React.ReactNode;
  color: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
}

const cards: QuickCard[] = [
  {
    id: "bilhetes",
    title: "Últimos Bilhetes",
    subtitle: "Veja seus bilhetes recentes",
    route: "/bilhetes",
    icon: <FileText className="w-5 h-5" />,
    color: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-300",
      glow: "group-hover:shadow-purple-500/20",
    },
  },
  {
    id: "alavancagem",
    title: "Alavancagem",
    subtitle: "Sequências e progresso",
    route: "/alavancagem",
    icon: <TrendingUp className="w-5 h-5" />,
    color: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-300",
      glow: "group-hover:shadow-emerald-500/20",
    },
  },
  {
    id: "odds-altas",
    title: "Odds Altas",
    subtitle: "Seleções com odds maiores",
    route: "/odds-altas",
    icon: <Target className="w-5 h-5" />,
    color: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-300",
      glow: "group-hover:shadow-amber-500/20",
    },
  },
];

export const QuickAccessCards = () => {
  const navigate = useNavigate();

  return (
    <section className="space-y-3 sm:space-y-4">
      <h2 className="text-lg sm:text-xl font-bold text-white">
        Acesso Rápido
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => navigate(card.route)}
            className={`group relative overflow-hidden rounded-xl border ${card.color.border} ${card.color.bg} p-4 sm:p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${card.color.glow}`}
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex items-start gap-3">
              {/* Icon */}
              <div className={`shrink-0 w-10 h-10 rounded-lg ${card.color.bg} border ${card.color.border} flex items-center justify-center ${card.color.text}`}>
                {card.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-0.5 truncate">
                  {card.title}
                </h3>
                <p className={`text-xs ${card.color.text} opacity-70`}>
                  {card.subtitle}
                </p>
              </div>
              
              {/* Arrow */}
              <div className={`shrink-0 ${card.color.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
