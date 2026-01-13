import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { normalizePayload, persistConfig } from "@/lib/auth";
import { LoginResponse } from "@/types/auth";
import { Smartphone, Users, Zap, RefreshCw, Target, Brain, ShoppingCart } from "lucide-react";
import logoImg from "@/assets/logo.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayStoreModal, setShowPlayStoreModal] = useState(false);
  const [showAcquireModal, setShowAcquireModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] via-[#121826] to-[#0C0F14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-[#121826]/90 to-[#0C0F14]/90 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Logo/Header */}
          <div className="text-center mb-6">
            <div className="mb-4 relative">
              <div className="absolute inset-0 bg-purple-600/20 blur-2xl rounded-full"></div>
              <img src={logoImg} alt="Premier Ultra" className="h-20 w-auto mx-auto relative z-10 rounded-xl" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
              Premier Ultra
            </h1>
            <p className="text-white/70 text-sm flex items-center justify-center gap-1.5">
              <Brain className="w-4 h-4 text-purple-400" />
              Análise de futebol feita por Inteligência Artificial.
            </p>
          </div>

          {/* Social Proof Badge */}
          <div className="flex flex-col items-center mb-5">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/30">
              <Users className="w-4 h-4" />
              +50.000 clientes ativos
            </div>
            <p className="text-white/50 text-xs mt-2">
              Atualizações diárias • Acesso instantâneo
            </p>
          </div>

          {/* Benefit Chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="bg-white/5 border border-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              Entradas prontas
            </span>
            <span className="bg-white/5 border border-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              Atualizadas todo dia
            </span>
            <span className="bg-white/5 border border-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Target className="w-3 h-3 text-emerald-400" />
              Alto índice de assertividade
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-white/90">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 h-12 text-base focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-700 text-white font-bold py-6 text-base shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/50"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Acessar aplicativo"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAcquireModal(true)}
              className="w-full border-white/20 bg-white/5 hover:bg-white/10 text-white/90 font-semibold py-5 text-sm transition-all duration-300"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Adquirir acesso
            </Button>

            <p className="text-center text-white/40 text-xs">
              Acesso rápido • Sem complicação
            </p>
          </form>

          {/* Download App Button */}
          <div className="mt-6">
            <button
              onClick={() => setShowPlayStoreModal(true)}
              className="block transition-all duration-300 hover:scale-[1.02] mx-auto opacity-80 hover:opacity-100"
            >
              <img 
                src="/images/google-play-badge.png" 
                alt="Disponível no Google Play" 
                className="h-12 w-auto"
              />
            </button>
          </div>

          {/* Footer Legal */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center space-y-3">
            <p className="text-[11px] text-white/50 leading-relaxed">
              Ao continuar, você concorda com nossos{" "}
              <button 
                onClick={() => setShowTermsModal(true)}
                className="text-white/70 underline underline-offset-2 hover:text-white transition-colors"
              >
                Termos e Privacidade
              </button>.
            </p>
            
            <div className="flex items-center justify-center gap-3 text-[11px]">
              <button 
                onClick={() => setShowTermsModal(true)}
                className="text-white/50 hover:text-white/80 transition-colors"
              >
                Termos e Privacidade
              </button>
              <span className="text-white/30">|</span>
              <a href="#" className="text-white/50 hover:text-white/80 transition-colors">
                Suporte
              </a>
            </div>

            <p className="text-[10px] text-white/40 font-medium">
              18+ • Jogue com responsabilidade.
            </p>
          </div>
        </div>
      </div>

      {/* Google Play Coming Soon Modal */}
      <Dialog open={showPlayStoreModal} onOpenChange={setShowPlayStoreModal}>
        <DialogContent className="bg-[#0C0F14] border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-400" />
              Em Breve na Google Play
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/70">
              Em poucos dias o app estará disponível na Google Play! 🚀
            </p>
            
            <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4 text-center">
              <p className="text-white text-sm font-medium">
                Fique atento às nossas atualizações para ser um dos primeiros a baixar!
              </p>
            </div>

            <p className="text-xs text-white/50 pt-2 border-t border-white/10">
              Enquanto isso, você pode usar o app direto pelo navegador ou instalar o atalho na tela inicial.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Acquire Access Modal */}
      <Dialog open={showAcquireModal} onOpenChange={setShowAcquireModal}>
        <DialogContent className="bg-[#0C0F14] border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Adquirir acesso
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/70">
              Em breve: aqui vamos direcionar para o checkout/compra.
            </p>
            
            <Button
              onClick={() => setShowAcquireModal(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms and Privacy Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="bg-[#0C0F14] border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">
              Termos e Privacidade
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/70">
              Conteúdo em breve.
            </p>
            
            <Button
              onClick={() => setShowTermsModal(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
