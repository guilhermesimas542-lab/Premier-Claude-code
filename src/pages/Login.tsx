import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mockLogin } from "@/mocks/user";
import { storeToken, trackEvent } from "@/lib/events";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { Crown, Loader2, ShoppingCart } from "lucide-react";
import { usePayCardTrigger } from "@/hooks/usePayCardTrigger";
import { useLinks } from "@/contexts/LinksContext";
import { PayCardFunnelModal } from "@/components/PayCardFunnelModal";
import { getTierBadgeStyle } from "@/lib/tierColors";
import logo from "@/assets/premier-logo-new.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LastGreen {
  title: string;
  condition_to_win: string;
  odd: number;
  tier_required: string;
  addon_required: string | null;
  created_at: string;
}

function formatGreenDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return isYesterday ? `ontem · ${hours}:${minutes}` : `${date.getDate()}/${date.getMonth() + 1} · ${hours}:${minutes}`;
}

const useLastGreens = () => {
  const [greens, setGreens] = useState<LastGreen[]>([]);

  useEffect(() => {
    const fetchGreens = async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split("T")[0];

        const { data } = await supabase
          .from("content_entries")
          .select("title, condition_to_win, odd, tier_required, addon_required, created_at")
          .eq("result", "green")
          .eq("date", dateStr)
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          setGreens(
            data.map((d) => ({
              title: d.title,
              condition_to_win: d.condition_to_win ?? "",
              odd: d.odd ?? 0,
              tier_required: d.tier_required ?? "",
              addon_required: d.addon_required ?? null,
              created_at: d.created_at,
            }))
          );
        }
      } catch {
        // silently fail
      }
    };
    fetchGreens();
  }, []);

  return greens;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showAcquireModal, setShowAcquireModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();
  const { subscribe } = usePushNotifications();
  const { triggerPayCard, payCard, open: payCardOpen, closePayCard } = usePayCardTrigger();
  const { links } = useLinks();
  const greens = useLastGreens();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (greens.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % greens.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [greens.length]);

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
        let dbUser: { id?: string; main_tier?: string; betting_house_id?: string | null } = {};
        try {
          const { data: loginData, error: loginError } = await supabase.functions.invoke('auth-login', {
            body: { email: email.toLowerCase().trim() },
          });
          if (!loginError && loginData?.success && loginData?.user) {
            dbUser = {
              id: loginData.user.id,
              main_tier: loginData.user.main_tier,
            };
            if (loginData.token) {
              storeToken(loginData.token);
            }
            if (loginData.show_paywall_popup && loginData.checkout) {
              localStorage.setItem('premier_show_paywall', 'true');
              localStorage.setItem('premier_checkout_url', loginData.checkout);
            }
          }
        } catch (err) {
          console.warn('[Login] auth-login edge function failed, continuing with mock:', err);
        }

        mockLogin(email, dbUser.id, dbUser.main_tier);
        window.dispatchEvent(new CustomEvent('premier:login'));
        trackEvent("user_login");
        toast.success("Login realizado com sucesso!");
        navigate("/", { replace: true });

        try {
          if (dbUser.id) {
            subscribe(dbUser.id);
          }
        } catch {
          // Silently ignore push subscription errors
        }
      }
    } catch (err) {
      console.warn('[Login] outer catch, falling back to mock login:', err);
      mockLogin(email);
      window.dispatchEvent(new CustomEvent('premier:login'));
      toast.success("Login realizado com sucesso!");
      navigate("/", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcquireAccess = async () => {
    const found = await triggerPayCard('basic');
    if (!found) {
      const url = links.acquire_access_url || CHECKOUT_LINKS.paywall_default;
      window.open(url, "_blank");
    }
    setShowAcquireModal(false);
  };

  const isDisabled = !email.trim() || isLoading;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Light trail decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="light-trail-1 absolute rounded-full"
          style={{
            width: "600px",
            height: "200px",
            top: "-40px",
            left: "-100px",
            background: "radial-gradient(ellipse, hsl(155 100% 45% / 0.07) 0%, transparent 70%)",
          }}
        />
        <div
          className="light-trail-2 absolute rounded-full"
          style={{
            width: "500px",
            height: "180px",
            bottom: "100px",
            right: "-80px",
            background: "radial-gradient(ellipse, hsl(155 100% 45% / 0.05) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Content */}
      <main className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12 w-full max-w-md mx-auto" style={{ zIndex: 2 }}>
        {/* Logo — hero element */}
        <div className="mb-10 pointer-events-none">
          <img
            src={logo}
            alt="Premier Ultra"
            className="h-16 w-auto mx-auto object-contain scale-[9.0]"
          />
        </div>

        {/* Last Greens Carousel */}
        {greens.length > 0 && (
          <div className="w-full mb-8">
            {/* Container with overflow hidden for slide animation */}
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                  transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  willChange: 'transform',
                }}
              >
                {greens.map((green, index) => {
                  const color = getTierBadgeStyle(green.tier_required, green.addon_required);
                  return (
                    <div
                      key={index}
                      className="w-full shrink-0"
                      style={{ minWidth: '100%' }}
                    >
                      {/* Card */}
                      <div
                        style={{
                          backgroundColor: '#0D1929',
                          border: '1.5px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        {/* Top: badge | odd */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3">
                          {/* Badge - no date */}
                          <span
                            style={{
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 900,
                              fontSize: '15px',
                              textTransform: 'uppercase',
                              letterSpacing: '1.5px',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              backgroundColor: color.bg,
                              border: `1.5px solid ${color.border}`,
                              color: color.text,
                              display: 'inline-block',
                              lineHeight: 1,
                            }}
                          >
                            {color.label}
                          </span>
                          {/* Odd + retorno */}
                          <div className="flex min-w-[112px] flex-col items-center justify-center text-center">
                            <span
                              style={{
                                fontFamily: 'Barlow Condensed, sans-serif',
                                fontWeight: 900,
                                fontSize: '36px',
                                color: '#00E87A',
                                lineHeight: 1,
                              }}
                            >
                              {Number(green.odd).toFixed(2)}
                            </span>
                            <span
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontWeight: 400,
                                fontSize: '12px',
                                color: '#94A3B8',
                                lineHeight: 1.4,
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {`R$ 100 → R$ ${(100 * Number(green.odd)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            </span>
                          </div>
                        </div>
                        {/* Middle: game and tip */}
                        <div className="px-4 pb-3">
                          <p
                            className="text-white leading-tight"
                            style={{
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '18px',
                            }}
                          >
                            {green.title}
                          </p>
                          <p
                            className="text-white/50 mt-0.5"
                            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}
                          >
                            {green.condition_to_win}
                          </p>
                        </div>
                        {/* Bottom strip: ENTRADA BATEU */}
                        <div
                          className="flex items-center justify-center py-2.5"
                          style={{
                            backgroundColor: 'rgba(0,232,122,0.08)',
                            borderTop: '1px solid rgba(0,232,122,0.15)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'Barlow Condensed, sans-serif',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#00E87A',
                              letterSpacing: '0.06em',
                            }}
                          >
                            ✓ ENTRADA BATEU
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Dots indicator */}
            {greens.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {greens.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: index === currentIndex ? '20px' : '6px',
                      height: '6px',
                      backgroundColor: index === currentIndex ? '#00E87A' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full space-y-3 mb-6">
          <div className="space-y-1.5">
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
              className="w-full h-[52px] rounded-[10px] px-4 text-base font-sans bg-card text-foreground outline-none transition-colors duration-200 disabled:opacity-50 placeholder:text-[#4A5568] focus:border-primary"
              style={{
                border: emailError
                  ? "1.5px solid hsl(var(--destructive))"
                  : "1.5px solid rgba(255,255,255,0.07)",
              }}
              onFocus={(e) => {
                if (!emailError) {
                  e.currentTarget.style.border = "1.5px solid hsl(155,100%,45%)";
                }
              }}
              onBlur={(e) => {
                if (!emailError) {
                  e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.07)";
                }
              }}
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full h-14 rounded-[10px] font-display font-extrabold text-base uppercase tracking-wide bg-primary text-background transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Acessar o Premier"
            )}
          </button>
        </form>

        {/* Secondary CTA */}
        <button
          onClick={() => setShowAcquireModal(true)}
          className="w-full h-12 rounded-[10px] font-display font-bold text-sm uppercase flex items-center justify-center gap-2 transition-colors duration-200 active:scale-[0.98] text-white border-2 border-white/15 bg-transparent hover:border-white/30"
        >
          <ShoppingCart className="w-4 h-4" />
          Adquirir acesso
        </button>

        {/* Social Proof Pills */}
        <div className="flex gap-2 justify-center items-center flex-nowrap mt-8 mb-6">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="text-white/70 whitespace-nowrap font-sans" style={{ fontSize: '12px', fontWeight: 500 }}>+50.000 apostadores</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="text-white/70 whitespace-nowrap font-sans" style={{ fontSize: '12px', fontWeight: 500 }}>+10 entradas por dia</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3">
          <p className="text-sm text-[#4A5568]">
            Ao continuar, você concorda com nossos{" "}
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-primary hover:underline underline-offset-2 transition-colors"
            >
              Termos e Privacidade
            </button>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-[#4A5568] hover:text-primary transition-colors"
            >
              Termos e Privacidade
            </button>
            <span className="text-[#4A5568]/40">|</span>
            <a
              href={links.support_whatsapp_url || "https://wa.link/1p68qg"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4A5568] hover:text-primary transition-colors"
            >
              Suporte
            </a>
          </div>
          <p className="text-xs text-[#4A5568]">18+ • Jogue com responsabilidade.</p>
        </div>
      </main>

      {/* Acquire Modal */}
      <Dialog open={showAcquireModal} onOpenChange={setShowAcquireModal}>
        <DialogContent className="max-w-sm bg-card border border-white/[0.07]" style={{ backdropFilter: "blur(20px)" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold flex items-center gap-2 text-foreground">
              <Crown className="w-5 h-5 text-primary" />
              Acesso Exclusivo Premier Ultra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Você está a um passo de receber as melhores análises por IA. Adquira seu acesso para continuar.
            </p>
            <button
              onClick={handleAcquireAccess}
              className="w-full h-12 rounded-[10px] font-display font-bold text-sm uppercase bg-primary text-background transition-opacity hover:opacity-90"
            >
              Adquirir Acesso Agora
            </button>
            <button
              onClick={() => setShowAcquireModal(false)}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-sm bg-card border border-white/[0.07]" style={{ backdropFilter: "blur(20px)" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-bold text-foreground">
              Termos e Privacidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="text-sm space-y-4 leading-relaxed text-muted-foreground">
              <p className="font-bold text-foreground">TERMOS E CONDIÇÕES DE USO — PREMIER ULTRA</p>
              <p>Estes Termos e Condições ("Termos") regulam o acesso e o uso do aplicativo e/ou plataforma Premier Ultra ("Premier", "Aplicativo", "Plataforma").</p>
              <p>Ao acessar, cadastrar-se ou utilizar o Premier, você declara que leu, compreendeu e concorda integralmente com estes Termos e com a nossa Política de Privacidade.</p>

              <p className="font-bold text-foreground">1. Elegibilidade e Jogo Responsável</p>
              <p>1.1. O Premier é destinado exclusivamente a maiores de 18 (dezoito) anos. Ao utilizar a Plataforma, você declara ser maior de idade e possuir capacidade civil para contratar.</p>
              <p>1.2. O Premier apoia e incentiva o jogo responsável. Apostas envolvem risco e podem causar perdas financeiras. Nunca aposte valores que comprometam seu orçamento e procure ajuda se perceber sinais de compulsão.</p>
              <p>1.3. O usuário é o único responsável por decidir se irá apostar, quanto irá apostar e por qualquer consequência decorrente de apostas realizadas.</p>

              <p className="font-bold text-foreground">2. O que o Premier é (e o que NÃO é)</p>
              <p>2.1. O Premier é uma plataforma que fornece conteúdo informativo e/ou sugestões estatísticas ("entradas", "análises", "conteúdo") com base em dados, modelos e critérios próprios.</p>
              <p>2.2. O Premier não é: uma casa de apostas; uma instituição financeira; um gestor de investimentos; um intermediador de apostas; um serviço de consultoria financeira individualizada.</p>
              <p>2.3. O Premier não realiza apostas em nome do usuário, não opera contas em casas de apostas e não garante resultados, lucros, retornos, greens, ou qualquer desempenho.</p>

              <p className="font-bold text-foreground">3. Ausência de Vínculo com Casas de Apostas</p>
              <p>3.1. O Premier não possui controle sobre sites, aplicativos, políticas, regras, limites, odds, mercados, suspensões, mudanças de linhas, liquidações, cancelamentos ou qualquer outra decisão tomada por casas de apostas ("Operadores").</p>
              <p>3.2. O Premier não tem responsabilidade por: saldo, bloqueios, restrições, encerramento de conta; divergências de odds ou mudanças de mercado; falhas de pagamento, saques, depósitos; problemas de autenticação, KYC, verificação de identidade; decisões de liquidação, void, cashout, atraso, cancelamento.</p>
              <p>3.3. Quando houver indicação de Operadores/parceiros, isso não constitui garantia, nem implica responsabilidade solidária do Premier por atos de terceiros.</p>

              <p className="font-bold text-foreground">4. Cadastro, Acesso e Segurança</p>
              <p>4.1. O acesso ao Premier pode exigir cadastro por e-mail e/ou outros meios. Você se compromete a fornecer informações verdadeiras e atualizadas.</p>
              <p>4.2. Você é responsável por manter a segurança do seu acesso e por todas as atividades realizadas em sua conta.</p>
              <p>4.3. Podemos suspender, bloquear ou cancelar acessos em caso de suspeita de fraude, uso indevido, violação destes Termos ou por exigência legal.</p>

              <p className="font-bold text-foreground">5. Conteúdo, Atualizações e Disponibilidade</p>
              <p>5.1. O conteúdo pode ser alterado, corrigido, atualizado, removido ou reorganizado a qualquer momento, sem aviso prévio.</p>
              <p>5.2. Não garantimos que o serviço estará disponível ininterruptamente. Podem ocorrer instabilidades por manutenção, falhas técnicas, atualizações, ou fatores externos.</p>
              <p>5.3. O Premier pode incluir recursos de IA e automações. Esses recursos geram probabilidades e estimativas, não certezas.</p>

              <p className="font-bold text-foreground">6. Pagamentos, Assinaturas, Reembolsos e Cancelamento</p>
              <p>6.1. O acesso a determinados recursos pode exigir pagamento (assinatura, plano, licença ou acesso vitalício, conforme oferta).</p>
              <p>6.2. Condições comerciais (preço, duração, renovação, benefícios) são as informadas no checkout e podem variar.</p>
              <p>6.3. Caso haja garantia legal aplicável (ex.: 7 dias para compras online, conforme o caso), ela será respeitada conforme as regras do meio de pagamento e da legislação.</p>
              <p>6.4. Cancelamentos e reembolsos podem estar sujeitos a: validações antifraude; uso indevido; solicitações duplicadas; chargeback; regras do processador de pagamento.</p>

              <p className="font-bold text-foreground">7. Limitação de Responsabilidade (Cláusula "Blindagem")</p>
              <p>7.1. Você reconhece e concorda que: apostas podem gerar perdas; odds variam; resultados são imprevisíveis; o conteúdo é informativo e não promessa de ganho.</p>
              <p>7.2. Na máxima extensão permitida pela lei, o Premier e seus sócios, administradores, colaboradores e parceiros não serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, punitivos ou consequenciais, incluindo: perdas financeiras; lucros cessantes; queda de saldo; perda de oportunidades; interrupção de serviço; decisões do usuário em casas de apostas.</p>
              <p>7.3. Se, ainda assim, houver responsabilização judicial, a indenização máxima fica limitada ao valor pago pelo usuário ao Premier nos últimos 3 (três) meses anteriores ao evento, quando aplicável, salvo vedação legal.</p>

              <p className="font-bold text-foreground">8. Obrigações do Usuário</p>
              <p>8.1. Você se compromete a: usar o Premier de forma lícita; não explorar falhas, burlar sistemas ou acessar dados indevidos; não compartilhar acesso de forma irregular; não revender, redistribuir ou espelhar o conteúdo; respeitar direitos autorais e propriedade intelectual.</p>
              <p>8.2. Proibido: engenharia reversa, scraping, bots, automações abusivas; copiar layout, textos, modelos, entradas, banco de dados; usar a marca Premier sem autorização.</p>

              <p className="font-bold text-foreground">9. Propriedade Intelectual</p>
              <p>9.1. O Premier, marcas, layouts, textos, banco de dados, modelos, algoritmos, métodos e materiais são de titularidade da Empresa ou licenciados.</p>
              <p>9.2. O uso do App não concede ao usuário qualquer licença além do direito de uso pessoal, revogável, não exclusivo e intransferível.</p>

              <p className="font-bold text-foreground">10. LGPD e Privacidade</p>
              <p>10.1. Tratamos dados pessoais conforme a legislação aplicável, incluindo a LGPD (Lei nº 13.709/2018).</p>
              <p>10.2. Dados podem ser tratados para: autenticação e segurança; prevenção à fraude; suporte; melhoria do produto; obrigações legais/regulatórias.</p>
              <p>10.3. Para detalhes, consulte a Política de Privacidade.</p>

              <p className="font-bold text-foreground">11. Medidas Antifraude e Compliance</p>
              <p>11.1. Podemos adotar mecanismos de verificação, limitação de acesso, análise de risco e bloqueio preventivo em caso de suspeita de fraude, múltiplas contas, abuso de promoções, chargeback ou violação destes Termos.</p>
              <p>11.2. Podemos cooperar com autoridades, mediante ordem legal, quando necessário.</p>

              <p className="font-bold text-foreground">12. Suspensão e Rescisão</p>
              <p>12.1. Podemos suspender ou encerrar o acesso do usuário a qualquer momento em caso de: violação destes Termos; suspeita de fraude; uso indevido; exigência legal.</p>
              <p>12.2. O usuário pode deixar de usar o serviço a qualquer momento, observadas as regras de cancelamento e reembolso do plano contratado.</p>

              <p className="font-bold text-foreground">13. Alterações dos Termos</p>
              <p>13.1. Podemos modificar estes Termos a qualquer momento. A versão vigente será sempre a disponibilizada na Plataforma.</p>
              <p>13.2. O uso contínuo após atualização significa aceite das alterações.</p>

              <p className="font-bold text-foreground">14. Contato e Suporte</p>
              <p>Dúvidas, solicitações e suporte: equipepremierfc@gmail.com</p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 rounded-[10px] text-sm text-muted-foreground border border-white/[0.07] hover:text-foreground transition-colors"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {payCard && (
        <PayCardFunnelModal
          payCard={payCard}
          open={payCardOpen}
          onClose={closePayCard}
        />
      )}
    </div>
  );
};

export default Login;
