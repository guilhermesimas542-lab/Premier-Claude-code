import { useLocation, useNavigate } from "react-router-dom";
import { Home, CheckCircle, User } from "lucide-react";
import { isPreviewEnv } from "@/lib/previewEnv";

const SparkStar = ({ color, size = 22 }: { color: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", flex: "none" }}>
    <path d="M12 1.2 C12.7 7.1 16.9 11.3 22.8 12 C16.9 12.7 12.7 16.9 12 22.8 C11.3 16.9 7.1 12.7 1.2 12 C7.1 11.3 11.3 7.1 12 1.2 Z" fill={color} />
  </svg>
);

type NavItem = { path: string; label: string; kind: "home" | "tips" | "ia" | "perfil"; matchPaths: string[]; previewOnly: boolean; };

const ALL_NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Menú", kind: "home", matchPaths: ["/"], previewOnly: false },
  { path: "/sport/1", label: "Tips", kind: "tips", matchPaths: ["/sport", "/alavancagem", "/odds-altas"], previewOnly: false },
  { path: "/ia-tipster", label: "IA Tipster", kind: "ia", matchPaths: ["/ia-tipster"], previewOnly: false },
  { path: "/support", label: "Perfil", kind: "perfil", matchPaths: ["/support"], previewOnly: false },
];

const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => !item.previewOnly || isPreviewEnv());

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.path === "/") return location.pathname === "/";
    return item.matchPaths.some((p) => location.pathname.startsWith(p));
  };

  const renderIcon = (item: NavItem, color: string) => {
    if (item.kind === "home") return <Home className="w-5 h-5" style={{ color }} strokeWidth={2.2} />;
    if (item.kind === "tips") return <CheckCircle className="w-5 h-5" style={{ color }} strokeWidth={2.2} />;
    if (item.kind === "ia") return <SparkStar color={color} />;
    return <User className="w-5 h-5" style={{ color }} strokeWidth={2.2} />;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", background: "#08090b", borderTop: "1px solid rgba(235,235,245,0.07)" }}>
      <div className="flex items-center justify-around max-w-md mx-auto" style={{ padding: "12px 12px 16px" }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <button key={item.path} onClick={() => navigate(item.path)} aria-label={item.label} className="flex flex-col items-center gap-1.5" style={{ background: "none", border: "none", cursor: "pointer" }}>
              <span className="grid place-items-center transition-all duration-200" style={{ width: active ? 54 : 30, height: 30, borderRadius: 999, background: active ? "#ffffff" : "transparent", boxShadow: active ? "0 4px 14px -4px rgba(255,255,255,.4)" : "none" }}>
                {renderIcon(item, active ? "#1c1810" : "#ffffff")}
              </span>
              <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, color: "#ffffff" }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
