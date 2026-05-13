import { useState, useMemo } from "react";
import { Sparkles, MessageSquare, Radio, Lock } from "lucide-react";
import { LiveMatchesSection } from "@/components/aitipster/LiveMatchesSection";
import { ChatSection } from "@/components/aitipster/ChatSection";
import { EsportivaInlinePanel } from "@/components/aitipster/EsportivaInlinePanel";
import type { OpenEsportivaPayload } from "@/components/aitipster/ChatMessage";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { isAIBetaUser } from "@/lib/aiBetaAllowlist";

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
  const isBeta = isAIBetaUser(email);

  const [activeTab, setActiveTab] = useState<"chat" | "live">("live");
  const { balance } = useCreditBalance();

  const creditsLabel = balance
    ? balance.is_unlimited
      ? "∞ créditos"
      : `${balance.daily_remaining + balance.bonus + balance.purchased} créditos`
    : "...";

  if (!isBeta) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">IA Tipster</h1>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                BETA
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Beta Privado</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
            Estamos liberando o IA Tipster em fases. Você ainda não tem acesso.
            Em breve disponibilizaremos para todos os assinantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">IA Tipster</h1>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
              BETA
            </span>
          </div>
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            {creditsLabel}
          </span>
        </div>

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
      </header>

      {activeTab === "live" ? (
        <LiveMatchesSection />
      ) : (
        <ChatSection />
      )}
    </div>
  );
}
