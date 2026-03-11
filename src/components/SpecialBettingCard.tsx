import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Anchor, Gift, Clock, HelpCircle, BarChart3, Info, Lock } from "lucide-react";
import { useState, useEffect } from "react";


type SpecialCardType = "ALAVANCAGEM" | "ODDS_ALTAS";

interface SpecialBettingCardProps {
  tipId: number;
  type: SpecialCardType;
  market: string;
  betChoice: string;
  odds: number;
  matchDate?: string;
  startsAt?: string;
  expirationDate?: string;
  isLocked?: boolean;
  lockedLabel?: string;
  isExpired?: boolean;
  justificativa?: string;
  onAddTip?: () => void;
  onOpenJustificativa?: (texto: string) => void;
  onLockedClick?: () => void;
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
// Border colors: ALAVANCAGEM = #3B82F6 (azul), ODDS_ALTAS = #EF4444 (vermelho)
const getCardConfig = (type: SpecialCardType) => {
  if (type === "ALAVANCAGEM") {
    return {
      icon: Anchor,
      title: "Alavancagem",
      subtitle: "Sequência do dia",
      bgColor: "bg-gradient-to-r from-teal-600 to-emerald-700",
      textColor: "text-white",
      glowColor: "", // Removed glow
      borderColor: "border-[#3B82F6]", // Azul
      iconBg: "bg-teal-500/30",
      iconColor: "text-teal-300",
    };
  }
  // ODDS_ALTAS
  return {
    icon: Gift,
    title: "Odds Altas",
    subtitle: "Seleções especiais",
    bgColor: "bg-[#DC143C]",
    textColor: "text-white",
    glowColor: "",
    borderColor: "border-[#DC143C]", // Vermelho Forte
    iconBg: "bg-[#DC143C]/30",
    iconColor: "text-[#FF6B6B]",
  };
};

export const SpecialBettingCard = ({
  tipId,
  type,
  market,
  betChoice,
  odds,
  matchDate,
  startsAt,
  expirationDate,
  isLocked = false,
  lockedLabel,
  isExpired: isExpiredProp = false,
  justificativa,
  onAddTip,
  onOpenJustificativa,
  onLockedClick,
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

  // Countdown timer: counts down to startsAt; shows "AO VIVO" after game starts
  useEffect(() => {
    if (!startsAt || isExpiredProp) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(startsAt).getTime();
      const remaining = Math.floor((target - now) / 1000);
      setCountdown(remaining > 0 ? formatCountdown(remaining) : "AO VIVO");
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startsAt, isExpiredProp]);


  return (
    <Card
      className={`select-none relative rounded-xl border-2 transition-all duration-300 flex flex-col
        w-[min(85vw,360px)] sm:w-[400px] md:w-[420px] lg:w-[332px]
        ${isExpired 
          ? "border-gray-600/50 shadow-none grayscale-[60%]" 
          : isLocked
            ? `${config.borderColor}`
            : `${config.borderColor} hover:scale-[1.02]`
      }`}
      style={{
        aspectRatio: '332 / 213',
        minHeight: 0,
        overflow: 'visible',
      }}
    >
      {/* Floating Type Badge - Outside card */}
      <div 
        className="absolute z-50 pointer-events-none"
        style={{
          top: '-14px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {isExpired ? (
          <div 
            className="bg-gray-600 text-gray-300 font-extrabold tracking-wide shadow-lg uppercase"
            style={{
              height: '30px',
              padding: '0 14px',
              fontSize: '13px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            EXPIRADA
          </div>
        ) : (
          <div 
            className={`${config.bgColor} ${config.textColor} font-extrabold tracking-wide shadow-lg uppercase`}
            style={{
              height: '30px',
              padding: '0 14px',
              fontSize: '13px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {type === "ALAVANCAGEM" ? "ALAVANCAGEM" : "ODDS ALTAS"}
          </div>
        )}
      </div>

      {/* Stadium Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none rounded-xl overflow-hidden"
        style={{ backgroundImage: `url('/images/futsal-arena.jpg')` }}
      />

      {/* Matrix Rain overlay inside card */}
      <canvas
        ref={matrixCanvasRef}
        className="absolute inset-0 rounded-xl"
        style={{ zIndex: 1, opacity: 0.18, pointerEvents: "none" }}
      />
      
      {/* Dark Overlay with gradient based on type */}
      <div className={`absolute inset-0 pointer-events-none rounded-xl overflow-hidden ${
        isExpired 
          ? "bg-gradient-to-b from-gray-900/70 via-gray-900/80 to-gray-900/90" 
         : type === "ALAVANCAGEM"
            ? "bg-gradient-to-b from-teal-900/60 via-black/60 to-black/80"
            : "bg-gradient-to-b from-red-900/60 via-black/60 to-black/80"
      }`} />

      {/* Saturation overlay — makes everything below it grayscale */}
      {isLocked && !isExpired && (
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ backgroundColor: 'black', mixBlendMode: 'saturation', zIndex: 15 }}
        />
      )}
      
      {/* Locked Overlay with Lock Icon + CTA — above saturation overlay */}
      {isLocked && !isExpired && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl" style={{ zIndex: 20 }}>
            {lockedLabel && (
              <span className="text-white/80 text-sm font-semibold bg-black/80 px-2 py-1 rounded-md">
                Exclusivo do {lockedLabel}
              </span>
            )}
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(255,255,255,0.15)' }}>
              <Lock className="w-6 h-6 text-black" />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onLockedClick?.(); }}
              className="mt-1 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold shadow-lg transition-all hover:scale-105 animate-pulse-glow-green"
            >
              Adquira já
            </button>
        </div>
      )}

      {/* Countdown Timer - Top Left Corner - Hidden when locked */}
      {!isExpired && !isLocked && countdown && (
        <div 
          className="absolute z-40 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full"
          style={{
            top: '10px',
            left: '12px',
            height: '28px',
            padding: '0 10px',
          }}
        >
          <Clock className="w-3.5 h-3.5 text-white/80" />
          <span 
            className="text-white/95 font-bold tabular-nums"
            style={{ fontSize: '13px' }}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Info Button - Top Right Corner */}
      {!isLocked && (
        <button
          onClick={handleOpenJustificativaClick}
          className={`absolute z-30 rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors pointer-events-auto ${
            isExpired 
              ? "bg-gray-700/70 border-gray-600/50 hover:bg-gray-700/90" 
              : "bg-black/50 border-white/30 hover:bg-black/70 hover:border-white/50"
          }`}
          style={{
            top: '10px',
            right: '12px',
            width: '32px',
            height: '32px',
          }}
          aria-label="Informações"
        >
          <Info className={`w-4 h-4 ${isExpired ? "text-gray-500" : "text-white/90"}`} />
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
        
        {/* Spacer for floating badge */}
        <div style={{ height: '16px' }} />

        {/* Match Date - Hidden when locked */}
        <div className="flex items-center justify-center" style={{ height: '18px' }}>
          {matchDate && !isLocked && (
            <p 
              className={`font-bold ${isExpired ? "text-gray-400" : "text-white/90"}`}
              style={{ fontSize: '12px' }}
            >
              {matchDate}
            </p>
          )}
        </div>

        {/* Special Icon Section - Hidden when locked */}
        {!isLocked && (
          <div className="flex flex-col items-center justify-center gap-1 w-full" style={{ height: '60px' }}>
            <div className={`w-14 h-14 rounded-full ${config.iconBg} backdrop-blur-sm flex items-center justify-center ring-1 shadow-lg ${
              isExpired ? "ring-gray-600/30" : "ring-white/20"
            }`}>
              <IconComponent className={`w-8 h-8 ${isExpired ? "text-gray-500" : config.iconColor}`} />
            </div>
          </div>
        )}

        {/* Odds only - Hidden when locked */}
        {!isLocked && (
          <div 
            className={`w-full backdrop-blur-sm rounded-lg px-3 flex items-center justify-between ${
              isExpired ? "bg-gray-800/50" : "bg-black/50"
            }`}
            style={{ height: '36px', marginTop: '4px' }}
          >
            <span className={`text-xs font-bold ${isExpired ? "text-gray-500" : "text-emerald-400"}`}>
              {type === "ALAVANCAGEM" ? "Alavancagem do Dia" : "Múltipla do Dia"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${isExpired ? "text-gray-500" : "text-emerald-400"}`}>Odd</span>
              <span 
                className={`font-black ${isExpired ? "text-gray-500" : "text-emerald-400"}`}
                style={{ fontSize: '20px' }}
              >
                {odds.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1 min-h-1" />

        {/* Action Buttons Row */}
        {!isLocked && (
          <div className="flex items-center gap-1.5 w-full mt-auto">
            {/* Main Add Button */}
            <Button
              onClick={isExpired ? undefined : onAddTip}
              disabled={isExpired}
              size="sm"
              className={`flex-1 font-extrabold shadow-lg transition-all duration-300 ${
                isExpired 
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed shadow-none" 
                  : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/40 hover:scale-[1.03]"
              }`}
              style={{
                height: '40px',
                fontSize: '14px',
              }}
            >
              {isExpired ? "Expirada" : "Adicionar"}
            </Button>

            {/* Help Icon Button */}
            <button
              onClick={handleOpenJustificativaClick}
              className={`rounded-lg backdrop-blur-sm border flex items-center justify-center transition-colors pointer-events-auto z-20 ${
                isExpired 
                  ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }`}
              style={{
                width: '40px',
                height: '40px',
              }}
              aria-label="Ajuda"
            >
              <HelpCircle className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>

            {/* Stats/Justificativa Icon Button */}
            <button
              onClick={handleOpenJustificativaClick}
              className={`rounded-lg backdrop-blur-sm border flex items-center justify-center transition-colors pointer-events-auto z-20 ${
                isExpired 
                  ? "bg-gray-700/50 border-gray-600/30 hover:bg-gray-700/70" 
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }`}
              style={{
                width: '40px',
                height: '40px',
              }}
              aria-label="Dados / Justificativa"
            >
              <BarChart3 className={`w-5 h-5 ${isExpired ? "text-gray-500" : "text-white/80"}`} />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
