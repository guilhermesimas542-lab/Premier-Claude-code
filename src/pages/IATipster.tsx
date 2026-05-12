import { useState } from "react";
import { Sparkles, MessageSquare, Radio } from "lucide-react";
import { LiveMatchesSection } from "@/components/aitipster/LiveMatchesSection";
import { useCreditBalance } from "@/hooks/useCreditBalance";

export default function IATipster() {
  const [activeTab, setActiveTab] = useState<"chat" | "live">("live");
  const { balance } = useCreditBalance();

  const creditsLabel = balance
    ? balance.is_unlimited
      ? "∞ créditos"
      : `${balance.daily_remaining + balance.bonus + balance.purchased} créditos`
    : "...";

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
        <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <p className="font-medium">Chat com IA Tipster</p>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Em desenvolvimento — disponível na próxima atualização.
          </p>
        </div>
      )}
    </div>
  );
}
