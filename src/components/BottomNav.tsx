import { useLocation, useNavigate } from "react-router-dom";
import { isPreviewEnv } from "@/lib/previewEnv";

const ALL_NAV_ITEMS = [
  {
    path: "/sport/1",
    label: "Tips",
    // Filled trophy SVG (Copa)
    iconPath: "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z",
    matchPaths: ["/sport", "/alavancagem", "/odds-altas"],
    previewOnly: false,
  },
  {
    path: "/ia-tipster",
    label: "IA Tipster",
    // previewOnly removido — feature liberada em produção
    // Filled sparkles/star SVG (represents AI)
    iconPath: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z",
    matchPaths: ["/ia-tipster"],
    previewOnly: false,
  },
  {
    path: "/support",
    label: "Perfil",  // grafia idêntica em pt-BR e es-CL
    // Filled person SVG
    iconPath: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    matchPaths: ["/support"],
    previewOnly: false,
  },
];

const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => !item.previewOnly || isPreviewEnv());

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    return item.matchPaths.some(p => location.pathname.startsWith(p));
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: "64px",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(11,22,40,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="h-full flex items-center justify-around max-w-md mx-auto px-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className="relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200"
            >
              {active && (
                <div className="absolute inset-0 rounded-xl" style={{ background: "rgba(224,179,65,0.12)" }} />
              )}
              
              <svg
                className="relative z-10 w-5 h-5 transition-colors"
                viewBox="0 0 24 24"
                fill={active ? "#F2C84B" : "#E0B341"}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d={item.iconPath} />
              </svg>
              <span
                className="relative z-10 transition-colors"
                style={{
                  color: active ? "#F2C84B" : "#E0B341",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '10px',
                  letterSpacing: '0.5px',
                }}
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
