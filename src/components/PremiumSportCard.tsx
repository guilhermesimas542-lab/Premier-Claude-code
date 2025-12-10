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
  onClick?: () => void;
}

// Textos premium por tipo
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
  onClick
}: PremiumSportCardProps) => {
  // Seleciona texto aleatório baseado no ID para consistência
  const textIndex = id % 3;
  
  const renderContent = () => {
    if (isLocked) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 space-y-4 px-4">
          {/* Ícone de Cadeado Premium */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#FF4E4E] blur-2xl opacity-40 animate-pulse" />
            <div 
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,78,78,0.2) 0%, rgba(255,78,78,0.05) 100%)',
                boxShadow: '0 0 30px rgba(255,78,78,0.3), inset 0 0 20px rgba(255,78,78,0.1)'
              }}
            >
              <Lock 
                className="w-8 h-8 text-[#FF4E4E]" 
                style={{ filter: 'drop-shadow(0 0 10px rgba(255,78,78,0.8))' }}
              />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h4 className="text-sm font-bold text-[#FF4E4E] tracking-wide">
              Conteúdo Exclusivo
            </h4>
            <p className="text-xs text-[#A1A1A1] leading-relaxed max-w-[180px]">
              Libere acesso para visualizar entradas avançadas
            </p>
          </div>
        </div>
      );
    }

    if (isDevelopment) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 space-y-4 px-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#666666] blur-2xl opacity-30" />
            <div 
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(100,100,100,0.2) 0%, rgba(60,60,60,0.05) 100%)',
                boxShadow: '0 0 30px rgba(100,100,100,0.2), inset 0 0 20px rgba(0,0,0,0.3)'
              }}
            >
              <Lock 
                className="w-8 h-8 text-[#888888]" 
                style={{ filter: 'drop-shadow(0 0 10px rgba(100,100,100,0.5))' }}
              />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h4 className="text-sm font-bold text-[#888888] tracking-wide">
              Em Breve
            </h4>
            <p className="text-xs text-[#666666]">
              Disponível em breve
            </p>
          </div>
        </div>
      );
    }

    if (isPreSale) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 space-y-3 px-4">
          <div className="text-center space-y-3">
            <h4 className="text-sm font-bold text-[#00FF7F] tracking-wide">
              Lançamento Exclusivo
            </h4>
            
            {countdown && (
              <div className="flex justify-center gap-1">
                {[
                  { value: countdown.days, label: 'd', show: countdown.days > 0 },
                  { value: countdown.hours, label: 'h', show: true },
                  { value: countdown.minutes, label: 'm', show: true },
                  { value: countdown.seconds, label: 's', show: true }
                ].filter(item => item.show).map((item, i, arr) => (
                  <div key={i} className="flex items-center">
                    <div 
                      className="bg-[#0A0A0A] rounded px-2 py-1 border border-[#00FF7F]/20"
                      style={{ boxShadow: '0 0 10px rgba(0,255,127,0.1)' }}
                    >
                      <span className="text-sm font-bold text-white">{String(item.value).padStart(2, '0')}</span>
                      <span className="text-[10px] text-[#A1A1A1] ml-0.5">{item.label}</span>
                    </div>
                    {i < arr.length - 1 && <span className="text-[#00FF7F] mx-0.5">:</span>}
                  </div>
                ))}
              </div>
            )}
            
            {priceFrom && priceTo && (
              <div className="space-y-1">
                <p className="text-xs text-[#A1A1A1] line-through">{priceFrom}</p>
                <p className="text-lg font-bold text-[#00FF7F]">{priceTo}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Premium Active Card
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-3 px-4">
        <div className="text-center space-y-2">
          <h4 
            className="text-base font-bold tracking-wide"
            style={{ 
              color: colors.primary,
              textShadow: `0 0 20px ${colors.glow}`
            }}
          >
            {premiumTexts.titles[textIndex]}
          </h4>
          <p className="text-xs text-[#A1A1A1] leading-relaxed">
            {premiumTexts.subtitles[textIndex]}
          </p>
        </div>
      </div>
    );
  };

  const renderButton = () => {
    if (isLocked) {
      return (
        <Button 
          className="w-full relative overflow-hidden py-5 text-sm font-bold tracking-wider transition-all duration-300 border-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #FF4E4E 0%, #CC3E3E 100%)',
            boxShadow: '0 0 20px rgba(255,78,78,0.4), 0 4px 15px rgba(0,0,0,0.3)'
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
          className="w-full py-5 text-sm font-bold tracking-wider rounded-full bg-[#1A1A1A] text-[#666] border border-[#333] cursor-not-allowed"
        >
          EM BREVE
        </Button>
      );
    }

    if (isPreSale) {
      return (
        <Button 
          className="w-full relative overflow-hidden py-5 text-sm font-bold tracking-wider transition-all duration-300 border-0 rounded-full hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #00FF7F 0%, #00CC66 100%)',
            boxShadow: '0 0 25px rgba(0,255,127,0.4), 0 4px 15px rgba(0,0,0,0.3)'
          }}
          onClick={onClick}
        >
          <span className="relative z-10 text-black font-bold">GARANTIR VAGA</span>
        </Button>
      );
    }

    // Premium
    return (
      <Button 
        className="w-full relative overflow-hidden py-5 text-sm font-bold tracking-wider transition-all duration-300 border-0 rounded-full hover:scale-[1.02] group/btn"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          boxShadow: `0 0 25px ${colors.glow}, 0 4px 15px rgba(0,0,0,0.3)`
        }}
        onClick={onClick}
      >
        <span className="relative z-10 text-black font-bold">{premiumTexts.ctas[textIndex]}</span>
      </Button>
    );
  };

  // Determina cor da borda
  const getBorderStyle = () => {
    if (isLocked) {
      return {
        borderColor: '#FBBF24',
        boxShadow: '0 0 15px rgba(251,191,36,0.2), inset 0 0 30px rgba(0,0,0,0.5)'
      };
    }
    if (isDevelopment) {
      return {
        borderColor: '#00D4FF33',
        boxShadow: '0 0 12px rgba(0,212,255,0.15), inset 0 0 30px rgba(0,0,0,0.5)'
      };
    }
    if (isPreSale) {
      return {
        borderColor: '#00FF7F44',
        boxShadow: '0 0 15px rgba(0,255,127,0.2), inset 0 0 30px rgba(0,0,0,0.5)'
      };
    }
    return {
      borderColor: `${colors.primary}55`,
      boxShadow: `0 0 12px ${colors.glow}, inset 0 0 30px rgba(0,0,0,0.5)`
    };
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

      {/* IA Badge for Premium */}
      {isPremium && !isLocked && !isDevelopment && !isPreSale && (
        <div className="absolute top-3 right-3 z-20">
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: `1px solid ${colors.primary}44`,
              boxShadow: `0 0 10px ${colors.glow}`
            }}
          >
            <Sparkles 
              className="w-3 h-3" 
              style={{ color: colors.primary, filter: `drop-shadow(0 0 4px ${colors.primary})` }}
            />
            <span 
              className="text-[9px] font-bold tracking-wider"
              style={{ color: colors.primary }}
            >
              IA ATIVADA
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full min-h-[300px]">
        {/* Header with Icon */}
        <div className="pt-6 pb-4 flex flex-col items-center">
          {/* Icon Circle */}
          <div className="relative mb-4">
            <div 
              className="absolute inset-0 blur-xl opacity-40"
              style={{ backgroundColor: isLocked ? '#FBBF24' : isDevelopment ? '#00D4FF' : colors.primary }}
            />
            <div 
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: isLocked 
                  ? 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)'
                  : isDevelopment
                  ? 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.05) 100%)'
                  : `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}08 100%)`,
                boxShadow: isLocked 
                  ? '0 0 20px rgba(251,191,36,0.25)'
                  : isDevelopment
                  ? '0 0 20px rgba(0,212,255,0.25)'
                  : `0 0 20px ${colors.glow}`
              }}
            >
              <span 
                className="text-3xl"
                style={{ 
                  filter: isLocked 
                    ? 'drop-shadow(0 0 8px rgba(251,191,36,0.6)) grayscale(0.3)' 
                    : isDevelopment
                    ? 'drop-shadow(0 0 8px rgba(0,212,255,0.6)) grayscale(0.2)'
                    : `drop-shadow(0 0 8px ${colors.glow})`
                }}
              >
                {emoji}
              </span>
            </div>
          </div>
          
          {/* Sport Name */}
          <h3 
            className="text-lg font-bold text-white tracking-wide text-center"
            style={{
              textShadow: isLocked 
                ? 'none' 
                : isDevelopment
                ? '0 0 15px rgba(255,255,255,0.1)'
                : `0 0 15px rgba(255,255,255,0.2)`
            }}
          >
            {name}
          </h3>
        </div>

        {/* Content Area */}
        {renderContent()}

        {/* Button Area */}
        <div className="p-4 pt-2 mt-auto">
          {renderButton()}
        </div>
      </div>
    </div>
  );
};