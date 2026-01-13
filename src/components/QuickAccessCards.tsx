import { FileText, TrendingUp, Target, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickCard {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: React.ReactNode;
}

// Ordem: Odds Altas, Alavancagem, Últimos Bilhetes
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
    subtitle: "Veja seus bilhetes recentes",
    route: "/bilhetes",
    icon: <FileText className="w-5 h-5" />,
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
            className="group relative overflow-hidden rounded-xl border border-gray-300/20 bg-white/90 backdrop-blur-sm p-4 sm:p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-900/10"
          >
            {/* Subtle hover glow */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gray-400/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex items-start gap-3">
              {/* Icon */}
              <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 border border-gray-200/60 flex items-center justify-center text-gray-600">
                {card.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-0.5 truncate">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-500">
                  {card.subtitle}
                </p>
              </div>
              
              {/* Arrow */}
              <div className="shrink-0 text-gray-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
