import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { normalizePayload, persistConfig } from "@/lib/auth";
import { LoginResponse } from "@/types/auth";
import { Smartphone, Trophy, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import logoImg from "@/assets/logo.jpg";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayStoreModal, setShowPlayStoreModal] = useState(false);
  const navigate = useNavigate();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`https://apiv1.premierfc.app/api/v2/auth/Login?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
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
  return <div className="min-h-screen bg-gradient-to-b from-[#0C0F14] via-[#121826] to-[#0C0F14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-[#121826]/90 to-[#0C0F14]/90 border border-primary/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
              <img src={logoImg} alt="Olheiro" className="h-20 w-auto mx-auto relative z-10 rounded-xl" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2 border-0 border-dotted">
              <Trophy className="w-5 h-5 text-primary" />
              Tips Profissionais de Apostas
            </h2>
            <p className="text-muted-foreground text-sm">
              Acesse sua conta e lucre com análises de especialistas
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">Alta Taxa de Acerto</p>
            </div>
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-center">
              <Trophy className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">Tips Exclusivas</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
                📧 E-mail
              </label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="bg-muted/20 border-primary/30 text-foreground placeholder:text-muted-foreground h-12 text-base focus:border-primary/50 transition-all" disabled={isLoading} />
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-700 text-white font-bold py-6 text-base shadow-xl shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/60" disabled={isLoading}>
              {isLoading ? "Entrando..." : "🚀 Acessar Minhas Tips"}
            </Button>
          </form>

          {/* Separator */}
          <div className="flex items-center gap-4 my-6">
            <Separator className="flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground font-medium">OU</span>
            <Separator className="flex-1 bg-border/50" />
          </div>

          {/* Download App Button */}
          <div>
            <button onClick={() => setShowPlayStoreModal(true)} className="block transition-all duration-300 hover:scale-[1.02] mx-auto">
              <img src="/images/google-play-badge.png" alt="Disponível no Google Play" className="h-14 w-auto" />
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Seus dados estão seguros conosco
            </p>
          </div>
        </div>

      </div>

      {/* Google Play Coming Soon Modal */}
      <Dialog open={showPlayStoreModal} onOpenChange={setShowPlayStoreModal}>
        <DialogContent className="bg-[#0C0F14] border-border/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-bold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Em Breve na Google Play
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Em poucos dias o app estará disponível na Google Play! 🚀
            </p>
            
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-foreground text-sm font-medium">
                Fique atento às nossas atualizações para ser um dos primeiros a baixar!
              </p>
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
              Enquanto isso, você pode usar o app direto pelo navegador ou instalar o atalho na tela inicial.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Login;