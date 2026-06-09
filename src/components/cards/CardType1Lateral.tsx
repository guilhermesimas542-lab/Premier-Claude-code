import type { CardData } from "@/hooks/useCards";

interface Props {
  card: CardData;
  hasAccess?: boolean;
  onAction: () => void;
}

function getBadgeStyle(badgeText: string, color: string | null) {
  // Specific badge styling per PDF spec
  const upper = (badgeText || '').toUpperCase();
  if (upper.includes('IA') || upper.includes('ATIVADA') || color === 'green') {
    return {
      background: 'rgba(0,255,127,0.15)',
      border: '1px solid rgba(0,255,127,0.3)',
      color: '#00FF7F',
    };
  }
  if (upper.includes('NOVO') || color === 'gold') {
    return {
      background: 'rgba(240,180,41,0.15)',
      border: '1px solid rgba(240,180,41,0.3)',
      color: '#F0B429',
    };
  }
  if (upper.includes('BETA') || color === 'white') {
    return {
      background: 'rgba(148,163,184,0.15)',
      border: '1px solid rgba(148,163,184,0.3)',
      color: '#94A3B8',
    };
  }
  if (color === 'black_green') {
    return { background: "#000", color: "#00FF7F", border: "1px solid #00FF7F" };
  }
  if (color === 'tron') {
    return { background: "#000", color: "#00FFFF", border: "1px solid #00FFFF", boxShadow: "0 0 5px #00FFFF" };
  }
  // default
  return {
    background: 'rgba(0,255,127,0.15)',
    border: '1px solid rgba(0,255,127,0.3)',
    color: '#00FF7F',
  };
}

function isGreenColor(c: string | null): boolean {
  if (!c) return false;
  const lower = c.toLowerCase();
  return lower === '#00e87a' || lower === '#00ff7f' || lower.includes('00e87a') || lower.includes('00ff7f');
}

export function CardType1Lateral({ card, hasAccess = true, onAction }: Props) {
  const imgs = card.image_urls;
  const mobileImg = imgs?.mobile || imgs?.tablet || imgs?.desktop || null;
  const locked = !hasAccess;

  // Copa: botões em dourado (sobrescreve a cor do banco pro tema da Copa)
  const buttonBg = '#F2C84B';
  const buttonColor = '#0a0f08';

  return (
    <button
      onClick={onAction}
      className="relative w-full overflow-hidden rounded-xl border border-[#E0B341]/35 flex hover:-translate-y-0.5 hover:border-[#E0B341]/70 transition-all duration-200 text-left group"
      style={{ background: "#112236", minHeight: "120px" }}
    >
      {/* Badges */}
      {card.badges && card.badges.length > 0 && (
        <div className="absolute top-2 right-2 z-20 flex gap-1 flex-wrap justify-end">
          {card.badges.map((badge) => {
            const style = getBadgeStyle(badge, card.badge_color);
            return (
              <span
                key={badge}
                className="px-2.5 py-0.5 rounded-md"
                style={{
                  ...style,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '1px',
                }}
              >
                {badge}
              </span>
            );
          })}
        </div>
      )}

      {/* Image — fixed 100x120 portrait container */}
      <div className="relative shrink-0 w-[100px] h-[120px]">
        {mobileImg ? (
          <img src={mobileImg} alt={card.name} className="w-full h-full object-cover rounded-l-xl" />
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-l-xl" style={{ background: "hsl(0 0% 10%)" }}>
            <span className="text-3xl text-muted-foreground">📦</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent, #112236)" }} />
        {locked && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-l-xl"
            style={{ background: 'rgba(6,13,30,0.75)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-center gap-2">
        <h3 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '20px',
          color: '#FFFFFF',
        }}>{card.title}</h3>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: '12px',
          color: '#94A3B8',
        }}>{locked ? 'Desbloqueie para acessar' : (card.subtitle || '')}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onAction(); }}
          style={{
            width: '100%',
            padding: '8px 0',
            borderRadius: '8px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            ...(locked
              ? { background: 'transparent', border: '1px solid #FFFFFF', color: '#FFFFFF' }
              : { background: buttonBg, color: buttonColor, border: 'none' }),
          }}
        >
          {locked ? 'DESBLOQUEAR' : (card.button_text_access || 'ACESSAR')}
        </button>
      </div>
    </button>
  );
}
