import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (signUpErr) throw signUpErr;
        setSignupDone(true);
        setLoading(false);
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // Check admin
      const { data: isAdm } = await (supabase.rpc as any)("is_admin");
      if (!isAdm) {
        await supabase.auth.signOut();
        setError("Acceso restringido. Este correo no es administrador.");
        setLoading(false);
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(err.message || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  };

  if (signupDone) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-green-400 text-lg font-semibold">¡Cuenta creada!</div>
          <p className="text-gray-400 text-sm">
            Revisa tu correo ({email}) y haz clic en el enlace de confirmación. Luego, vuelve e inicia sesión.
          </p>
          <Button variant="outline" className="w-full" onClick={() => { setMode("login"); setSignupDone(false); }}>
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">CL Ultra Admin</h1>
          <p className="text-gray-500 text-sm">
            {mode === "login" ? "Inicia sesión con tu cuenta admin" : "Crea tu cuenta admin"}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-900 border-gray-800 text-white"
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-gray-900 border-gray-800 text-white"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {mode === "login" ? "Ingresar" : "Crear cuenta"}
        </Button>

        <p className="text-center text-gray-500 text-xs">
          {mode === "login" ? (
            <>¿Primer acceso? <button type="button" className="text-blue-400 hover:underline" onClick={() => setMode("signup")}>Crear cuenta</button></>
          ) : (
            <>¿Ya tienes cuenta? <button type="button" className="text-blue-400 hover:underline" onClick={() => setMode("login")}>Iniciar sesión</button></>
          )}
        </p>
      </form>
    </div>
  );
}
