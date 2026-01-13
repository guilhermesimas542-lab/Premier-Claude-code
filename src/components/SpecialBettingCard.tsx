import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Anchor, Gift, Clock, HelpCircle, BarChart3, Info } from "lucide-react";
import { useState, useEffect } from "react";

type SpecialCardType = "ALAVANCAGEM" | "ODDS_ALTAS";

interface SpecialBettingCardProps {
  tipId: number;
  type: SpecialCardType;
  market: string;
  betChoice: string;
  odds: number;
  matchDate?: string;
  expirationDate?: string;
  isLocked?: boolean;
  isExpired?: boolean;
  justificativa?: string;
  onAddTip?: () => void;
  onOpenJustificativa?: (texto: string) => void;
}

// Helper function to format countdown
const formatCountdown = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "00:00:00";
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// Get card config based on type
const getCardConfig = (type: SpecialCardType) => {
  if (type === "ALAVANCAGEM") {
    return {
      icon: Anchor,
      title: "Alavancagem",
      subtitle: "Sequência do dia",
      bgColor: "bg-gradient-to-r from-teal-600 to-emerald-700",
      textColor: "text-white",
      glowColor: "shadow-[0_0_25px_rgba(20,184,166,0.5)]",
      borderColor: "border-teal-500/50",
      iconBg: "bg-teal-500/30",
      iconColor: "text-teal-300",
    };
  }
  // ODDS_ALTAS
  return {
    icon: Gift,
    title: "Odds Altas",
    subtitle: "Seleções especiais",
    bgColor: "bg-gradient-to-r from-amber-600 to-orange-700",
    textColor: "text-white",
    glowColor: "shadow-[0_0_25px_rgba(245,158,11,0.5)]",
    borderColor: "border-amber-500/50",
    iconBg: "bg-amber-500/30",
    iconColor: "text-amber-300",
  };
};

