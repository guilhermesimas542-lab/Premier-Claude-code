import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { mockLogin } from "@/mocks/user";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { Crown, Loader2, ShoppingCart, Sparkles, Users } from "lucide-react";
import logo from "@/assets/premier-logo-new.png";
import BackgroundLightTrail from "@/components/BackgroundLightTrail";
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Layer 1: Aurora background (z-0) */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#1A0E2E]" />
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 20%, #4A1F6F 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 70% 80%, #1F3A6F 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 50% 50%, #2E1A47 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40 animate-pulse"
          style={{
            animationDuration: "8s",
            background:
              "radial-gradient(ellipse 60% 40% at 60% 30%, rgba(74, 31, 111, 0.5) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Light Trail Effect (inline) */}
      <style>{`
        @keyframes trailA {
          0%   { transform: translate3d(-20%, -10%, 0) rotate(0deg); }
          50%  { transform: translate3d(10%, 12%, 0) rotate(12deg); }
          100% { transform: translate3d(-20%, -10%, 0) rotate(0deg); }
        }
        @keyframes trailB {
          0%   { transform: translate3d(15%, 20%, 0) rotate(0deg); }
          50%  { transform: translate3d(-10%, -8%, 0) rotate(-10deg); }
          100% { transform: translate3d(15%, 20%, 0) rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .trailA, .trailB { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {/* Trail A - lilac */}
        <div
          className="trailA"
          style={{
            position: "absolute",
            width: "70%",
            height: "220px",
            top: "15%",
            left: "-10%",
            background: "radial-gradient(ellipse at center, rgba(180,150,255,0.45) 0%, rgba(140,100,255,0.12) 40%, transparent 70%)",
            filter: "blur(28px)",
            borderRadius: "50%",
            animation: "trailA 12s ease-in-out infinite",
            willChange: "transform",
          }}
        />
        {/* Trail B - white */}
        <div
          className="trailB"
          style={{
            position: "absolute",
            width: "55%",
            height: "180px",
            bottom: "18%",
            right: "-8%",
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, rgba(200,180,255,0.08) 40%, transparent 70%)",
            filter: "blur(28px)",
            borderRadius: "50%",
            animation: "trailB 14s ease-in-out infinite",
            willChange: "transform",
          }}
        />
      </div>

      {/* Layer 3: Content (z-20) */}
      <main className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full max-w-md mx-auto" style={{ zIndex: 20 }}>
        {/* Logo */}
        <img src={logo} alt="Premier Ultra" className="h-16 w-auto mx-auto mb-8 object-contain scale-[9.0]" />

        {/* Title */}
        <h1 className="text-2xl font-bold text-white text-center mb-1">Premier Ultra</h1>
        <p className="text-white/70 text-center text-sm mb-6">
          Análise de futebol feita por Inteligência Artificial.
        </p>

        {/* Benefit chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-white/80 text-xs">
            <Sparkles className="w-3 h-3" /> Entradas prontas
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-white/80 text-xs">
            <Sparkles className="w-3 h-3" /> Atualizados diariamente
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-white/80 text-xs">
            <Sparkles className="w-3 h-3" /> Alto índice de assertividade
          </span>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-6 mb-6"
          style={{
            background: "rgba(28, 16, 46, 0.85)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
        >
          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-white/80 font-medium">
                E-mail
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
                className={`w-full h-[52px] rounded-xl px-4 text-base text-white placeholder:text-white/30 outline-none transition-colors disabled:opacity-50 bg-[#2C1A47] ${
                  emailError
                    ? "border border-red-500 focus:border-red-500"
                    : "border border-purple-500/20 focus:border-[#00FF7F]"
                }`}
              />
              {emailError && (
                <p className="text-sm text-red-400">{emailError}</p>
              )}
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full h-14 rounded-xl text-white text-base font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] flex items-center justify-center bg-[#7C3AED] hover:bg-[#6D28D9]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Acessar aplicativo"
              )}
            </button>
          </form>

          {/* Acquire button */}
          <button
            onClick={() => setShowAcquireModal(true)}
            className="w-full h-12 mt-3 rounded-xl border border-purple-500/30 bg-transparent text-white/80 text-sm font-medium flex items-center justify-center gap-2 hover:bg-purple-500/10 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Adquirir acesso
          </button>

          {/* Subtext */}
          <p className="text-center text-white/40 text-xs mt-3">
            Acesso rápido • Sem complicação
          </p>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-white/80 text-sm">
            <Users className="w-4 h-4" /> +50.000 clientes ativos
          </span>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3">
          <p className="text-sm text-white/50">
            Ao continuar, você concorda com nossos{" "}
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors"
            >
              Termos e Privacidade
            </button>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Termos e Privacidade
            </button>
            <span className="text-white/20">|</span>
            <a href="/support" className="text-purple-400 hover:text-purple-300 transition-colors">
              Suporte
            </a>
          </div>
          <p className="text-xs text-white/30">18+ • Jogue com responsabilidade.</p>
        </div>
      </main>

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
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="text-sm text-white/70 space-y-4 leading-relaxed">
              <p className="font-bold text-white">TERMOS E CONDIÇÕES DE USO — PREMIER ULTRA</p>
              <p>Estes Termos e Condições ("Termos") regulam o acesso e o uso do aplicativo e/ou plataforma Premier Ultra ("Premier", "Aplicativo", "Plataforma").</p>
              <p>Ao acessar, cadastrar-se ou utilizar o Premier, você declara que leu, compreendeu e concorda integralmente com estes Termos e com a nossa Política de Privacidade.</p>

              <p className="font-bold text-white">1. Elegibilidade e Jogo Responsável</p>
              <p>1.1. O Premier é destinado exclusivamente a maiores de 18 (dezoito) anos. Ao utilizar a Plataforma, você declara ser maior de idade e possuir capacidade civil para contratar.</p>
              <p>1.2. O Premier apoia e incentiva o jogo responsável. Apostas envolvem risco e podem causar perdas financeiras. Nunca aposte valores que comprometam seu orçamento e procure ajuda se perceber sinais de compulsão.</p>
              <p>1.3. O usuário é o único responsável por decidir se irá apostar, quanto irá apostar e por qualquer consequência decorrente de apostas realizadas.</p>

              <p className="font-bold text-white">2. O que o Premier é (e o que NÃO é)</p>
              <p>2.1. O Premier é uma plataforma que fornece conteúdo informativo e/ou sugestões estatísticas ("entradas", "análises", "conteúdo") com base em dados, modelos e critérios próprios.</p>
              <p>2.2. O Premier não é: uma casa de apostas; uma instituição financeira; um gestor de investimentos; um intermediador de apostas; um serviço de consultoria financeira individualizada.</p>
              <p>2.3. O Premier não realiza apostas em nome do usuário, não opera contas em casas de apostas e não garante resultados, lucros, retornos, greens, ou qualquer desempenho.</p>

              <p className="font-bold text-white">3. Ausência de Vínculo com Casas de Apostas</p>
              <p>3.1. O Premier não possui controle sobre sites, aplicativos, políticas, regras, limites, odds, mercados, suspensões, mudanças de linhas, liquidações, cancelamentos ou qualquer outra decisão tomada por casas de apostas ("Operadores").</p>
              <p>3.2. O Premier não tem responsabilidade por: saldo, bloqueios, restrições, encerramento de conta; divergências de odds ou mudanças de mercado; falhas de pagamento, saques, depósitos; problemas de autenticação, KYC, verificação de identidade; decisões de liquidação, void, cashout, atraso, cancelamento.</p>
              <p>3.3. Quando houver indicação de Operadores/parceiros, isso não constitui garantia, nem implica responsabilidade solidária do Premier por atos de terceiros.</p>

              <p className="font-bold text-white">4. Cadastro, Acesso e Segurança</p>
              <p>4.1. O acesso ao Premier pode exigir cadastro por e-mail e/ou outros meios. Você se compromete a fornecer informações verdadeiras e atualizadas.</p>
              <p>4.2. Você é responsável por manter a segurança do seu acesso e por todas as atividades realizadas em sua conta.</p>
              <p>4.3. Podemos suspender, bloquear ou cancelar acessos em caso de suspeita de fraude, uso indevido, violação destes Termos ou por exigência legal.</p>

              <p className="font-bold text-white">5. Conteúdo, Atualizações e Disponibilidade</p>
              <p>5.1. O conteúdo pode ser alterado, corrigido, atualizado, removido ou reorganizado a qualquer momento, sem aviso prévio.</p>
              <p>5.2. Não garantimos que o serviço estará disponível ininterruptamente. Podem ocorrer instabilidades por manutenção, falhas técnicas, atualizações, ou fatores externos.</p>
              <p>5.3. O Premier pode incluir recursos de IA e automações. Esses recursos geram probabilidades e estimativas, não certezas.</p>

              <p className="font-bold text-white">6. Pagamentos, Assinaturas, Reembolsos e Cancelamento</p>
              <p>6.1. O acesso a determinados recursos pode exigir pagamento (assinatura, plano, licença ou acesso vitalício, conforme oferta).</p>
              <p>6.2. Condições comerciais (preço, duração, renovação, benefícios) são as informadas no checkout e podem variar.</p>
              <p>6.3. Caso haja garantia legal aplicável (ex.: 7 dias para compras online, conforme o caso), ela será respeitada conforme as regras do meio de pagamento e da legislação.</p>
              <p>6.4. Cancelamentos e reembolsos podem estar sujeitos a: validações antifraude; uso indevido; solicitações duplicadas; chargeback; regras do processador de pagamento.</p>

              <p className="font-bold text-white">7. Limitação de Responsabilidade (Cláusula "Blindagem")</p>
              <p>7.1. Você reconhece e concorda que: apostas podem gerar perdas; odds variam; resultados são imprevisíveis; o conteúdo é informativo e não promessa de ganho.</p>
              <p>7.2. Na máxima extensão permitida pela lei, o Premier e seus sócios, administradores, colaboradores e parceiros não serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, punitivos ou consequenciais, incluindo: perdas financeiras; lucros cessantes; queda de saldo; perda de oportunidades; interrupção de serviço; decisões do usuário em casas de apostas.</p>
              <p>7.3. Se, ainda assim, houver responsabilização judicial, a indenização máxima fica limitada ao valor pago pelo usuário ao Premier nos últimos 3 (três) meses anteriores ao evento, quando aplicável, salvo vedação legal.</p>

              <p className="font-bold text-white">8. Obrigações do Usuário</p>
              <p>8.1. Você se compromete a: usar o Premier de forma lícita; não explorar falhas, burlar sistemas ou acessar dados indevidos; não compartilhar acesso de forma irregular; não revender, redistribuir ou espelhar o conteúdo; respeitar direitos autorais e propriedade intelectual.</p>
              <p>8.2. Proibido: engenharia reversa, scraping, bots, automações abusivas; copiar layout, textos, modelos, entradas, banco de dados; usar a marca Premier sem autorização.</p>

              <p className="font-bold text-white">9. Propriedade Intelectual</p>
              <p>9.1. O Premier, marcas, layouts, textos, banco de dados, modelos, algoritmos, métodos e materiais são de titularidade da Empresa ou licenciados.</p>
              <p>9.2. O uso do App não concede ao usuário qualquer licença além do direito de uso pessoal, revogável, não exclusivo e intransferível.</p>

              <p className="font-bold text-white">10. LGPD e Privacidade</p>
              <p>10.1. Tratamos dados pessoais conforme a legislação aplicável, incluindo a LGPD (Lei nº 13.709/2018).</p>
              <p>10.2. Dados podem ser tratados para: autenticação e segurança; prevenção à fraude; suporte; melhoria do produto; obrigações legais/regulatórias.</p>
              <p>10.3. Para detalhes, consulte a Política de Privacidade.</p>

              <p className="font-bold text-white">11. Medidas Antifraude e Compliance</p>
              <p>11.1. Podemos adotar mecanismos de verificação, limitação de acesso, análise de risco e bloqueio preventivo em caso de suspeita de fraude, múltiplas contas, abuso de promoções, chargeback ou violação destes Termos.</p>
              <p>11.2. Podemos cooperar com autoridades, mediante ordem legal, quando necessário.</p>

              <p className="font-bold text-white">12. Suspensão e Rescisão</p>
              <p>12.1. Podemos suspender ou encerrar o acesso do usuário a qualquer momento em caso de: violação destes Termos; suspeita de fraude; uso indevido; exigência legal.</p>
              <p>12.2. O usuário pode deixar de usar o serviço a qualquer momento, observadas as regras de cancelamento e reembolso do plano contratado.</p>

              <p className="font-bold text-white">13. Alterações dos Termos</p>
              <p>13.1. Podemos modificar estes Termos a qualquer momento. A versão vigente será sempre a disponibilizada na Plataforma.</p>
              <p>13.2. O uso contínuo após atualização significa aceite das alterações.</p>

              <p className="font-bold text-white">14. Contato e Suporte</p>
              <p>Dúvidas, solicitações e suporte: equipepremierfc@gmail.com</p>
            </div>
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
