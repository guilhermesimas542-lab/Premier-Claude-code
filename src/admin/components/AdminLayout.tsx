import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { useAdmin } from "../hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLayout() {
  const { user, signOut } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white gap-1.5">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
