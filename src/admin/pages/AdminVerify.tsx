import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import logo from "@/assets/premier-logo-new.png";

export default function AdminVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email as string | undefined;

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Se não veio email do state, volta pro login
  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        setError(
          signInErr.message === "Invalid login credentials"
            ? "Contraseña incorrecta. Inténtalo de nuevo."
            : signInErr.message
        );
        return;
      }
      toast.success("¡Bienvenido, administrador!");
      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(err.message || "Error al autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center px-4" style={{ background: "#1A0E2E" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <img src={logo} alt="Premier Ultra" className="h-12 w-auto mx-auto object-contain" />
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <ShieldCheck className="w-5 h-5" />
            <h1 className="text-xl font-bold text-white">Acceso Administrativo</h1>
          </div>
          <p className="text-white/50 text-sm">
            Ingresa tu clave de acceso para <span className="text-white/80 font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="admin-password" className="text-sm text-white/80 font-medium">
            Clave de acceso
          </label>
          <input
            id="admin-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            disabled={loading}
            autoFocus
            className="w-full h-[52px] rounded-xl px-4 text-base text-white placeholder:text-white/30 outline-none transition-colors disabled:opacity-50 bg-[#2C1A47] border border-purple-500/20 focus:border-[#00FF7F]"
          />
        </div>

        <button
          type="submit"
          disabled={!password.trim() || loading}
          className="w-full h-14 rounded-xl text-white text-base font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] flex items-center justify-center bg-[#7C3AED] hover:bg-[#6D28D9]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ingresar"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
        >
← Volver al inicio de sesión
        </button>
      </form>
    </div>
  );
}
