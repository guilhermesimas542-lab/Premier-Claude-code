import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sparkles,
  MessageSquare,
  Radio,
  Coins,
  ArrowRight,
  ArrowLeft,
  Zap,
  ExternalLink,
  Target,
} from "lucide-react";
import iaTipsterCartoon from "@/assets/ia-tipster-cartoon.png";

interface Props {
  open: boolean;
  /** Chamado ao final do step 4 (após o lead clicar "Começar agora"). */
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

/**
 * Modal de onboarding em 4 steps — funil COMPLETO em popup (sem sidebar).
 *
 * Steps:
 *   1. Boas-vindas (apresentação da feature)
 *   2. Como usar (3 passos: escolher jogo → gerar análise → apostar)
 *   3. Créditos (semanal, pacotes, ilimitado)
 *   4. Próxima etapa (aviso "vamos criar sua primeira análise")
 *
 * Aparece UMA VEZ. Sem botão X — o lead só sai clicando "Começar agora".
 */
export function IATipsterOnboardingModal({ open, onComplete }: Props) {
  const [step, setStep] = useState(1);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <Dialog open={open} onOpenChange={() => { /* sem fechar por fora */ }}>
      <DialogContent
        className="bg-[#112236] border-[#eac064]/40 text-white w-[96vw] max-w-md p-0 rounded-2xl overflow-hidden [&>button]:hidden max-h-[92vh] overflow-y-auto"
      >
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {step === 1 && <StepWelcome />}
        {step === 2 && <StepHowToUse />}
        {step === 3 && <StepCredits />}
        {step === 4 && <StepFinal />}

        <NavBar
          step={step}
          total={TOTAL_STEPS}
          onPrev={goPrev}
          onNext={goNext}
          onComplete={onComplete}
        />
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Indicador de progresso (4 dots no topo)
// ============================================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-5 pb-1">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const active = idx === current;
        const done = idx < current;
        return (
          <span
            key={idx}
            className="rounded-full transition-all duration-300"
            style={{
              width: active ? 22 : 6,
              height: 6,
              background: active
                ? "#eac064"
                : done
                  ? "rgba(234, 192, 100,0.55)"
                  : "rgba(255,255,255,0.2)",
            }}
          />
        );
      })}
      <span
        className="text-[10px] text-white/45 ml-2 uppercase tracking-wider"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Passo {current} de {total}
      </span>
    </div>
  );
}

// ============================================================
// STEP 1 — Boas-vindas
// ============================================================

function StepWelcome() {
  return (
    <div className="px-6 pt-3 pb-2">
      <div
        className="relative pt-4 pb-4 text-center"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(234, 192, 100,0.18) 0%, rgba(17,34,54,0) 60%)",
        }}
      >
        <Badge label="Nova feature" />

        <div
          className="mx-auto mb-3 mt-3"
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#0a1628",
            border: "2px solid rgba(234, 192, 100,0.4)",
            boxShadow: "0 0 24px rgba(234, 192, 100,0.18)",
          }}
        >
          <img
            src={iaTipsterCartoon}
            alt="IA Tipster"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <h2
          className="text-2xl font-bold leading-tight mb-1"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Conheça a <span style={{ color: "#eac064" }}>IA Tipster</span>
        </h2>
        <p className="text-sm text-white/65 max-w-xs mx-auto">
          Agora você cria suas próprias análises de IA pra qualquer jogo.
        </p>
      </div>

      <div className="space-y-2.5 mt-3">
        <Bullet
          icon={<MessageSquare className="w-4 h-4 text-[#eac064]" />}
          title="Chat com a IA"
          text="Digite os times e receba análise completa em segundos."
        />
        <Bullet
          icon={<Radio className="w-4 h-4 text-[#eac064]" />}
          title="Jogos ao vivo"
          text="Escolha uma partida rolando e a IA analisa em tempo real."
        />
        <Bullet
          icon={<Coins className="w-4 h-4 text-[#eac064]" />}
          title="Sistema de créditos"
          text="Você ganha créditos semanais e pode comprar mais quando precisar."
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 2 — Como usar (3 passos)
// ============================================================

