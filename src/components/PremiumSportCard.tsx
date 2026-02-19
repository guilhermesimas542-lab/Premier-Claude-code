import { Lock, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SportColors {
  primary: string;
  secondary: string;
  glow: string;
}

interface PremiumSportCardProps {
  id: number;
  name: string;
  emoji: string;
  isPremium?: boolean;
  isLocked?: boolean;
  isDevelopment?: boolean;
  isPreSale?: boolean;
  colors: SportColors;
  priceFrom?: string;
  priceTo?: string;
  countdown?: { days?: number; hours: number; minutes: number; seconds: number };
  sportSubheadline?: string;
  casinoTitle?: string;
  casinoSubheadline?: string;
  onClick?: () => void;
}

const premiumTexts = {
  titles: ["Entradas de Hoje", "Análise Liberada", "Painel Atualizado"],
  subtitles: [
    "IA localizou novas oportunidades",
    "Sinais validados e atualizados",
    "Precisão aumentada nas últimas análises"
  ],
  ctas: ["ACESSAR AGORA", "VER ENTRADAS", "ABRIR PAINEL"]
};

export const PremiumSportCard = ({
  id,
  name,
  emoji,
  isPremium = false,
  isLocked = false,
  isDevelopment = false,
  isPreSale = false,
  colors,
  priceFrom,
  priceTo,
  countdown,
  sportSubheadline,
  casinoTitle,
  casinoSubheadline,
  onClick
}: PremiumSportCardProps) => {
  const textIndex = id % 3;

  const renderContent = () => {
    if (isLocked) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 space-y-3 px-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FF4E4E] blur-2xl opacity-40 animate-pulse" />
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,78,78,0.2) 0%, rgba(255,78,78,0.05) 100%)',
                boxShadow: '0 0 20px rgba(255,78,78,0.3)'
              }}
            >
              <Lock className="w-6 h-6 text-[#FF4E4E]" style={{ filter: 'drop-shadow(0 0 8px rgba(255,78,78,0.8))' }} />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-xs font-bold text-[#FF4E4E] tracking-wide">Conteúdo Exclusivo</h4>
            <p className="text-[11px] text-[#A1A1A1] leading-relaxed max-w-[160px]">
              Libere acesso para visualizar entradas avançadas
            </p>
          </div>
        </div>
      );
    }

    if (isDevelopment) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 space-y-3 px-4">
          <div className="relative">
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(60,60,60,0.3)', boxShadow: '0 0 20px rgba(100,100,100,0.2)' }}
            >
              <Lock className="w-6 h-6 text-[#888888]" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-xs font-bold text-[#888888] tracking-wide">Em Breve</h4>
            <p className="text-[11px] text-[#666666]">Disponível em breve</p>
          </div>
        </div>
      );
    }

    if (isPreSale) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 space-y-2 px-4">
          <div className="text-center space-y-2">
            <h4 className="text-xs font-bold text-[#00FF7F] tracking-wide">Lançamento Exclusivo</h4>
            {countdown && (
              <div className="flex justify-center gap-1">
                {[
                  { value: countdown.days, label: 'd', show: (countdown.days ?? 0) > 0 },
                  { value: countdown.hours, label: 'h', show: true },
                  { value: countdown.minutes, label: 'm', show: true },
                  { value: countdown.seconds, label: 's', show: true }
                ].filter(item => item.show).map((item, i, arr) => (
                  <div key={i} className="flex items-center">
                    <div className="bg-[#0A0A0A] rounded px-1.5 py-0.5 border border-[#00FF7F]/20">
                      <span className="text-xs font-bold text-white">{String(item.value).padStart(2, '0')}</span>
                      <span className="text-[9px] text-[#A1A1A1] ml-0.5">{item.label}</span>
                    </div>
                    {i < arr.length - 1 && <span className="text-[#00FF7F] mx-0.5 text-xs">:</span>}
                  </div>
                ))}
              </div>
            )}
            {priceFrom && priceTo && (
              <div className="space-y-0.5">
                <p className="text-[11px] text-[#A1A1A1] line-through">{priceFrom}</p>
                <p className="text-base font-bold text-[#00FF7F]">{priceTo}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    const isCasino = id === 11;
    const isFutebol = id === 1;
    const displayTitle = isCasino && casinoTitle ? casinoTitle : premiumTexts.titles[textIndex];
    const displaySubtitle = isCasino && casinoSubheadline
      ? casinoSubheadline
      : isFutebol && sportSubheadline
        ? sportSubheadline
        : premiumTexts.subtitles[textIndex];

    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-2 px-4">
        <div className="text-center space-y-1.5">
          <h4
            className="text-sm font-bold tracking-wide"
            style={{ color: colors.primary, textShadow: `0 0 15px ${colors.glow}` }}
          >
            {displayTitle}
          </h4>
          <p className="text-[11px] text-[#A1A1A1] leading-relaxed">{displaySubtitle}</p>
        </div>
      </div>
    );
  };

  const renderButton = () => {
    if (isLocked) {
      return (
        <Button
          className="w-full relative overflow-hidden py-4 text-xs font-bold tracking-wider transition-all duration-300 border-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #FF4E4E 0%, #CC3E3E 100%)',
            boxShadow: '0 0 16px rgba(255,78,78,0.4)'
          }}
          onClick={onClick}
        >
          <span className="relative z-10 text-white">LIBERAR ACESSO</span>
        </Button>
      );
    }

    if (isDevelopment) {
      return (
        <Button
          disabled
          className="w-full py-4 text-xs font-bold tracking-wider rounded-full bg-[#1A1A1A] text-[#666] border border-[#333] cursor-not-allowed"
        >
          EM BREVE
        </Button>
      );
    }

    if (isPreSale) {
      return (
        <Button
          className="w-full relative overflow-hidden py-4 text-xs font-bold tracking-wider transition-all duration-300 border-0 rounded-full hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #00FF7F 0%, #00CC66 100%)',
            boxShadow: '0 0 20px rgba(0,255,127,0.4)'
          }}
          onClick={onClick}
        >
          <span className="relative z-10 text-black font-bold">GARANTIR VAGA</span>
        </Button>
      );
    }

    return (
      <Button
        className="w-full relative overflow-hidden py-4 text-xs font-bold tracking-wider transition-all duration-300 border-0 rounded-full hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          boxShadow: `0 0 20px ${colors.glow}`
        }}
        onClick={onClick}
      >
        <span className="relative z-10 text-black font-bold">{premiumTexts.ctas[textIndex]}</span>
      </Button>
    );
  };

  const getBorderStyle = () => {
    if (isLocked) return { borderColor: '#FBBF24', boxShadow: '0 0 12px rgba(251,191,36,0.2)' };
    if (isDevelopment) return { borderColor: '#00D4FF33', boxShadow: '0 0 8px rgba(0,212,255,0.1)' };
    if (isPreSale) return { borderColor: '#00FF7F44', boxShadow: '0 0 12px rgba(0,255,127,0.15)' };
    return { borderColor: `${colors.primary}55`, boxShadow: `0 0 10px ${colors.glow}` };
  };

  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden transition-all duration-500
        ${isPremium || isPreSale ? 'cursor-pointer hover:scale-[1.02]' : ''}
        ${isLocked ? 'cursor-pointer hover:scale-[1.01]' : ''}
        ${isDevelopment ? 'cursor-not-allowed opacity-80' : ''}
      `}
      onClick={!isDevelopment ? onClick : undefined}
      style={{
        background: isLocked ? '#070707' : '#060606',
        border: '1.5px solid',
        /* Mobile-optimized height: shorter on small screens */
        minHeight: 'clamp(200px, 40vw, 280px)',
        ...getBorderStyle()
      }}
    >
      {/* Subtle gradient texture */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `linear-gradient(45deg, transparent 0%, ${
            isLocked ? 'rgba(251,191,36,0.05)' :
            isDevelopment ? 'rgba(0,212,255,0.05)' :
            isPreSale ? 'rgba(0,255,127,0.05)' :
            `${colors.primary}08`
          } 50%, transparent 100%)`
        }}
      />

      {/* IA Badge */}
      {isPremium && !isLocked && !isDevelopment && !isPreSale && (
        <div className="absolute top-2.5 right-2.5 z-20">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: `1px solid ${colors.primary}44`,
              boxShadow: `0 0 8px ${colors.glow}`
            }}
          >
            <Sparkles className="w-2.5 h-2.5" style={{ color: colors.primary }} />
            <span className="text-[9px] font-bold tracking-wider" style={{ color: colors.primary }}>IA ATIVADA</span>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full" style={{ minHeight: 'clamp(200px, 40vw, 280px)' }}>
        {/* Header */}
        <div className="pt-4 pb-3 flex flex-col items-center">
          <div className="relative mb-3">
            <div
              className="absolute inset-0 blur-xl opacity-40"
              style={{ backgroundColor: isLocked ? '#FBBF24' : isDevelopment ? '#00D4FF' : colors.primary }}
            />
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: isLocked
                  ? 'rgba(251,191,36,0.12)'
                  : isDevelopment
                  ? 'rgba(0,212,255,0.12)'
                  : `${colors.primary}15`,
                boxShadow: isLocked
                  ? '0 0 16px rgba(251,191,36,0.25)'
                  : isDevelopment
                  ? '0 0 16px rgba(0,212,255,0.25)'
                  : `0 0 16px ${colors.glow}`
              }}
            >
              <span
                className="text-2xl"
                style={{
                  filter: isLocked
                    ? 'drop-shadow(0 0 6px rgba(251,191,36,0.6)) grayscale(0.3)'
                    : isDevelopment
                    ? 'drop-shadow(0 0 6px rgba(0,212,255,0.6)) grayscale(0.2)'
                    : `drop-shadow(0 0 6px ${colors.glow})`
                }}
              >
                {emoji}
              </span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-white tracking-wide text-center">
            {name}
          </h3>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Button */}
        <div className="p-3 pt-2 mt-auto">
          {renderButton()}
        </div>
      </div>
    </div>
  );
};
