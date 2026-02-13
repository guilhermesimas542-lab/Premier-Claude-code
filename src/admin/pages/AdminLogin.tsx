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
        setError("Acesso restrito. Este email não é administrador.");
        setLoading(false);
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  if (signupDone) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-green-400 text-lg font-semibold">Conta criada!</div>
          <p className="text-gray-400 text-sm">
            Verifique seu email ({email}) e clique no link de confirmação. Depois, volte e faça login.
          </p>
          <Button variant="outline" className="w-full" onClick={() => { setMode("login"); setSignupDone(false); }}>
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Premier Ultra Admin</h1>
          <p className="text-gray-500 text-sm">
            {mode === "login" ? "Faça login com sua conta admin" : "Crie sua conta admin"}
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
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-900 border-gray-800 text-white"
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-gray-900 border-gray-800 text-white"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>

        <p className="text-center text-gray-500 text-xs">
          {mode === "login" ? (
            <>Primeiro acesso? <button type="button" className="text-blue-400 hover:underline" onClick={() => setMode("signup")}>Criar conta</button></>
          ) : (
            <>Já tem conta? <button type="button" className="text-blue-400 hover:underline" onClick={() => setMode("login")}>Fazer login</button></>
          )}
        </p>
      </form>
    </div>
  );
}
