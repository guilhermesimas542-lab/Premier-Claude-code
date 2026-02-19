import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mockLogin } from "@/mocks/user";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { Copy, RefreshCw, Target, Crown, Loader2, ShoppingCart, Users } from "lucide-react";
import logo from "@/assets/premier-logo-new.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Matrix rain canvas component
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01010110100111".split("");
    const fontSize = 14;
    const cols = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        // Leading char brighter
        const y = drops[i] * fontSize;
        if (drops[i] * fontSize === y) {
          ctx.fillStyle = "#00FF00";
          ctx.shadowColor = "#00FF00";
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(0, ${Math.floor(Math.random() * 80 + 120)}, 0, ${Math.random() * 0.5 + 0.3})`;
          ctx.shadowBlur = 0;
        }
        ctx.fillText(char, i * fontSize, y);
        ctx.shadowBlur = 0;

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", interval as any);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        opacity: 0.18,
        pointerEvents: "none",
      }}
    />
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showAcquireModal, setShowAcquireModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();
  const { subscribe } = usePushNotifications();

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
    try {
      const { data: isAdminEmail } = await (supabase.rpc as any)("check_is_admin_email", {
        p_email: email.toLowerCase().trim(),
      });

      if (isAdminEmail) {
        navigate("/admin/verify", { state: { email: email.toLowerCase().trim() } });
      } else {
        mockLogin(email);
        toast.success("Login realizado com sucesso!");
        navigate("/", { replace: true });

        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();
          if (userData?.id) {
            subscribe(userData.id);
          }
        } catch {
          // Silently ignore push subscription errors
        }
      }
    } catch (err) {
      mockLogin(email);
      toast.success("Login realizado com sucesso!");
      navigate("/", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcquireAccess = () => {
    window.open(CHECKOUT_LINKS.paywall_default, "_blank");
    setShowAcquireModal(false);
  };

  const isDisabled = !email.trim() || isLoading;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#000000" }}>
      {/* Matrix Rain Canvas */}
      <MatrixRain />

      {/* Radial vignette to improve card readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 100%)",
        }}
      />

      {/* Content */}
      <main
        className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full max-w-md mx-auto"
        style={{ zIndex: 2 }}
      >
        {/* Logo with green glow */}
        <div
          style={{
            filter: "drop-shadow(0 0 18px rgba(0,255,0,0.5)) drop-shadow(0 0 40px rgba(0,200,0,0.25))",
            marginBottom: "2rem",
          }}
        >
          <img
            src={logo}
            alt="Premier Ultra"
            className="h-16 w-auto mx-auto object-contain scale-[9.0]"
          />
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold text-center mb-1"
          style={{
            color: "#00FF00",
            textShadow: "0 0 20px rgba(0,255,0,0.6), 0 0 40px rgba(0,255,0,0.3)",
          }}
        >
          Premier Ultra
        </h1>
        <p
          className="text-center text-sm mb-6"
          style={{ color: "#008800" }}
        >
          Análise de futebol feita por Inteligência Artificial.
        </p>

        {/* Benefit chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { icon: <Copy className="w-4 h-4 shrink-0" />, label: "Entradas prontas" },
            { icon: <RefreshCw className="w-4 h-4 shrink-0" />, label: "Atualizados diariamente" },
            { icon: <Target className="w-4 h-4 shrink-0" />, label: "Alto índice de assertividade" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              role="note"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-full text-[13px] font-medium transition-all active:scale-[0.98]"
              style={{
                background: "rgba(0, 255, 0, 0.05)",
                border: "1px solid rgba(0, 255, 0, 0.35)",
                color: "#00DD00",
              }}
            >
              {icon} {label}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-6 mb-6"
          style={{
            background: "rgba(0, 10, 0, 0.80)",
            border: "1px solid rgba(0, 255, 0, 0.25)",
            boxShadow: "0 0 30px rgba(0,255,0,0.08), inset 0 0 30px rgba(0,255,0,0.03)",
          }}
        >
          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: "#00AA00" }}
              >
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
                className="w-full h-[52px] rounded-xl px-4 text-base outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "rgba(0, 20, 0, 0.7)",
                  border: emailError
                    ? "1px solid #FF4444"
                    : "1px solid rgba(0, 255, 0, 0.3)",
                  color: "#00FF00",
                  caretColor: "#00FF00",
                  boxShadow: emailError
                    ? "0 0 12px rgba(255,68,68,0.2)"
                    : "0 0 0px transparent",
                }}
                onFocus={(e) => {
                  if (!emailError) {
                    e.currentTarget.style.border = "1px solid rgba(0, 255, 0, 0.8)";
                    e.currentTarget.style.boxShadow = "0 0 16px rgba(0, 255, 0, 0.25)";
                  }
                }}
                onBlur={(e) => {
                  if (!emailError) {
                    e.currentTarget.style.border = "1px solid rgba(0, 255, 0, 0.3)";
                    e.currentTarget.style.boxShadow = "0 0 0px transparent";
                  }
                }}
              />
              {/* Placeholder color via style tag */}
              <style>{`
                #email::placeholder { color: rgba(0, 150, 0, 0.5); }
              `}</style>
              {emailError && (
                <p className="text-sm" style={{ color: "#FF4444" }}>{emailError}</p>
              )}
            </div>

            {/* CTA - Acessar aplicativo */}
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full h-14 rounded-xl text-base font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center"
              style={{
                background: isDisabled ? "rgba(0, 180, 0, 0.15)" : "#003300",
                border: "1px solid rgba(0, 255, 0, 0.7)",
                color: "#00FF00",
                textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
                boxShadow: isDisabled ? "none" : "0 0 20px rgba(0, 255, 0, 0.2), inset 0 0 20px rgba(0, 255, 0, 0.05)",
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.background = "#004400";
                  e.currentTarget.style.boxShadow = "0 0 35px rgba(0, 255, 0, 0.4), inset 0 0 25px rgba(0, 255, 0, 0.1)";
                  e.currentTarget.style.borderColor = "#00FF00";
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.background = "#003300";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.2), inset 0 0 20px rgba(0, 255, 0, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(0, 255, 0, 0.7)";
                }
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00FF00" }} />
              ) : (
                "Acessar aplicativo"
              )}
            </button>
          </form>

          {/* Acquire button */}
          <button
            onClick={() => setShowAcquireModal(true)}
            className="w-full h-12 mt-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "transparent",
              border: "1px solid rgba(0, 255, 0, 0.3)",
              color: "#00AA00",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 0, 0.08)";
              e.currentTarget.style.borderColor = "rgba(0, 255, 0, 0.6)";
              e.currentTarget.style.color = "#00DD00";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(0, 255, 0, 0.3)";
              e.currentTarget.style.color = "#00AA00";
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            Adquirir acesso
          </button>

          {/* Subtext */}
          <p
            className="text-center text-xs mt-3"
            style={{ color: "#005500" }}
          >
            Acesso rápido • Sem complicação
          </p>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
            style={{
              border: "1px solid rgba(0, 255, 0, 0.3)",
              background: "rgba(0, 255, 0, 0.05)",
              color: "#00CC00",
            }}
          >
            <Users className="w-4 h-4" /> +50.000 clientes ativos
          </span>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3">
          <p className="text-sm" style={{ color: "#004400" }}>
            Ao continuar, você concorda com nossos{" "}
            <button
              onClick={() => setShowTermsModal(true)}
              className="transition-colors duration-200"
              style={{ color: "#00AA00", textDecoration: "underline", textUnderlineOffset: "2px" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00FF00"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#00AA00"; }}
            >
              Termos e Privacidade
            </button>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              onClick={() => setShowTermsModal(true)}
              className="transition-colors duration-200"
              style={{ color: "#008800" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00FF00"; e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#008800"; e.currentTarget.style.textDecoration = "none"; }}
            >
              Termos e Privacidade
            </button>
            <span style={{ color: "#003300" }}>|</span>
            <a
              href="https://wa.link/1p68qg"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-200"
              style={{ color: "#008800" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00FF00"; e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#008800"; e.currentTarget.style.textDecoration = "none"; }}
            >
              Suporte
            </a>
          </div>
          <p className="text-xs" style={{ color: "#004400" }}>18+ • Jogue com responsabilidade.</p>
        </div>
      </main>

      {/* Acquire Modal */}
      <Dialog open={showAcquireModal} onOpenChange={setShowAcquireModal}>
        <DialogContent
          className="max-w-sm"
          style={{
            background: "rgba(0, 8, 0, 0.97)",
            border: "1px solid rgba(0, 255, 0, 0.3)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 40px rgba(0, 255, 0, 0.1)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: "#00FF00" }}
            >
              <Crown className="w-5 h-5" style={{ color: "#00CC00" }} />
              Acesso Exclusivo Premier Ultra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm" style={{ color: "#008800" }}>
              Você está a um passo de receber as melhores análises por IA. Adquira seu acesso para continuar.
            </p>
            <button
              onClick={handleAcquireAccess}
              className="w-full h-12 rounded-xl font-bold text-sm transition-all duration-200"
              style={{
                background: "#003300",
                border: "1px solid rgba(0, 255, 0, 0.7)",
                color: "#00FF00",
                textShadow: "0 0 10px rgba(0,255,0,0.6)",
                boxShadow: "0 0 20px rgba(0, 255, 0, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#004400";
                e.currentTarget.style.boxShadow = "0 0 35px rgba(0, 255, 0, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#003300";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.2)";
              }}
            >
              Adquirir Acesso Agora
            </button>
            <button
              onClick={() => setShowAcquireModal(false)}
              className="w-full py-2.5 text-sm transition-colors duration-200"
              style={{ color: "#006600" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00AA00"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#006600"; }}
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent
          className="max-w-sm"
          style={{
            background: "rgba(0, 8, 0, 0.97)",
            border: "1px solid rgba(0, 255, 0, 0.3)",
            backdropFilter: "blur(20px)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-lg font-bold"
              style={{ color: "#00FF00" }}
            >
              Termos e Privacidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="text-sm space-y-4 leading-relaxed" style={{ color: "#008800" }}>
              <p className="font-bold" style={{ color: "#00CC00" }}>TERMOS E CONDIÇÕES DE USO — PREMIER ULTRA</p>
              <p>Estes Termos e Condições ("Termos") regulam o acesso e o uso do aplicativo e/ou plataforma Premier Ultra ("Premier", "Aplicativo", "Plataforma").</p>
              <p>Ao acessar, cadastrar-se ou utilizar o Premier, você declara que leu, compreendeu e concorda integralmente com estes Termos e com a nossa Política de Privacidade.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>1. Elegibilidade e Jogo Responsável</p>
              <p>1.1. O Premier é destinado exclusivamente a maiores de 18 (dezoito) anos. Ao utilizar a Plataforma, você declara ser maior de idade e possuir capacidade civil para contratar.</p>
              <p>1.2. O Premier apoia e incentiva o jogo responsável. Apostas envolvem risco e podem causar perdas financeiras. Nunca aposte valores que comprometam seu orçamento e procure ajuda se perceber sinais de compulsão.</p>
              <p>1.3. O usuário é o único responsável por decidir se irá apostar, quanto irá apostar e por qualquer consequência decorrente de apostas realizadas.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>2. O que o Premier é (e o que NÃO é)</p>
              <p>2.1. O Premier é uma plataforma que fornece conteúdo informativo e/ou sugestões estatísticas ("entradas", "análises", "conteúdo") com base em dados, modelos e critérios próprios.</p>
              <p>2.2. O Premier não é: uma casa de apostas; uma instituição financeira; um gestor de investimentos; um intermediador de apostas; um serviço de consultoria financeira individualizada.</p>
              <p>2.3. O Premier não realiza apostas em nome do usuário, não opera contas em casas de apostas e não garante resultados, lucros, retornos, greens, ou qualquer desempenho.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>3. Ausência de Vínculo com Casas de Apostas</p>
              <p>3.1. O Premier não possui controle sobre sites, aplicativos, políticas, regras, limites, odds, mercados, suspensões, mudanças de linhas, liquidações, cancelamentos ou qualquer outra decisão tomada por casas de apostas ("Operadores").</p>
              <p>3.2. O Premier não tem responsabilidade por: saldo, bloqueios, restrições, encerramento de conta; divergências de odds ou mudanças de mercado; falhas de pagamento, saques, depósitos; problemas de autenticação, KYC, verificação de identidade; decisões de liquidação, void, cashout, atraso, cancelamento.</p>
              <p>3.3. Quando houver indicação de Operadores/parceiros, isso não constitui garantia, nem implica responsabilidade solidária do Premier por atos de terceiros.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>4. Cadastro, Acesso e Segurança</p>
              <p>4.1. O acesso ao Premier pode exigir cadastro por e-mail e/ou outros meios. Você se compromete a fornecer informações verdadeiras e atualizadas.</p>
              <p>4.2. Você é responsável por manter a segurança do seu acesso e por todas as atividades realizadas em sua conta.</p>
              <p>4.3. Podemos suspender, bloquear ou cancelar acessos em caso de suspeita de fraude, uso indevido, violação destes Termos ou por exigência legal.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>5. Conteúdo, Atualizações e Disponibilidade</p>
              <p>5.1. O conteúdo pode ser alterado, corrigido, atualizado, removido ou reorganizado a qualquer momento, sem aviso prévio.</p>
              <p>5.2. Não garantimos que o serviço estará disponível ininterruptamente. Podem ocorrer instabilidades por manutenção, falhas técnicas, atualizações, ou fatores externos.</p>
              <p>5.3. O Premier pode incluir recursos de IA e automações. Esses recursos geram probabilidades e estimativas, não certezas.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>6. Pagamentos, Assinaturas, Reembolsos e Cancelamento</p>
              <p>6.1. O acesso a determinados recursos pode exigir pagamento (assinatura, plano, licença ou acesso vitalício, conforme oferta).</p>
              <p>6.2. Condições comerciais (preço, duração, renovação, benefícios) são as informadas no checkout e podem variar.</p>
              <p>6.3. Caso haja garantia legal aplicável (ex.: 7 dias para compras online, conforme o caso), ela será respeitada conforme as regras do meio de pagamento e da legislação.</p>
              <p>6.4. Cancelamentos e reembolsos podem estar sujeitos a: validações antifraude; uso indevido; solicitações duplicadas; chargeback; regras do processador de pagamento.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>7. Limitação de Responsabilidade (Cláusula "Blindagem")</p>
              <p>7.1. Você reconhece e concorda que: apostas podem gerar perdas; odds variam; resultados são imprevisíveis; o conteúdo é informativo e não promessa de ganho.</p>
              <p>7.2. Na máxima extensão permitida pela lei, o Premier e seus sócios, administradores, colaboradores e parceiros não serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, punitivos ou consequenciais, incluindo: perdas financeiras; lucros cessantes; queda de saldo; perda de oportunidades; interrupção de serviço; decisões do usuário em casas de apostas.</p>
              <p>7.3. Se, ainda assim, houver responsabilização judicial, a indenização máxima fica limitada ao valor pago pelo usuário ao Premier nos últimos 3 (três) meses anteriores ao evento, quando aplicável, salvo vedação legal.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>8. Obrigações do Usuário</p>
              <p>8.1. Você se compromete a: usar o Premier de forma lícita; não explorar falhas, burlar sistemas ou acessar dados indevidos; não compartilhar acesso de forma irregular; não revender, redistribuir ou espelhar o conteúdo; respeitar direitos autorais e propriedade intelectual.</p>
              <p>8.2. Proibido: engenharia reversa, scraping, bots, automações abusivas; copiar layout, textos, modelos, entradas, banco de dados; usar a marca Premier sem autorização.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>9. Propriedade Intelectual</p>
              <p>9.1. O Premier, marcas, layouts, textos, banco de dados, modelos, algoritmos, métodos e materiais são de titularidade da Empresa ou licenciados.</p>
              <p>9.2. O uso do App não concede ao usuário qualquer licença além do direito de uso pessoal, revogável, não exclusivo e intransferível.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>10. LGPD e Privacidade</p>
              <p>10.1. Tratamos dados pessoais conforme a legislação aplicável, incluindo a LGPD (Lei nº 13.709/2018).</p>
              <p>10.2. Dados podem ser tratados para: autenticação e segurança; prevenção à fraude; suporte; melhoria do produto; obrigações legais/regulatórias.</p>
              <p>10.3. Para detalhes, consulte a Política de Privacidade.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>11. Medidas Antifraude e Compliance</p>
              <p>11.1. Podemos adotar mecanismos de verificação, limitação de acesso, análise de risco e bloqueio preventivo em caso de suspeita de fraude, múltiplas contas, abuso de promoções, chargeback ou violação destes Termos.</p>
              <p>11.2. Podemos cooperar com autoridades, mediante ordem legal, quando necessário.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>12. Suspensão e Rescisão</p>
              <p>12.1. Podemos suspender ou encerrar o acesso do usuário a qualquer momento em caso de: violação destes Termos; suspeita de fraude; uso indevido; exigência legal.</p>
              <p>12.2. O usuário pode deixar de usar o serviço a qualquer momento, observadas as regras de cancelamento e reembolso do plano contratado.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>13. Alterações dos Termos</p>
              <p>13.1. Podemos modificar estes Termos a qualquer momento. A versão vigente será sempre a disponibilizada na Plataforma.</p>
              <p>13.2. O uso contínuo após atualização significa aceite das alterações.</p>

              <p className="font-bold" style={{ color: "#00CC00" }}>14. Contato e Suporte</p>
              <p>Dúvidas, solicitações e suporte: equipepremierfc@gmail.com</p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-xl text-sm transition-colors duration-200"
              style={{
                background: "rgba(0, 50, 0, 0.3)",
                border: "1px solid rgba(0, 255, 0, 0.2)",
                color: "#008800",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00CC00"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#008800"; }}
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
