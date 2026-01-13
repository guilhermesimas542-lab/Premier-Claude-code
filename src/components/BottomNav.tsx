import { useLocation, useNavigate } from "react-router-dom";
import { CircleDot, Dices, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV_ITEMS = [
  {
    path: "/sport/1",
    label: "Tips",
    icon: CircleDot,
    matchPaths: ["/sport", "/alavancagem", "/odds-altas"],
  },
  {
    path: "/cassino",
    label: "Cassino",
    icon: Dices,
    matchPaths: ["/cassino", "/casino"],
  },
  {
    path: "/support",
    label: "Suporte",
    icon: Settings,
    matchPaths: ["/support"],
  },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Só mostra no mobile
  if (!isMobile) return null;

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    return item.matchPaths.some(p => location.pathname.startsWith(p));
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0A1A]/90 backdrop-blur-xl border-t border-purple-500/20 shadow-lg shadow-purple-900/30"
      style={{
        height: "64px",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="h-full flex items-center justify-around max-w-md mx-auto px-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`
                relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200
                ${active 
                  ? "text-purple-400" 
                  : "text-gray-400 hover:text-gray-300"
                }
              `}
            >
              {/* Pill/highlight atrás do ícone quando ativo */}
              {active && (
                <div className="absolute inset-0 bg-purple-500/15 rounded-xl" />
              )}
              
              <Icon 
                className={`relative z-10 w-5 h-5 transition-colors ${active ? "text-purple-400" : ""}`} 
              />
              <span 
                className={`relative z-10 text-[10px] font-medium transition-colors ${active ? "text-purple-400" : ""}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
