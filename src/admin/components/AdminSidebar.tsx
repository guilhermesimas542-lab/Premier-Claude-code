import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Image, PlusCircle, List,
  Users, Bell, BarChart3, ChevronLeft, ChevronRight,
  DollarSign, Activity, Home, Link, Layers, Shield, CreditCard, Bug, Zap,
  ChevronDown, UserPlus, UserX, UserCheck, Trophy, MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAdminMode } from "../context/AdminModeContext";
import { useAdmin } from "../hooks/useAdmin";
import { useAdminBadges } from "../hooks/useAdminBadges";

interface MenuItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  children?: { to: string; icon: React.ElementType; label: string; end?: boolean }[];
  badge?: number | null;
  badgeColor?: string; // tailwind bg class, defaults to bg-red-500
}

interface Section {
  label: string;
  items: MenuItem[];
}

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { mode, setMode } = useAdminMode();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const { user } = useAdmin();
  const { counts, markSeen } = useAdminBadges(user?.email ?? null);

  // Mark seen when navigating to specific sections
  useEffect(() => {
    if (location.pathname.startsWith("/admin/clients")) {
      markSeen("clients");
    } else if (location.pathname === "/admin/errors") {
      markSeen("errors");
    }
  }, [location.pathname, markSeen]);

  const futebolSections: Section[] = [
    {
      label: "Gestão",
      items: [
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
        { to: "/admin/banners", icon: Image, label: "Banners" },
        {
          to: "/admin/clients",
          icon: Users,
          label: "Clientes",
          badge: counts.clients,
          children: [
            { to: "/admin/clients", icon: List, label: "Lista de Clientes", end: true },
            { to: "/admin/clients/nao-acessou", icon: UserX, label: "Não Acessou" },
            { to: "/admin/clients/free", icon: UserCheck, label: "Clientes Free" },
            { to: "/admin/clients/create", icon: UserPlus, label: "Cadastrar Novo" },
          ],
        },
        { to: "/admin/notifications", icon: Bell, label: "Notificações" },
      ],
    },
    {
      label: "Entradas",
      items: [
        { to: "/admin/tips/create", icon: PlusCircle, label: "Tips: Cadastrar" },
        { to: "/admin/tips/list", icon: List, label: "Tips: Listar", badge: counts.tips, badgeColor: "bg-blue-500" },
        { to: "/admin/tips/analytics", icon: BarChart3, label: "Analytics" },
        { to: "/admin/teams", icon: Shield, label: "Times (Logos)" },
        { to: "/admin/predictions", icon: Layers, label: "Palpites/Mercado" },
      ],
    },
    {
      label: "Links e Pop-ups",
      items: [
        { to: "/admin/default-links", icon: Link, label: "Links Padrão" },
        { to: "/admin/popups", icon: Layers, label: "Pop-ups e Funis" },
        { to: "/admin/cards", icon: Layers, label: "Cards e Funis" },
        { to: "/admin/pay-cards", icon: CreditCard, label: "Pay Cards" },
      ],
    },
    {
      label: "Analytics",
      items: [
        { to: "/admin/analytics", icon: BarChart3, label: "Visão Geral" },
        { to: "/admin/analytics/events", icon: Activity, label: "Eventos" },
        { to: "/admin/ranking", icon: Trophy, label: "Ranking" },
        { to: "/admin/errors", icon: Bug, label: "Erros", badge: counts.errors },
        { to: "/admin/feedback", icon: MessageSquare, label: "Feedback", badge: counts.feedback },
      ],
    },
    {
      label: "Finanças",
      items: [
        { to: "/admin/revenue", icon: DollarSign, label: "Receita" },
      ],
    },
    {
      label: "Integrações",
      items: [
        { to: "/admin/betting-houses", icon: Home, label: "Casas Parceiras" },
        { to: "/admin/webhook", icon: Zap, label: "Webhook" },
      ],
    },
  ];

  const cassinoSections: Section[] = [
    {
      label: "Gestão",
      items: [
        { to: "/admin/cassino", icon: LayoutDashboard, label: "Dashboard", end: true },
      ],
    },
    {
      label: "Analytics",
      items: [
        { to: "/admin/cassino/analytics", icon: BarChart3, label: "Visão Geral" },
      ],
    },
    {
      label: "Finanças",
      items: [
        { to: "/admin/cassino/revenue", icon: DollarSign, label: "Receita" },
      ],
    },
  ];

  const sections = mode === "futebol" ? futebolSections : cassinoSections;

  const isChildActive = (item: MenuItem) =>
    item.children?.some((c) => c.end ? location.pathname === c.to : location.pathname.startsWith(c.to)) ?? false;

  const toggleExpand = (to: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(to)) next.delete(to);
      else next.add(to);
      return next;
    });
  };

  const isExpanded = (item: MenuItem) =>
    expandedMenus.has(item.to) || isChildActive(item);

  const BadgeSpan = ({ count, color }: { count: number; color?: string }) => {
    if (!count || count <= 0) return null;
    const bg = color || "bg-red-500";
    return (
      <span className={`ml-auto ${bg} text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-60"} bg-gray-900 border-r border-white/10 flex flex-col shrink-0 transition-all duration-200`}
    >
      <div className="h-14 flex items-center justify-between px-3 border-b border-white/10">
        {!collapsed && <span className="text-sm font-bold text-white truncate">Premier Ultra</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/10 text-gray-400"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Mode Toggle */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-white/10">
          <div className="flex rounded-lg bg-gray-800 p-0.5">
            <button
              onClick={() => setMode("futebol")}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                mode === "futebol" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              ⚽ Futebol
            </button>
            <button
              onClick={() => setMode("cassino")}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                mode === "cassino" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              🎰 Cassino
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5 px-2">
              {section.items.map((item) =>
                item.children ? (
                  <div key={item.to}>
                    <button
                      onClick={() => toggleExpand(item.to)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                        isChildActive(item)
                          ? "bg-blue-600/20 text-blue-400 font-medium"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          {item.badge != null && item.badge > 0 && (
                            <span className={`mr-1 ${item.badgeColor || "bg-red-500"} text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                          <ChevronDown
                            className={`w-3 h-3 transition-transform shrink-0 ${isExpanded(item) ? "rotate-180" : ""}`}
                          />
                        </>
                      )}
                    </button>
                    {!collapsed && isExpanded(item) && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            end={child.end}
                            className={({ isActive }) =>
                              `flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                                isActive
                                  ? "bg-blue-600/20 text-blue-400 font-medium"
                                  : "text-gray-400 hover:bg-white/5 hover:text-white"
                              }`
                            }
                          >
                            <child.icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-blue-600/20 text-blue-400 font-medium"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && <BadgeSpan count={item.badge ?? 0} color={item.badgeColor} />}
                  </NavLink>
                )
              )}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
