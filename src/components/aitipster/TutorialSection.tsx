import { useState } from "react";
import {
  Sparkles,
  MessageSquare,
  Radio,
  Coins,
  Infinity as InfinityIcon,
  Zap,
  ThumbsUp,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface TutorialSectionProps {
  /**
   * Quando o usuário clica "Testar agora!" no fim do tutorial.
   * Marca o tutorial como visto e leva o user pra tab "Ao Vivo" pra fazer
   * a primeira análise (que finalmente libera o Chat).
   */
  onTestNow?: () => void;
  /** Se true, o tutorial já foi concluído — esconde os CTAs de onboarding. */
  completed?: boolean;
}

/**
 * Tutorial da IA Tipster em 2 etapas (padrão onboarding fluido).
 *
 * Etapa 1: COMO USAR (3 passos + quando usar cada aba)
 * Etapa 2: CRÉDITOS + CACHE + DICAS (e CTA "Testar agora!")
 *
 * Quando o tutorial já foi concluído (`completed=true`), exibe tudo numa
 * única tela scrollável, sem navegação por slides.
 */
export function TutorialSection({ onTestNow, completed }: TutorialSectionProps = {}) {
  const [page, setPage] = useState<1 | 2>(1);

  // Modo "já completou": vira página de consulta livre (mostra tudo, sem CTAs)
  if (completed) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4 pb-8">
        <HeroHeader />
        <SectionHowToUse />
        <SectionWhichTab />
        <SectionCredits />
        <SectionTips />
        <Disclaimer />
      </div>
    );
  }

  // Modo onboarding (2 slides + CTA Testar)
  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-6 flex flex-col">
      {/* Slide indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        <span
          className="rounded-full transition-all duration-300"
          style={{
            width: page === 1 ? "20px" : "6px",
            height: "6px",
            background: page === 1 ? "#00FF7F" : "rgba(255,255,255,0.2)",
          }}
        />
        <span
          className="rounded-full transition-all duration-300"
          style={{
            width: page === 2 ? "20px" : "6px",
            height: "6px",
            background: page === 2 ? "#00FF7F" : "rgba(255,255,255,0.2)",
          }}
        />
        <span className="text-[10px] text-white/40 ml-2 uppercase tracking-wider"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Passo {page} de 2
        </span>
      </div>

      {/* Conteúdo do slide */}
      <div className="flex-1">
        {page === 1 ? (
          <>
            <HeroHeader title="Como usar" subtitle="Em 3 passos simples + quando usar cada aba." />
            <SectionHowToUse />
            <SectionWhichTab />
          </>
        ) : (
          <>
            <HeroHeader title="Créditos & dicas" subtitle="Tudo que você precisa saber pra tirar o máximo da feature." />
            <SectionCredits />
            <SectionTips />
            <Disclaimer compact />
          </>
        )}
      </div>

      {/* Navegação */}
      <div className="mt-6 flex gap-2 sticky bottom-0 bg-background pt-2">
        {page === 2 && (
          <button
            onClick={() => setPage(1)}
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

        {page === 1 ? (
          <button
            onClick={() => setPage(2)}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "#24c660",
              color: "#FFFFFF",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              border: "none",
              boxShadow: "0 0 22px rgba(0,255,127,0.2)",
            }}
          >
            Próximo
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onTestNow}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: "#24c660",
              color: "#FFFFFF",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              border: "none",
              boxShadow: "0 0 24px rgba(0,255,127,0.3)",
            }}
          >
            <Zap className="w-4 h-4" />
            Testar agora!
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Seções reutilizáveis do tutorial
// ============================================================

