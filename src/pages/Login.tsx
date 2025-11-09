import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { normalizePayload, persistConfig } from "@/lib/auth";
import { LoginResponse } from "@/types/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://apiv1.premierfc.app/api/v2/auth/Login?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data: LoginResponse = await response.json();

      if (data.success && data.response) {
        // Se houver redirect, redireciona para checkout
        if (data.response.redirect && data.response.checkout) {
          window.location.href = data.response.checkout;
          return;
        }

        // Normaliza e persiste configuração
        const cfg = normalizePayload(data);
        persistConfig(cfg);

        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        toast.error(data.message?.[0] || "Erro ao fazer login");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] to-[#121826] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-[#121826] to-[#0C0F14] border border-border/30 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-extrabold text-foreground mb-2 tracking-tight">
              Premier FC
            </h1>
            <p className="text-muted-foreground text-sm">
              Acesse sua conta para ver as tips do dia
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/20 border-border/50 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 text-base shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Ao entrar, você concorda com nossos termos de uso
            </p>
          </div>
        </div>

        {/* External Link */}
        <div className="mt-6 text-center">
          <a
            href="https://premierfc.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            Não tem conta? Cadastre-se aqui
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
