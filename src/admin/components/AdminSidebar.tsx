import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Image, PlusCircle, List,
  Users, Bell, BarChart3, ChevronLeft, ChevronRight,
  DollarSign, Activity, Home, Link, Layers, Shield,
} from "lucide-react";
import { useState } from "react";
import { useAdminMode } from "../context/AdminModeContext";

const futebolSections = [
  {
    label: "Gestão",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/admin/banners", icon: Image, label: "Banners" },
      { to: "/admin/clients", icon: Users, label: "Clientes" },
      { to: "/admin/notifications", icon: Bell, label: "Notificações" },
    ],
  },
  {
    label: "Entradas",
    items: [
      { to: "/admin/tips/create", icon: PlusCircle, label: "Tips: Cadastrar" },
      { to: "/admin/tips/list", icon: List, label: "Tips: Listar" },
      { to: "/admin/teams", icon: Shield, label: "Times (Logos)" },
      { to: "/admin/predictions", icon: Layers, label: "Palpites/Mercado" },
    ],
  },
  {
    label: "Links e Pop-ups",
    items: [
      { to: "/admin/default-links", icon: Link, label: "Links Padrão" },
      { to: "/admin/popups", icon: Layers, label: "Pop-ups" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/admin/analytics", icon: BarChart3, label: "Visão Geral" },
      { to: "/admin/analytics/events", icon: Activity, label: "Eventos" },
    ],
  },
  {
    label: "Finanças",
    items: [
      { to: "/admin/revenue", icon: DollarSign, label: "Receita" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { to: "/admin/betting-houses", icon: Home, label: "Casas Parceiras" },
    ],
  },
];

const cassinoSections = [
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

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { mode, setMode } = useAdminMode();

  const sections = mode === "futebol" ? futebolSections : cassinoSections;

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
              {section.items.map((item) => (
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
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
