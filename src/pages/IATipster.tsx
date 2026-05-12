import { useState } from "react";
import { Sparkles, MessageSquare, Radio } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export default function IATipster() {
  const [activeTab, setActiveTab] = useState<"chat" | "live">("chat");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header com faixa BETA + badge de créditos placeholder */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">IA Tipster</h1>
            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
              BETA
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            0 créditos
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
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

      {/* Conteúdo placeholder */}
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {activeTab === "chat" ? (
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          ) : (
            <Radio className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <h2 className="text-lg font-semibold mb-2">
          {activeTab === "chat" ? "Chat com IA Tipster" : "Análise Ao Vivo"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Em desenvolvimento — disponível em breve.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
