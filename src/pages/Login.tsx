import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { mockLogin } from "@/mocks/user";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { Crown, Loader2, Users } from "lucide-react";
import logoImg from "@/assets/premier-logo.png";
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
    <div className="min-h-screen bg-[#120A1F] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo outside card */}
      <img
        src={logoImg}
        alt="Premier Ultra"
        className="h-14 w-auto brightness-0 invert opacity-90 mb-8"
      />

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#1C102E] rounded-2xl p-6">
        {/* Headline */}
        <h1 className="text-2xl font-bold text-white text-center leading-tight mb-6">
          Análise de futebol por IA.
        </h1>

        {/* Benefits */}
        <ul className="space-y-3 mb-6">
          <li className="flex items-center gap-3 text-white/90">
            <span className="text-base shrink-0">✅</span>
            <span className="text-base font-medium">Entradas prontas para você usar.</span>
          </li>
          <li className="flex items-center gap-3 text-white/90">
            <span className="text-base shrink-0">📈</span>
            <span className="text-base font-medium">Análises atualizadas diariamente.</span>
          </li>
          <li className="flex items-center gap-3 text-white/90">
            <span className="text-base shrink-0">🎯</span>
            <span className="text-base font-medium">Alto índice de assertividade.</span>
          </li>
        </ul>

        {/* Divider */}
        <div className="border-t border-[#3A2F4B]/50 my-6" />

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-white/70">
              Digite seu e-mail
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
              className={`w-full h-[52px] rounded-lg px-4 text-base text-white placeholder:text-white/30 bg-[#2C1A47] border outline-none transition-colors ${
                emailError
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#2C1A47] focus:border-[#00FF7F]"
              } disabled:opacity-50`}
            />
            {emailError && (
              <p className="text-sm text-red-400">{emailError}</p>
            )}
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 py-2">
            <Users className="w-4 h-4 text-[#A89EB5]" />
            <span className="text-sm font-medium text-[#A89EB5]">
              Mais de 50.000 clientes confiam
            </span>
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full h-14 rounded-xl bg-[#00FF7F] text-black text-base font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Continuar"
            )}
          </button>
        </form>
      </div>

      {/* Footer links outside card */}
      <div className="mt-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-white/35">
          <button
            onClick={() => setShowTermsModal(true)}
            className="hover:text-white/60 transition-colors"
          >
            Termos e Privacidade
          </button>
          <span>|</span>
          <a href="/support" className="hover:text-white/60 transition-colors">
            Suporte
          </a>
        </div>
        <p className="text-[10px] text-white/25">18+ • Jogue com responsabilidade.</p>
      </div>

      {/* Acquire Modal */}
      <Dialog open={showAcquireModal} onOpenChange={setShowAcquireModal}>
        <DialogContent className="bg-[#1C102E] border-[#3A2F4B]/50 max-w-sm">
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
              className="w-full h-12 rounded-xl bg-[#00FF7F] text-black font-bold text-sm hover:brightness-110 transition-all"
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
        <DialogContent className="bg-[#1C102E] border-[#3A2F4B]/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold">Termos e Privacidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/70">Conteúdo em breve.</p>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
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
