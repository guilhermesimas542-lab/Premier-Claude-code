import { Navigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin();

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Verificando acesso…
      </div>
    );

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}
