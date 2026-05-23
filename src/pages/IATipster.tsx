import { useState, useMemo, useEffect } from "react";
import { Sparkles, MessageSquare, Radio, Lock, Loader2, AlertTriangle } from "lucide-react";
import { LiveMatchesSection } from "@/components/aitipster/LiveMatchesSection";
import { ChatSection } from "@/components/aitipster/ChatSection";
import { EsportivaInlinePanel } from "@/components/aitipster/EsportivaInlinePanel";
import type { OpenEsportivaPayload } from "@/components/aitipster/ChatMessage";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { isAIBetaUser } from "@/lib/aiBetaAllowlist";
import AppHeader from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CreditBalanceBadge } from "@/components/ia-tipster/CreditBalanceBadge";
import { MaintenanceScreen } from "@/components/ia-tipster/MaintenanceScreen";
import { useAiTipsterStatus } from "@/hooks/useAiTipsterStatus";

function getEmailFromToken(): string | null {
  try {
    const token = localStorage.getItem("premier_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token));
    return payload?.email ?? null;
  } catch {
    return null;
  }
}

export default function IATipster() {
  const email = useMemo(() => getEmailFromToken(), []);
  const [isBeta, setIsBeta] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    isAIBetaUser(email).then((v) => { if (alive) setIsBeta(v); });
    return () => { alive = false; };
  }, [email]);

  const [activeTab, setActiveTab] = useState<"chat" | "live">("live");
  const [openEsportiva, setOpenEsportiva] = useState<OpenEsportivaPayload | null>(null);
  const { balance } = useCreditBalance();
  const { status: aiStatus, loading: aiStatusLoading } = useAiTipsterStatus();
  const showNoCreditsBanner = balance != null && !balance.unlimited_active && balance.total_available === 0;
  const resetLabel = balance?.resets_at
    ? new Date(balance.resets_at).toLocaleDateString("pt-BR", {
        weekday: "short", day: "2-digit", month: "2-digit",
      })
    : "segunda-feira";

  if (isBeta === null) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!isBeta) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4 max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Beta Privado</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
            Estamos liberando o IA Tipster em fases. Você ainda não tem acesso.
            Em breve disponibilizaremos para todos os assinantes.
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

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
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  activeTab === "chat"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab("live")}
                className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  activeTab === "live"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Radio className="w-4 h-4" />
                Ao Vivo
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto">
            {activeTab === "live" ? (
              <div className="h-full overflow-y-auto">
                <LiveMatchesSection onOpenEsportiva={setOpenEsportiva} />
              </div>
            ) : (
              <ChatSection onOpenEsportiva={setOpenEsportiva} />
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