export const SpecialBettingCard = ({
  tipId,
  type,
  market,
  betChoice,
  odds,
  matchDate,
  expirationDate,
  isLocked = false,
  isExpired: isExpiredProp = false,
  justificativa,
  onAddTip,
  onOpenJustificativa,
}: SpecialBettingCardProps) => {
  const [countdown, setCountdown] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);

  const config = getCardConfig(type);
  const IconComponent = config.icon;
  const isExpired = isExpiredProp || isExpiredLocal;

  // Textos fixos de justificativa por categoria
  const getFixedJustificativaTexto = () => {
    if (type === "ALAVANCAGEM") {
      return "Alavancagem é uma sequência progressiva de entradas, feita em etapas.\n\nVocê segue a ordem do dia e avança etapa por etapa, sem pular.\n\nO foco é progressão controlada: consistência, disciplina e crescimento gradual da banca.";
    }
    return "Odds Altas são seleções com cotação acima do padrão, escolhidas por oportunidade.\n\nA ideia é aproveitar odds valorizadas quando existe lógica e critério por trás da entrada.\n\nVocê recebe a seleção pronta e entra somente quando a oportunidade estiver disponível.";
  };

  const handleOpenJustificativaClick = () => {
    onOpenJustificativa?.(getFixedJustificativaTexto());
  };

  // Countdown timer effect
  useEffect(() => {
    if (!expirationDate || isExpiredProp) return;

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expireAt = new Date(expirationDate).getTime();
      const diff = Math.floor((expireAt - now) / 1000);
      return diff;
    };

    const initialRemaining = calculateRemaining();
    if (initialRemaining <= 0) {
      setIsExpiredLocal(true);
      setCountdown("00:00:00");
      return;
    }
    setCountdown(formatCountdown(initialRemaining));

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      if (remaining <= 0) {
        setIsExpiredLocal(true);
        setCountdown("00:00:00");
        clearInterval(interval);
      } else {
        setCountdown(formatCountdown(remaining));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationDate, isExpiredProp]);


  return (
    <Card
      className={`w-full overflow-hidden select-none relative rounded-xl border transition-all duration-300 flex flex-col ${
        isExpired 
          ? "border-gray-600/50 shadow-none grayscale-[60%]" 
          : `${config.borderColor} ${config.glowColor} hover:scale-[1.02]`
      }`}
      style={{
        aspectRatio: '332 / 213',
        minHeight: 0,
      }}
    >
      {/* Stadium Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('/images/futsal-arena.jpg')`,
        }}
      />
      
      {/* Dark Overlay with gradient based on type */}
      <div className={`absolute inset-0 pointer-events-none ${
        isExpired 
          ? "bg-gradient-to-b from-gray-900/70 via-gray-900/80 to-gray-900/90" 
          : type === "ALAVANCAGEM"
            ? "bg-gradient-to-b from-teal-900/60 via-black/60 to-black/80"
            : "bg-gradient-to-b from-amber-900/60 via-black/60 to-black/80"
      }`} />
      
      {/* Locked Overlay */}
      {isLocked && !isExpired && (
        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm pointer-events-none" />
      )}

      {/* Info Button - Top Right Corner (like other cards) */}
      <button
        onClick={handleOpenJustificativaClick}
        className={`absolute top-3 right-3 z-30 w-7 h-7 rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors pointer-events-auto ${
          isExpired 
            ? "bg-gray-700/70 border-gray-600/50 hover:bg-gray-700/90" 
            : "bg-black/50 border-white/30 hover:bg-black/70 hover:border-white/50"
        }`}
        aria-label="Informações"
      >
        <Info className={`w-4 h-4 ${isExpired ? "text-gray-500" : "text-white/90"}`} />
      </button>

      {/* Content - Compact */}
      <div className="relative z-10 p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
        
        {/* Header Section - Compact */}
        <div className="h-6 flex items-center justify-center relative mb-0.5">
          {/* Timer - Top Left Corner */}
          {!isExpired && countdown && (
            <div className="absolute top-0 left-0 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
              <Clock className="w-2.5 h-2.5 text-white/70" />
              <span className="text-[8px] text-white/90 font-medium tabular-nums">
                {countdown}
              </span>
            </div>
          )}

          {/* Type Badge - Centered */}
          {isExpired ? (
            <div className="bg-gray-600 text-gray-300 px-3 py-0.5 rounded-full font-bold text-[9px] tracking-wide shadow-lg">
              EXPIRADA
            </div>
          ) : (
            <div className={`${config.bgColor} ${config.textColor} px-3 py-0.5 rounded-full font-bold text-[9px] tracking-wide shadow-lg`}>
              {type === "ALAVANCAGEM" ? "ALAVANCAGEM" : "ODDS ALTAS"}
            </div>
          )}
        </div>

        {/* Match Date - Compact */}
        <div className="h-3 flex items-center justify-center">
          {matchDate && (
            <p className={`text-[8px] font-medium ${isExpired ? "text-gray-400" : "text-white/80"}`}>
              {matchDate}
            </p>
          )}
        </div>

        {/* Special Icon Section (replaces teams) - Compact */}
        <div className="h-14 flex flex-col items-center justify-center gap-1 w-full">
          <div className={`w-10 h-10 rounded-full ${config.iconBg} backdrop-blur-sm flex items-center justify-center ring-1 shadow-lg ${
            isExpired ? "ring-gray-600/30" : "ring-white/20"
          }`}>
            <IconComponent className={`w-5 h-5 ${isExpired ? "text-gray-500" : config.iconColor}`} />
          </div>
          <div className="text-center">
            <h3 className={`text-sm font-bold ${isExpired ? "text-gray-400" : "text-white"}`}>
              {config.title}
            </h3>
            <p className={`text-[7px] ${isExpired ? "text-gray-500" : "text-white/60"}`}>
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Market Name - Compact */}
        <div className="h-6 flex items-center justify-center">
          <div className={`px-2 py-0.5 rounded backdrop-blur-sm border ${
            isExpired 
              ? "bg-gray-800/60 border-gray-600/30" 
              : "bg-black/60 border-white/10"
          }`}>
            <p className={`text-[9px] font-semibold line-clamp-1 ${isExpired ? "text-gray-400" : "text-white"}`}>
              {market}
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-2" />

        {/* Bet Details Row - Compact */}
        <div className={`h-8 w-full backdrop-blur-sm rounded-lg px-2 flex items-center justify-between ${
          isExpired 
            ? "bg-gray-800/50" 
            : "bg-black/50"
        }`}>
          <span className={`font-bold text-[10px] line-clamp-1 ${isExpired ? "text-gray-500" : "text-emerald-400"}`}>
            {betChoice}
          </span>
          <span className={`font-black text-sm ${isExpired ? "text-gray-500" : "text-white"}`}>
            {odds.toFixed(1)}
          </span>
        </div>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1 min-h-1" />

        {/* Action Buttons Row - Compact */}
        <div className="flex items-center gap-1.5 w-full mt-auto">
          {/* Main Add Button */}
          <Button
            onClick={isExpired ? undefined : onAddTip}
            disabled={isExpired}
            size="sm"
            className={`flex-1 font-bold py-1.5 h-8 text-[10px] shadow-lg transition-all duration-300 ${
              isExpired 
                ? "bg-gray-600 text-gray-400 cursor-not-allowed shadow-none" 
                : isLocked 
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/40 hover:scale-[1.03]" 
                  : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/40 hover:scale-[1.03]"
            }`}
          >
            <span className="font-extrabold">
              {isExpired ? "Expirada" : isLocked ? "🔒 Desbloquear" : "Adicionar"}
            </span>
          </Button>

          {/* Help Icon Button - Also opens justificativa modal */}
          <button
            onClick={handleOpenJustificativaClick}
            className={`w-8 h-8 rounded-lg backdrop-blur-sm border flex items-center justify-center transition-colors pointer-events-auto z-20 ${
              isExpired 
                ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                : "bg-white/10 border-white/20 hover:bg-white/20"
            }`}
            aria-label="Ajuda"
          >
            <HelpCircle className={`w-3.5 h-3.5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
          </button>

          {/* Stats/Justificativa Icon Button */}
          <button
            onClick={handleOpenJustificativaClick}
            className={`w-8 h-8 rounded-lg backdrop-blur-sm border flex items-center justify-center transition-colors pointer-events-auto z-20 ${
              isExpired 
                ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                : "bg-white/10 border-white/20 hover:bg-white/20"
            }`}
            aria-label="Dados / Justificativa"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
          </button>
        </div>
      </div>
    </Card>
  );
};
