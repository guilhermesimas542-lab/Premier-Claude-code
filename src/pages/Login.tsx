import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { mockLogin } from "@/mocks/user";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { Crown, Loader2, ClipboardCheck, BarChart3, Target } from "lucide-react";
import logo from "@/assets/premier-logo-new.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showAcquireModal, setShowAcquireModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    if (!email || !validateEmail(email)) {
      setEmailError("Por favor, insira um e-mail válido.");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      mockLogin(email);
      toast.success("Login realizado com sucesso!");
      setIsLoading(false);
      navigate("/");
    }, 800);
  };

  const handleAcquireAccess = () => {
    window.open(CHECKOUT_LINKS.paywall_default, "_blank");
    setShowAcquireModal(false);
  };

  const isDisabled = !email.trim() || isLoading;

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 bg-[#1A0E2E]" />
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, #4A1F6F 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 70% 80%, #1F3A6F 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 50% 50%, #2E1A47 0%, transparent 50%)",
        }}
      />
      {/* Slow animated aurora layer */}
      <div
        className="absolute inset-0 opacity-40 animate-pulse"
        style={{
          animationDuration: "8s",
          background:
            "radial-gradient(ellipse 60% 40% at 60% 30%, rgba(74, 31, 111, 0.5) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <img src={logo} alt="Premier Ultra" className="h-16 w-auto mx-auto mb-8 object-contain scale-[2.2]" />

        {/* Glass Card */}
        <div
          className="w-full rounded-3xl p-6"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          {/* Headline */}
          <h1 className="text-[28px] font-semibold text-white text-center leading-tight mb-8">
            Análises por IA.
            <br />
            Entradas prontas.
          </h1>

          {/* Benefits */}
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3">
              <ClipboardCheck className="w-4 h-4 text-white/60 shrink-0" strokeWidth={1.5} />
              <span className="text-base text-white/85">Entradas prontas para copiar e colar.</span>
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-white/60 shrink-0" strokeWidth={1.5} />
              <span className="text-base text-white/85">Atualizado diariamente.</span>
            </li>
            <li className="flex items-center gap-3">
              <Target className="w-4 h-4 text-white/60 shrink-0" strokeWidth={1.5} />
              <span className="text-base text-white/85">Alto índice de assertividade.</span>
            </li>
          </ul>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-white/60">
                Seu melhor e-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                disabled={isLoading}
                className={`w-full h-[52px] rounded-lg px-4 text-base text-white placeholder:text-white/25 outline-none transition-colors disabled:opacity-50 ${
                  emailError
                    ? "border border-red-500 focus:border-red-500"
                    : "border border-white/15 focus:border-[#00FF7F]"
                }`}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
              />
              {emailError && (
                <p className="text-sm text-red-400">{emailError}</p>
              )}
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full h-14 rounded-xl text-black text-base font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:brightness-110 active:scale-[0.98] flex items-center justify-center"
              style={{
                background: "#00FF7F",
                boxShadow: isDisabled ? "none" : "0 0 20px rgba(0, 255, 127, 0.35)",
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Entrar Agora"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-white/50">
            Ao continuar, você concorda com nossos{" "}
            <button
              onClick={() => setShowTermsModal(true)}
              className="underline underline-offset-2 hover:text-white/70 transition-colors"
            >
              Termos e Privacidade
            </button>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/40">
            <a href="/support" className="hover:text-white/60 transition-colors">
              Suporte
            </a>
          </div>
          <p className="text-xs text-white/30">18+ • Jogue com responsabilidade.</p>
        </div>
      </div>

      {/* Acquire Modal */}
      <Dialog open={showAcquireModal} onOpenChange={setShowAcquireModal}>
        <DialogContent
          className="max-w-sm border-white/15"
          style={{
            background: "rgba(26, 14, 46, 0.95)",
            backdropFilter: "blur(20px)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-400" />
              Acesso Exclusivo Premier Ultra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/70">
              Você está a um passo de receber as melhores análises por IA. Adquira seu acesso para continuar.
            </p>
            <button
              onClick={handleAcquireAccess}
              className="w-full h-12 rounded-xl text-black font-bold text-sm hover:brightness-110 transition-all"
              style={{
                background: "#00FF7F",
                boxShadow: "0 0 20px rgba(0, 255, 127, 0.35)",
              }}
            >
              Adquirir Acesso Agora
            </button>
            <button
              onClick={() => setShowAcquireModal(false)}
              className="w-full py-2.5 text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent
          className="max-w-sm border-white/15"
          style={{
            background: "rgba(26, 14, 46, 0.95)",
            backdropFilter: "blur(20px)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Termos e Privacidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/70">Conteúdo em breve.</p>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
