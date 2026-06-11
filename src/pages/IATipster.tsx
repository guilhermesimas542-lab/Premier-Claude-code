import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Sparkles, MessageSquare, Radio, AlertTriangle, BookOpen, Lock } from "lucide-react";
import { LiveMatchesSection } from "@/components/aitipster/LiveMatchesSection";
import { ChatSection } from "@/components/aitipster/ChatSection";
import { TutorialSection } from "@/components/aitipster/TutorialSection";
import { EsportivaInlinePanel } from "@/components/aitipster/EsportivaInlinePanel";
import { IATipsterOnboardingModal } from "@/components/ia-tipster/IATipsterOnboardingModal";
import type { OpenEsportivaPayload } from "@/components/aitipster/ChatMessage";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import AppHeader from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CreditBalanceBadge } from "@/components/ia-tipster/CreditBalanceBadge";
import { MaintenanceScreen } from "@/components/ia-tipster/MaintenanceScreen";
import { CreditRecoveryModal } from "@/components/ia-tipster/CreditRecoveryModal";
import { useAiTipsterStatus } from "@/hooks/useAiTipsterStatus";
import { isPreviewEnv } from "@/lib/previewEnv";

// localStorage keys para controle do modal de recuperação de créditos
const LS_HAD_CREDITS = "ia_tipster_had_credits_ever";
const LS_RECOVERY_SHOWN = "ia_tipster_recovery_modal_shown";

// localStorage keys para onboarding forçado
const LS_ONBOARDING_SEEN = "ia_tipster_onboarding_seen_v2";        // 1: modal de boas-vindas visto
const LS_TUTORIAL_COMPLETED = "ia_tipster_tutorial_completed_v2";  // 2+3: tutorial em 2 slides concluído (clicou "Testar")