function StepHowToUse() {
  return (
    <div className="px-6 pt-2 pb-2">
      <Header
        icon={<Zap className="w-6 h-6 text-[#eac064]" />}
        title="Como usar em 3 passos"
        subtitle="Fluxo simples — da escolha do jogo até apostar na Esportiva Bet."
      />

      <div className="space-y-2.5 mt-1">
        <StepCard
          number={1}
          icon={<MessageSquare className="w-4 h-4" />}
          title="Escolha o jogo"
          text="No Chat, digite os times (ex: 'Flamengo x Palmeiras'). No Ao Vivo, escolha um jogo da lista."
        />
        <StepCard
          number={2}
          icon={<Sparkles className="w-4 h-4" />}
          title="Gere a análise"
          text="A IA estuda forma, histórico, lesões e estatísticas em segundos. Cada análise consome 1 crédito."
        />
        <StepCard
          number={3}
          icon={<ExternalLink className="w-4 h-4" />}
          title="Aposte na Esportiva Bet"
          text="Com a análise em mãos, abre direto o evento na Esportiva Bet pra montar sua aposta."
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 3 — Créditos
// ============================================================

function StepCredits() {
  return (
    <div className="px-6 pt-2 pb-2">
      <Header
        icon={<Coins className="w-6 h-6 text-[#eac064]" />}
        title="Como funcionam os créditos"
        subtitle="Você sempre tem como gerar análise — grátis ou comprando mais quando precisar."
      />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <CreditRow
          label="Cota semanal"
          text="Você recebe créditos toda semana de acordo com seu plano. Reset toda segunda."
          valueLabel="Grátis"
          valueColor="#eac064"
        />
        <CreditRow
          label="Pacotes extras"
          text="Comprou? Vira saldo permanente. Usa quando quiser, não expira."
          valueLabel="A partir de R$ 29,90"
          valueColor="#FACC15"
        />
        <CreditRow
          label="Acesso ilimitado"
          text="Análises sem contar créditos por 1 ou 3 meses. Pra quem usa muito."
          valueLabel="A partir de R$ 99,00"
          valueColor="#eac064"
        />
      </div>
    </div>
  );
}

// ============================================================
// STEP 4 — Próxima etapa: aviso + CTA final
// ============================================================

function StepFinal() {
  return (
    <div className="px-6 pt-2 pb-2 text-center">
      <div
        className="mx-auto mb-4 mt-2"
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(234, 192, 100,0.12)",
          border: "2px solid rgba(234, 192, 100,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 28px rgba(234, 192, 100,0.25)",
        }}
      >
        <Target className="w-7 h-7 text-[#eac064]" />
      </div>

      <h2
        className="text-2xl font-bold leading-tight mb-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Vamos criar sua <span style={{ color: "#eac064" }}>primeira análise</span>
      </h2>
      <p className="text-sm text-white/70 max-w-sm mx-auto mb-5 leading-relaxed">
        No próximo passo, você vai pra tela do IA Tipster pra montar sua{" "}
        <strong className="text-white">primeira odd com IA</strong>. É rápido — escolhe um jogo, gera a análise e tá pronto.
      </p>

      <div
        className="rounded-xl px-4 py-3 mb-4 text-left"
        style={{
          background: "rgba(234, 192, 100,0.06)",
          border: "1px solid rgba(234, 192, 100,0.25)",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-wider mb-1 font-bold"
          style={{ color: "#eac064", fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          O que vai acontecer
        </p>
        <ul className="text-xs text-white/80 space-y-1.5 leading-snug">
          <li className="flex gap-2">
            <span className="text-[#eac064] font-bold">1.</span>
            Vamos abrir a tela do IA Tipster
          </li>
          <li className="flex gap-2">
            <span className="text-[#eac064] font-bold">2.</span>
            Você escolhe um jogo (Ao Vivo ou Chat)
          </li>
          <li className="flex gap-2">
            <span className="text-[#eac064] font-bold">3.</span>
            A IA gera sua análise em segundos — 1 crédito é descontado
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// Barra inferior: voltar / próximo / começar
// ============================================================

function NavBar({
  step,
  total,
  onPrev,
  onNext,
  onComplete,
}: {
  step: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
}) {
  const isFirst = step === 1;
  const isLast = step === total;

  return (
    <div className="px-6 pb-6 pt-2 flex gap-2 sticky bottom-0 bg-[#112236]">
      {!isFirst && (
        <button
          onClick={onPrev}
          className="px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#FFFFFF",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      )}

      <button
        onClick={isLast ? onComplete : onNext}
        className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99]"
        style={{
          background: "#eac064",
          color: "#FFFFFF",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: "0.6px",
          textTransform: "uppercase",
          border: "none",
          boxShadow: "0 0 24px rgba(234, 192, 100,0.3)",
        }}
      >
        {isLast ? (
          <>
            <Zap className="w-4 h-4" />
            Começar agora
          </>
        ) : (
          <>
            Próximo
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Subcomponentes visuais
// ============================================================

function Badge({ label }: { label: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5"
      style={{
        padding: "5px 12px",
        borderRadius: "999px",
        background: "rgba(234, 192, 100,0.12)",
        border: "1.5px solid rgba(234, 192, 100,0.45)",
      }}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#eac064]" />
      <span
        className="text-[10px] font-bold uppercase tracking-wider text-[#eac064]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1.5px" }}
      >
        {label}
      </span>
    </div>
  );
}

function Header({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-4 pt-2">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#eac064]/10 border border-[#eac064]/25 mb-2">
        {icon}
      </div>
      <h2
        className="text-xl font-bold mb-1"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {title}
      </h2>
      <p className="text-xs text-white/55 max-w-sm mx-auto leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function Bullet({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[#eac064]/10 border border-[#eac064]/25 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className="text-sm font-bold text-white mb-0.5"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title}
        </h4>
        <p className="text-[11px] text-white/55 leading-snug">{text}</p>
      </div>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[#eac064] text-[#0a1628] flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 text-white">
          {icon}
          <h4
            className="text-sm font-bold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {title}
          </h4>
        </div>
        <p className="text-[11px] text-white/55 leading-snug">{text}</p>
      </div>
    </div>
  );
}

function CreditRow({
  label,
  text,
  valueLabel,
  valueColor,
}: {
  label: string;
  text: string;
  valueLabel: string;
  valueColor: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
        <h4
          className="text-sm font-bold text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {label}
        </h4>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: valueColor }}
        >
          {valueLabel}
        </span>
      </div>
      <p className="text-[11px] text-white/55 leading-snug">{text}</p>
    </div>
  );
}
