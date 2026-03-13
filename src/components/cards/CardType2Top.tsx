import type { CardData } from "@/hooks/useCards";

interface Props {
  card: CardData;
  hasAccess: boolean;
  onAction: () => void;
}

const CardType2Top = ({ card, hasAccess, onAction }: Props) => {
  const imageUrl = card.image_urls?.mobile || card.image_urls?.tablet || card.image_urls?.desktop || null;

  return (
    <div
      onClick={onAction}
      style={{
        background: '#112236',
        border: '1.5px solid rgba(255,255,255,0.22)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        cursor: 'pointer',
      }}
    >
      {/* Área da imagem — quadrada 1:1 */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.title || card.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              borderRadius: '10px 10px 0 0',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px 10px 0 0',
          }} />
        )}

        {/* Overlay de bloqueio — só aparece quando !hasAccess */}
        {!hasAccess && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6,13,30,0.75)',
            borderRadius: '10px 10px 0 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            {/* Cadeado branco 28px */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/>
            </svg>
            {/* Linha separadora */}
            <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}
      </div>

      {/* Área de texto e botão */}
      <div style={{ padding: '10px 10px 12px 10px', display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '15px',
          color: '#FFFFFF',
          lineHeight: 1.2,
        }}>
          {card.title || card.name}
        </span>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: '11px',
          color: '#94A3B8',
          lineHeight: 1.3,
          marginBottom: '6px',
        }}>
          {hasAccess ? (card.subtitle || '') : 'Desbloqueie para acessar'}
        </span>

        {/* Botão — verde se liberado, outline branco se bloqueado */}
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
            ...(hasAccess
              ? {
                  background: card.button_bg_color || '#00FF7F',
                  border: 'none',
                  color: card.button_font_color || '#000000',
                }
              : {
                  background: 'transparent',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  color: '#FFFFFF',
                }),
          }}
        >
          {hasAccess ? 'ACESSAR' : 'DESBLOQUEAR'}
        </button>
      </div>
    </div>
  );
};

export default CardType2Top;
