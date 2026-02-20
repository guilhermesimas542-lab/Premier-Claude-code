import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminModeProvider } from "../context/AdminModeContext";
import { BettingHouseProvider, useBettingHouseAdmin } from "../context/BettingHouseContext";
import { useAdmin } from "../hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

function HouseSelector() {
  const { houses, selectedHouse, setSelectedHouseId } = useBettingHouseAdmin();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (houses.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-800 border border-white/10 hover:bg-gray-700 transition-colors"
      >
        <span className="text-gray-400 text-xs hidden sm:inline">Casa:</span>
        <span className="text-white font-medium max-w-[140px] truncate">{selectedHouse?.name ?? "Selecionar"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px]">
          {houses.map((h) => (
            <button
              key={h.id}
              onClick={() => { setSelectedHouseId(h.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-gray-700 ${h.id === selectedHouse?.id ? "text-blue-400 font-medium" : "text-gray-200"}`}
            >
              {h.id === selectedHouse?.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
              {h.id !== selectedHouse?.id && <span className="w-1.5 h-1.5 shrink-0" />}
              {h.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminLayout() {
  const { user, signOut } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <AdminModeProvider>
      <BettingHouseProvider>
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
          <AdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0 gap-4">
              <span className="text-sm text-gray-400 truncate">{user?.email}</span>
              <div className="flex items-center gap-3 shrink-0">
                <HouseSelector />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white gap-1.5">
                  <LogOut className="w-4 h-4" /> Sair
                </Button>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </BettingHouseProvider>
    </AdminModeProvider>
  );
}

