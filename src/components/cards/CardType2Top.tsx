import type { CardData } from "@/hooks/useCards";

interface Props {
  card: CardData;
  hasAccess: boolean;
  onAction: () => void;
}

function getBadgeStyle(badgeText: string, color: string | null) {
  const upper = (badgeText || '').toUpperCase();
  if (upper.includes('IA') || upper.includes('ATIVADA') || color === 'green') {
    return { background: 'rgba(0,255,127,0.15)', border: '1px solid rgba(0,255,127,0.3)', color: '#00FF7F' };
  }
  if (upper.includes('NOVO') || color === 'gold') {
    return { background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.3)', color: '#F0B429' };
  }
  if (upper.includes('BETA') || color === 'white') {
    return { background: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.3)', color: '#94A3B8' };
  }
  if (color === 'black_green') {
    return { background: "#000", color: "#00FF7F", border: "1px solid #00FF7F" };
  }
  if (color === 'tron') {
    return { background: "#000", color: "#00FFFF", border: "1px solid #00FFFF" };
  }
  return { background: 'rgba(0,255,127,0.15)', border: '1px solid rgba(0,255,127,0.3)', color: '#00FF7F' };
}

function isGreenColor(c: string | null): boolean {
  if (!c) return false;
  const lower = c.toLowerCase();
  return lower === '#00e87a' || lower === '#00ff7f' || lower.includes('00e87a') || lower.includes('00ff7f');
}

export function CardType2Top({ card, hasAccess, onAction }: Props) {
  const showLocked = card.requires_access && !hasAccess;
  const imgs = card.image_urls;
  const mobileImg = imgs?.mobile || imgs?.tablet || imgs?.desktop || null;

  const buttonBg = card.button_bg_color || "hsl(var(--primary))";
  const buttonColor = isGreenColor(card.button_bg_color)
    ? '#000000'
    : (card.button_font_color || "hsl(var(--primary-foreground))");

  return (
    <button
      onClick={onAction}
      className="relative w-full overflow-hidden rounded-xl border border-white/[0.30] hover:-translate-y-0.5 hover:border-primary/50 transition-all duration-200 text-left group"
      style={{ background: "#112236" }}
    >
      {/* Badges */}
      {card.badges && card.badges.length > 0 && (
        <div className="absolute top-2 right-2 z-20 flex gap-1 flex-wrap justify-end">
          {card.badges.map((badge) => {
            const style = getBadgeStyle(badge, card.badge_color);
            return (
              <span
                key={badge}
                className="px-2 py-0.5 rounded-md"
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

      {/* Image area */}
      <div className="relative w-full overflow-hidden" style={{ height: "180px" }}>
        {mobileImg ? (
          <picture>
            {imgs?.desktop && <source media="(min-width: 1024px)" srcSet={imgs.desktop} />}
            {imgs?.tablet && <source media="(min-width: 768px)" srcSet={imgs.tablet} />}
            <img src={mobileImg} alt={card.name} className="w-full h-full object-cover rounded-t-xl" />
          </picture>
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-t-xl" style={{ background: "hsl(0 0% 10%)" }}>
            <span className="text-4xl text-muted-foreground">📦</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#112236] via-transparent to-transparent" />

        {/* Lock overlay — redesigned */}
        {showLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}>
            {/* Padlock icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.7 }}>
              <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm3 10H9V7c0-1.66 1.34-3 3-3s3 1.34 3 3v5z"/>
            </svg>
            {/* Separator */}
            <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.3)', margin: '8px 0' }} />
            {/* Price if available */}
            {(card as any).price && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '16px',
                color: '#FFFFFF',
              }}>
                {(card as any).price}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="truncate mb-1" style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '20px',
          color: '#FFFFFF',
        }}>{card.title}</h3>
        {card.subtitle && (
          <p className="truncate mb-2" style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            fontSize: '13px',
            color: showLocked ? '#94A3B8' : '#94A3B8',
          }}>{showLocked ? 'Desbloqueie para acessar' : card.subtitle}</p>
        )}

        {showLocked ? (
          <span
            className="w-full h-9 flex items-center justify-center"
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '14px',
              letterSpacing: '1px',
              cursor: 'pointer',
            }}
          >
            DESBLOQUEAR
          </span>
        ) : (
          <span
            className="w-full h-9 text-sm rounded-lg flex items-center justify-center group-hover:opacity-90 transition-colors"
            style={{
              background: buttonBg,
              color: buttonColor,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            {card.button_text_access || "Acessar"}
          </span>
        )}
      </div>
    </button>
  );
}