function HeroHeader({
  title = "Como usar a IA Tipster",
  subtitle = "Análises inteligentes de futebol em segundos, baseadas em dados reais. Aqui vai um guia rápido pra você tirar o máximo.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-5 pt-1">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {title}
      </h2>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function SectionHowToUse() {
  return (
    <div className="mb-6">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Zap className="w-4 h-4 text-primary" />
        Em 3 passos
      </h3>

      <div className="space-y-2.5">
        <StepCard
          number={1}
          icon={<MessageSquare className="w-4 h-4" />}
          title="Escolha o jogo"
          text="Na aba Chat, digite os times (ex: 'Flamengo x Palmeiras'). No Ao Vivo, escolha um jogo da lista."
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
          text="Com a análise em mãos, abra direto o evento na Esportiva Bet pra montar sua aposta."
        />
      </div>
    </div>
  );
}

function SectionWhichTab() {
  return (
    <div className="mb-2">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Radio className="w-4 h-4 text-primary" />
        Quando usar cada aba
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Chat
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Pra qualquer jogo dos próximos 15 dias. Você escolhe o que analisar.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Radio className="w-4 h-4 text-primary" />
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Ao Vivo
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Pra partidas rolando agora. Análise atualizada com o que tá acontecendo no jogo.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionCredits() {
  return (
    <div className="mb-6">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Coins className="w-4 h-4 text-primary" />
        Como funcionam os créditos
      </h3>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <CreditRow
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          label="Cota semanal"
          text="Você recebe créditos toda semana de acordo com seu plano. Reset toda segunda."
          valueLabel="Grátis"
          valueColor="#00FF7F"
        />
        <CreditRow
          icon={<Coins className="w-3.5 h-3.5" />}
          label="Pacotes extras"
          text="Comprou? Vira saldo permanente. Usa quando quiser, não expira."
          valueLabel="A partir de R$ 29,90"
          valueColor="#FACC15"
        />
        <CreditRow
          icon={<InfinityIcon className="w-3.5 h-3.5" />}
          label="Acesso ilimitado"
          text="Análises sem contar créditos por 1 ou 3 meses. Pra quem usa muito."
          valueLabel="A partir de R$ 99,00"
          valueColor="#00FF7F"
        />
      </div>
    </div>
  );
}

function SectionTips() {
  return (
    <div className="mb-2">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        Dicas avançadas
      </h3>

      <div className="space-y-2.5">
        <TipCard
          icon={<ThumbsUp className="w-4 h-4 text-primary" />}
          title="Use os feedbacks 👍👎"
          text="Eles ajudam a IA a aprender o que funciona pra você. Análise ruim? Polegar pra baixo + reporte."
        />
        <TipCard
          icon={<RefreshCw className="w-4 h-4 text-primary" />}
          title="Repita análises do mesmo jogo"
          text="Próximo ao apito, dados mudam (escalações, lesões). Vale gerar de novo se mudou contexto."
        />
        <TipCard
          icon={<ExternalLink className="w-4 h-4 text-primary" />}
          title="Abra direto na Esportiva Bet"
          text="O botão 'Abrir Esportiva Bet' já te leva no evento certo do jogo analisado. Sem cliques extras."
        />
      </div>
    </div>
  );
}

function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-4" : "mt-6"} p-3 rounded-xl bg-muted/30 border border-white/5`}>
      <div className="flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          A IA Tipster é uma <strong>ferramenta de orientação</strong> baseada em dados estatísticos.
          Use como apoio à sua análise — nenhuma análise é garantia de resultado. Jogue com responsabilidade.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponentes auxiliares
// ============================================================

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
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <span
          className="text-sm font-bold text-primary"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {number}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 text-primary">
          {icon}
          <h4
            className="text-sm font-bold text-foreground leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {title}
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{text}</p>
      </div>
    </div>
  );
}

function CreditRow({
  icon,
  label,
  text,
  valueLabel,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  valueLabel: string;
  valueColor: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className="text-xs font-bold uppercase tracking-wide text-foreground"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {label}
          </span>
          <span
            className="text-[10px] font-bold whitespace-nowrap"
            style={{ color: valueColor, fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {valueLabel}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">{text}</p>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className="text-sm font-bold text-foreground mb-0.5 leading-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {title}
        </h4>
        <p className="text-[11px] text-muted-foreground leading-snug">{text}</p>
      </div>
    </div>
  );
}