export default function IATipster() {
  // Gate de produção: IA Tipster habilitada APENAS em preview/local até liberação oficial.
  if (!isPreviewEnv()) {
    return <Navigate to="/home" replace />;
  }

  // Onboarding em 3 etapas:
  //   1. Modal de boas-vindas → clica "Continuar"
  //   2. Tutorial slide 1 (Como usar) → clica "Próximo"
  //   3. Tutorial slide 2 (Créditos+Dicas) → clica "Testar agora!" (libera Ao Vivo e Chat)
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem(LS_TUTORIAL_COMPLETED) === "true"
  );
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem(LS_ONBOARDING_SEEN) !== "true"
  );

  // Default tab depende do estágio: live se completou tutorial, senão tutorial
  const [activeTab, setActiveTab] = useState<"chat" | "live" | "tutorial">(() =>
    typeof window !== "undefined" && localStorage.getItem(LS_TUTORIAL_COMPLETED) === "true"
      ? "live"
      : "tutorial"
  );
  const [openEsportiva, setOpenEsportiva] = useState<OpenEsportivaPayload | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  /** Funil completo (4 steps do modal): marca tudo como visto e leva pro Ao Vivo. */
  const handleOnboardingComplete = () => {
    localStorage.setItem(LS_ONBOARDING_SEEN, "true");
    localStorage.setItem(LS_TUTORIAL_COMPLETED, "true");
    setShowOnboardingModal(false);
    setTutorialCompleted(true);
    setActiveTab("live");
  };

  /** Tutorial da sidebar (consulta posterior): "Testar agora!" volta pro Ao Vivo. */
  const handleTestNow = () => {
    localStorage.setItem(LS_TUTORIAL_COMPLETED, "true");
    setTutorialCompleted(true);
    setActiveTab("live");
  };

  /** Click handler com gates progressivos. */
  const handleTabClick = (tab: "chat" | "live" | "tutorial") => {
    if (tab === "tutorial") {
      setActiveTab("tutorial");
      return;
    }
    // Live e Chat: liberam após o tutorial concluído
    if ((tab === "live" || tab === "chat") && !tutorialCompleted) return;
    setActiveTab(tab);
  };
  const { balance } = useCreditBalance();
  const { status: aiStatus, loading: aiStatusLoading } = useAiTipsterStatus();

  const showNoCreditsBanner = balance != null && !balance.unlimited_active && balance.total_available === 0;
  const resetLabel = balance?.resets_at
    ? new Date(balance.resets_at).toLocaleDateString("pt-BR", {
        weekday: "short", day: "2-digit", month: "2-digit",
      })
    : "segunda-feira";

  /**
   * Marca "já teve créditos" sempre que o saldo for > 0.
   * Isso garante que o modal de recuperação só aparece pra quem JÁ USOU a feature.
   */
  useEffect(() => {
    if (balance == null) return;
    if (balance.unlimited_active || balance.total_available > 0) {
      localStorage.setItem(LS_HAD_CREDITS, "true");
    }
  }, [balance]);

  /**
   * Trigger do modal de recuperação:
   * - Usuário já teve créditos antes (had_credits_ever = true)
   * - Saldo atual = 0 (e não ilimitado)
   * - Modal ainda não foi mostrado nesta jornada (recovery_shown != true)
   *
   * Aparece UMA VEZ. Depois nunca mais, mesmo que o usuário saia e volte várias vezes.
   */
  useEffect(() => {
    if (balance == null) return;
    if (balance.unlimited_active) return;
    if (balance.total_available > 0) return;

    const hadCredits = localStorage.getItem(LS_HAD_CREDITS) === "true";
    const alreadyShown = localStorage.getItem(LS_RECOVERY_SHOWN) === "true";

    if (hadCredits && !alreadyShown) {
      setShowRecoveryModal(true);
      localStorage.setItem(LS_RECOVERY_SHOWN, "true");
    }
  }, [balance]);

  /**
   * Debug hook (preview only): expõe window.__forceRecoveryModal() pra abrir
   * o modal de recuperação manualmente, ignorando saldo/flags.
   * Útil pra testar UI sem precisar zerar créditos no banco.
   */
  useEffect(() => {
    if (!isPreviewEnv()) return;
    (window as any).__forceRecoveryModal = () => {
      setShowRecoveryModal(true);
      // eslint-disable-next-line no-console
      console.log("[debug] CreditRecoveryModal forçado.");
    };
    return () => {
      delete (window as any).__forceRecoveryModal;
    };
  }, []);


  if (!aiStatusLoading && aiStatus && !aiStatus.enabled) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
        <AppHeader />
        <div className="flex-1 flex flex-col pb-[64px] overflow-hidden">
          <MaintenanceScreen message={aiStatus.message} />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      <AppHeader />

      {openEsportiva ? (
        <div className="flex-1 overflow-hidden pb-[64px]">
          <div className="max-w-5xl mx-auto h-full">
            <EsportivaInlinePanel
              matchLabel={openEsportiva.matchLabel}
              markdown={openEsportiva.markdown}
              altenarEventUrl={openEsportiva.altenarEventUrl}
              onClose={() => setOpenEsportiva(null)}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden pb-[64px]">
          <div className="max-w-3xl w-full mx-auto shrink-0 z-40 bg-background border-b">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h1 className="text-sm font-bold">IA Tipster</h1>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                  BETA
                </span>
              </div>
              <CreditBalanceBadge />
            </div>

            {showNoCreditsBanner && (
              <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-xs text-destructive">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Você está sem créditos. Próximo reset: {resetLabel}.</span>
              </div>
            )}

            <div className="flex border-b">
              <button
                onClick={() => handleTabClick("chat")}
                disabled={!tutorialCompleted}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  activeTab === "chat"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                } ${!tutorialCompleted ? "opacity-40 cursor-not-allowed" : ""}`}
                title={!tutorialCompleted ? "Conclua o tutorial primeiro" : undefined}
              >
                {!tutorialCompleted ? <Lock className="w-3.5 h-3.5" /> : <MessageSquare className="w-4 h-4" />}
                Chat
              </button>
              <button
                onClick={() => handleTabClick("live")}
                disabled={!tutorialCompleted}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors relative ${
                  activeTab === "live"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                } ${!tutorialCompleted ? "opacity-40 cursor-not-allowed" : ""}`}
                title={!tutorialCompleted ? "Conclua o tutorial primeiro" : undefined}
              >
                {!tutorialCompleted ? <Lock className="w-3.5 h-3.5" /> : <Radio className="w-4 h-4" />}
                Ao Vivo
              </button>
              <button
                onClick={() => handleTabClick("tutorial")}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors relative ${
                  activeTab === "tutorial"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Tutorial
                {!tutorialCompleted && (
                  <span
                    className="absolute top-2 right-3 w-1.5 h-1.5 rounded-full"
                    style={{ background: "#eac064", boxShadow: "0 0 6px #eac064" }}
                  />
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto">
            {activeTab === "live" && (
              <div className="h-full overflow-y-auto">
                <LiveMatchesSection onOpenEsportiva={setOpenEsportiva} />
              </div>
            )}
            {activeTab === "chat" && (
              <ChatSection onOpenEsportiva={setOpenEsportiva} />
            )}
            {activeTab === "tutorial" && (
              <TutorialSection
                onTestNow={handleTestNow}
                completed={tutorialCompleted}
              />
            )}
          </div>
        </div>
      )}

      <BottomNav />

      {/* Modal de recuperação: aparece 1x quando user volta sem créditos */}
      <CreditRecoveryModal
        open={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
      />

      {/* Funil de onboarding (4 steps em popup). Sem botão de fechar — o lead
          só sai clicando "Começar agora" no último step. Aparece 1x se o lead
          chegou direto em /ia-tipster sem passar pelo Home. */}
      <IATipsterOnboardingModal
        open={showOnboardingModal}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
