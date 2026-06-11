import { Sparkles, ArrowRight } from "lucide-react";
import AnimatedFootballIcon from "@/components/AnimatedFootballIcon";


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
  onClick?: () => void;
}

const premiumTexts = {
  titles: ["Tips de Hoy", "Análisis Liberado", "Panel Actualizado"],
  subtitles: [
    "La IA detectó nuevas oportunidades",
    "Señales validadas y actualizadas",
    "Precisión aumentada en los últimos análisis"
  ],
  ctas: ["ACCEDER AHORA", "VER TIPS", "ABRIR PANEL"]
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
  onClick
}: PremiumSportCardProps) => {
  const textIndex = id % 3;

  const renderContent = () => {
    if (isLocked) {
      return (
        <div className="flex flex-col justify-center space-y-1">
          <h4 className="text-xs font-bold text-[#FF4E4E] tracking-wide">Contenido Exclusivo</h4>
          <p className="text-[10px] text-[#A1A1A1] leading-relaxed">
            Desbloquea el acceso para ver tips avanzados
          </p>
        </div>
      );
    }

    if (isDevelopment) {
      return (
        <div className="flex flex-col justify-center space-y-1">
          <h4 className="text-xs font-bold text-[#888888] tracking-wide">Próximamente</h4>
          <p className="text-[10px] text-[#666666]">Disponible próximamente</p>
        </div>
      );
    }

    if (isPreSale) {
      return (
        <div className="flex flex-col justify-center space-y-1">
          <h4 className="text-xs font-bold text-[#eac064] tracking-wide">Lançamento Exclusivo</h4>
          {countdown && (
            <div className="flex gap-0.5">
              {[
                { value: countdown.days, label: 'd', show: (countdown.days ?? 0) > 0 },
                { value: countdown.hours, label: 'h', show: true },
                { value: countdown.minutes, label: 'm', show: true },
                { value: countdown.seconds, label: 's', show: true }
              ].filter(item => item.show).map((item, i, arr) => (
                <div key={i} className="flex items-center">
                  <div className="bg-[#0A0A0A] rounded px-1 py-0.5 border border-[#eac064]/20">
                    <span className="text-[10px] font-bold text-white">{String(item.value).padStart(2, '0')}</span>
                    <span className="text-[8px] text-[#A1A1A1] ml-0.5">{item.label}</span>
                  </div>
                  {i < arr.length - 1 && <span className="text-[#eac064] mx-0.5 text-[10px]">:</span>}
                </div>
              ))}
            </div>
          )}
          {priceFrom && priceTo && (
            <div>
              <p className="text-[10px] text-[#A1A1A1] line-through">{priceFrom}</p>
              <p className="text-sm font-bold text-[#eac064]">{priceTo}</p>
            </div>
          )}
        </div>
      );
    }

    const isFutebol = id === 1;
    const displayTitle = premiumTexts.titles[textIndex];
    const displaySubtitle = isFutebol && sportSubheadline
      ? sportSubheadline
      : premiumTexts.subtitles[textIndex];

    return (
      <div className="flex flex-col space-y-0.5">
        <style>{`
          @keyframes live-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.7); }
          }
        `}</style>
        <h4 className="text-sm font-extrabold tracking-wide leading-tight text-white">
          {displayTitle}
        </h4>
        {isFutebol ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#eac064",
                boxShadow: "0 0 6px rgba(234, 192, 100,0.8)",
                animation: "live-pulse 1.4s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: "#00CC00" }}>
              Actualizado ahora
            </span>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed" style={{ color: '#888888' }}>{displaySubtitle}</p>
        )}
      </div>
    );
  };

  const renderButtonCompact = () => {
    if (isLocked) {
      return (
        <button
          className="relative overflow-hidden px-3 py-2 text-[10px] font-bold tracking-wider transition-all duration-300 rounded-full border-0 whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, #FF4E4E 0%, #CC3E3E 100%)',
            boxShadow: '0 0 12px rgba(255,78,78,0.4)',
            color: '#FFFFFF'
          }}
          onClick={onClick}
        >
          DESBLOQUEAR
        </button>
      );
    }

    if (isDevelopment) {
      return (
        <button
          disabled
          className="px-3 py-2 text-[10px] font-bold tracking-wider rounded-full bg-[#1A1A1A] text-[#666] border border-[#333] cursor-not-allowed whitespace-nowrap"
        >
          PRÓXIMAMENTE
        </button>
      );
    }

    if (isPreSale) {
      return (
        <button
          className="relative overflow-hidden px-3 py-2 text-[10px] font-bold tracking-wider transition-all duration-300 rounded-full border-0 whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, #eac064 0%, #00CC66 100%)',
            boxShadow: '0 0 16px rgba(234, 192, 100,0.4)',
            color: '#000000'
          }}
          onClick={onClick}
        >
          ASEGURAR
        </button>
      );
    }

    return (
      <button
        className="relative overflow-hidden px-3 py-2 text-[10px] font-bold tracking-wider transition-all duration-300 rounded-full border-0 whitespace-nowrap"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          boxShadow: `0 0 16px ${colors.glow}`,
          color: '#000000'
        }}
        onClick={onClick}
      >
        {premiumTexts.ctas[textIndex]}
      </button>
    );
  };

  // Keep old renderButton for backwards compat (unused in new layout but kept to avoid errors)
  const renderButton = renderButtonCompact;

  const getBorderStyle = () => {
    if (isLocked) return { borderColor: '#FBBF24', boxShadow: '0 0 12px rgba(251,191,36,0.2)' };
    if (isDevelopment) return { borderColor: '#00D4FF33', boxShadow: '0 0 8px rgba(0,212,255,0.1)' };
    if (isPreSale) return { borderColor: '#eac06444', boxShadow: '0 0 12px rgba(234, 192, 100,0.15)' };
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
        border: '2px solid',
        minHeight: '110px',
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
            isPreSale ? 'rgba(234, 192, 100,0.05)' :
            `${colors.primary}08`
          } 50%, transparent 100%)`
        }}
      />

      {/* Badge LIVE / IA */}
      {isPremium && !isLocked && !isDevelopment && !isPreSale && (
        <div className="absolute top-2 right-2 z-20">
          {id === 1 ? (
            /* LIVE badge — futebol */
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full backdrop-blur-sm"
              style={{
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid rgba(234, 192, 100,0.45)',
                boxShadow: '0 0 8px rgba(234, 192, 100,0.35)',
              }}
            >
              <span
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#eac064',
                  boxShadow: '0 0 4px rgba(234, 192, 100,0.9)',
                  display: 'inline-block',
                  animation: 'live-pulse 1.4s ease-in-out infinite',
                  flexShrink: 0,
                }}
              />
              <span className="text-[8px] font-bold tracking-wider" style={{ color: '#eac064' }}>LIVE</span>
            </div>
          ) : (
            /* Padrão — outros cards premium */
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full backdrop-blur-sm"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${colors.primary}44`,
                boxShadow: `0 0 8px ${colors.glow}`,
              }}
            >
              <Sparkles className="w-2 h-2" style={{ color: colors.primary }} />
              <span className="text-[8px] font-bold tracking-wider" style={{ color: colors.primary }}>IA ACTIVADA</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3" style={{ minHeight: '110px' }}>
        {/* Icon (left side) */}
        <div className="shrink-0">
          <div className="relative">
            {!(id === 1 && isPremium) && (
              <div
                className="absolute inset-0 blur-xl opacity-40"
                style={{ backgroundColor: isLocked ? '#FBBF24' : isDevelopment ? '#00D4FF' : colors.primary }}
              />
            )}
            <div
              className="relative flex items-center justify-center"
              style={{
                width: id === 1 && isPremium ? 90 : 50,
                height: id === 1 && isPremium ? 90 : 50,
                borderRadius: id === 1 && isPremium ? 0 : '50%',
                background: id === 1 && isPremium
                  ? 'transparent'
                  : isLocked
                  ? 'rgba(251,191,36,0.12)'
                  : isDevelopment
                  ? 'rgba(0,212,255,0.12)'
                  : `${colors.primary}15`,
                boxShadow: id === 1 && isPremium
                  ? 'none'
                  : isLocked
                  ? '0 0 14px rgba(251,191,36,0.25)'
                  : isDevelopment
                  ? '0 0 14px rgba(0,212,255,0.25)'
                  : `0 0 14px ${colors.glow}`
              }}
            >
              {id === 1 && isPremium ? (
                <AnimatedFootballIcon />
              ) : (
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
              )}
            </div>
          </div>
        </div>

        {/* Content + Button (right side) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ minHeight: '80px' }}>
          {/* Title + Description on top */}
          <div className="flex-1">
            {renderContent()}
          </div>
          {/* Button on bottom-right */}
          <div className="flex justify-end mt-2">
            {renderButtonCompact()}
          </div>
        </div>
      </div>
    </div>
  );
};
