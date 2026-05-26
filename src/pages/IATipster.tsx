import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Sparkles, MessageSquare, Radio, AlertTriangle } from "lucide-react";
import { LiveMatchesSection } from "@/components/aitipster/LiveMatchesSection";
import { ChatSection } from "@/components/aitipster/ChatSection";
import { EsportivaInlinePanel } from "@/components/aitipster/EsportivaInlinePanel";
import type { OpenEsportivaPayload } from "@/components/aitipster/ChatMessage";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import AppHeader from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CreditBalanceBadge } from "@/components/ia-tipster/CreditBalanceBadge";
import { MaintenanceScreen } from "@/components/ia-tipster/MaintenanceScreen";
import { useAiTipsterStatus } from "@/hooks/useAiTipsterStatus";
import { isPreviewEnv } from "@/lib/previewEnv";

export default function IATipster() {
  // Gate de produção: IA Tipster habilitada APENAS em preview/local até liberação oficial.
  if (!isPreviewEnv()) {
    return <Navigate to="/home" replace />;
  }

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
