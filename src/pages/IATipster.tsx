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
  // Gate removido — feature liberada em produção (modo MOCK até API keys serem configuradas).

  // Onboarding em 3 etapas:
  //   1. Modal de boas-vindas → clica "Continuar"
  //   2. Tutorial slide 1 (Como usar) → clica "Siguiente"
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
      <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: "#0a0b0e" }}>
        <AppHeader />
        <div className="flex-1 flex flex-col pb-[64px] overflow-hidden">
          <MaintenanceScreen message={aiStatus.message} />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: "#0a0b0e" }}>
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
          <div
            className="max-w-3xl w-full mx-auto shrink-0 z-40"
            style={{ background: "#0a0b0e", borderBottom: "1px solid rgba(235,235,245,.08)" }}
          >
            {/* Título + BETA + saldo (estilo lâmina: estrela dourada) */}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: "block", flex: "none" }}>
                  <path
                    d="M12 1.2 C12.7 7.1 16.9 11.3 22.8 12 C16.9 12.7 12.7 16.9 12 22.8 C11.3 16.9 7.1 12.7 1.2 12 C7.1 11.3 11.3 7.1 12 1.2 Z"
                    fill="#ffffff"
                  />
                </svg>
                <h1 className="text-sm font-semibold" style={{ color: "#ECEAE4" }}>
                  IA Tipster
                </h1>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "8.5px",
                    fontWeight: 600,
                    color: "#8c93c8",
                    letterSpacing: ".12em",
                    border: "1px solid rgba(140,147,200,.35)",
                    padding: "2px 6px",
                    borderRadius: "5px",
                  }}
                >
                  BETA
                </span>
              </div>
              <CreditBalanceBadge />
            </div>

            {showNoCreditsBanner && (
              <div
                className="flex items-center gap-2 px-5 py-2 text-xs"
                style={{
                  background: "rgba(229,72,77,.1)",
                  borderTop: "1px solid rgba(229,72,77,.2)",
                  color: "#e5484d",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Estás sin créditos. Siguiente reinicio: {resetLabel}.</span>
              </div>
            )}

            <div className="flex px-3.5" style={{ borderBottom: "1px solid rgba(235,235,245,.08)" }}>
              <button
                onClick={() => handleTabClick("chat")}
                disabled={!tutorialCompleted}
                className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors ${
                  !tutorialCompleted ? "opacity-40 cursor-not-allowed" : ""
                }`}
                style={{
                  color: activeTab === "chat" ? "#ffffff" : "#9a9ca4",
                  borderBottom: activeTab === "chat" ? "2px solid #ffffff" : "2px solid transparent",
                }}
                title={!tutorialCompleted ? "Completa el tutorial primero" : undefined}
              >
                {!tutorialCompleted ? <Lock className="w-3.5 h-3.5" /> : <MessageSquare className="w-4 h-4" />}
                Chat
              </button>
              <button
                onClick={() => handleTabClick("live")}
                disabled={!tutorialCompleted}
                className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors relative ${
                  !tutorialCompleted ? "opacity-40 cursor-not-allowed" : ""
                }`}
                style={{
                  color: activeTab === "live" ? "#ffffff" : "#9a9ca4",
                  borderBottom: activeTab === "live" ? "2px solid #ffffff" : "2px solid transparent",
                }}
                title={!tutorialCompleted ? "Completa el tutorial primero" : undefined}
              >
                {!tutorialCompleted ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <span
                    className="inline-block rounded-full"
                    style={{ width: "8px", height: "8px", background: "#e5484d" }}
                  />
                )}
                <span className="whitespace-nowrap">En Vivo</span>
              </button>
              <button
                onClick={() => handleTabClick("tutorial")}
                className="flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors relative"
                style={{
                  color: activeTab === "tutorial" ? "#ffffff" : "#9a9ca4",
                  borderBottom: activeTab === "tutorial" ? "2px solid #ffffff" : "2px solid transparent",
                }}
              >
                <BookOpen className="w-4 h-4" />
                Tutorial
                {!tutorialCompleted && (
                  <span
                    className="absolute top-2 right-3 w-1.5 h-1.5 rounded-full"
                    style={{ background: "#e9b949", boxShadow: "0 0 6px #e9b949" }}
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
