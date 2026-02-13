import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Image, PlusCircle, Upload, List,
  Users, Bell, BarChart3, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";

const sections = [
  {
    label: "Gestão",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/admin/banners", icon: Image, label: "Banners" },
      { to: "/admin/tips/create", icon: PlusCircle, label: "Tips: Cadastrar" },
      { to: "/admin/tips/import", icon: Upload, label: "Tips: Importar CSV" },
      { to: "/admin/tips/list", icon: List, label: "Tips: Listar" },
      { to: "/admin/clients", icon: Users, label: "Clientes" },
      { to: "/admin/notifications", icon: Bell, label: "Notificações" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

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
