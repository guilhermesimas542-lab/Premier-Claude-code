import { useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  {
    path: "/sport/1",
    label: "Tips",
    // Filled football/soccer ball SVG
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-.52.07-1.06.07-1.58.02l-1.4-2.44 1.39-2.2h3.18l1.39 2.2-1.4 2.44c-.51.05-1.05.05-1.58-.02zm3.72-1.28l-.78-1.36 1.74-1.08 1.7.45A7.97 7.97 0 0116.72 18.65zM7.28 18.65a7.97 7.97 0 01-1.66-1.99l1.7-.45 1.74 1.08-.78 1.36zM5 12c0-.94.16-1.84.46-2.68l1.68.47.5 2.04-1.35 2.13-1.6-.42C4.87 13.04 5 12.54 5 12zm14 0c0 .54-.13 1.04-.29 1.54l-1.6.42-1.35-2.13.5-2.04 1.68-.47c.3.84.46 1.74.46 2.68zm-.97-3.79l-1.53.43-.95-1.82.47-1.4A8.04 8.04 0 0118.03 8.21zM5.97 8.21a8.04 8.04 0 012.01-2.79l.47 1.4-.95 1.82-1.53-.43zM12 4c.93 0 1.82.16 2.64.45l-.87 1.28H10.23l-.87-1.28C10.18 4.16 11.07 4 12 4z",
    matchPaths: ["/sport", "/alavancagem", "/odds-altas"],
  },
  {
    path: "/cassino",
    label: "Cassino",
    // Filled dice SVG
    iconPath: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9z",
    matchPaths: ["/cassino", "/casino"],
  },
  {
    path: "/support",
    label: "Perfil",
    // Filled person SVG
    iconPath: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    matchPaths: ["/support"],
  },
];

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
                <div className="absolute inset-0 rounded-xl" style={{ background: "rgba(0,255,127,0.08)" }} />
              )}
              
              <svg
                className="relative z-10 w-5 h-5 transition-colors"
                viewBox="0 0 24 24"
                fill={active ? "#00FF7F" : "#4A5568"}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d={item.iconPath} />
              </svg>
              <span
                className="relative z-10 transition-colors"
                style={{
                  color: active ? "#FFFFFF" : "#4A5568",
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
