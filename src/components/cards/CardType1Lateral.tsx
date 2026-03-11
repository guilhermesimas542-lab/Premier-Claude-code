import type { CardData } from "@/hooks/useCards";

interface Props {
  card: CardData;
  onAction: () => void;
}

function getBadgeStyle(color: string | null) {
  switch (color) {
    case "gold":
      return { background: "hsl(48 96% 53%)", color: "#000", border: "none" };
    case "green":
      return { background: "#22c55e", color: "#fff", border: "none" };
    case "black_green":
      return { background: "#000", color: "#00FF00", border: "1px solid #00FF00" };
    case "tron":
      return { background: "#000", color: "#00FFFF", border: "1px solid #00FFFF", boxShadow: "0 0 5px #00FFFF" };
    case "white":
      return { background: "#fff", color: "#000", border: "none" };
    default:
      return { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none" };
  }
}

export function CardType1Lateral({ card, onAction }: Props) {
  const imgs = card.image_urls;
  const mobileImg = imgs?.mobile || imgs?.tablet || imgs?.desktop || null;

  return (
    <button
      onClick={onAction}
      className="relative w-full overflow-hidden rounded-xl border border-white/[0.30] flex hover:-translate-y-0.5 hover:border-primary/50 transition-all duration-200 text-left group"
      style={{ background: "#112236", minHeight: "120px" }}
    >
      {/* Badges */}
      {card.badges && card.badges.length > 0 && (
        <div className="absolute top-2 right-2 z-20 flex gap-1 flex-wrap justify-end">
          {card.badges.map((badge) => {
            const style = getBadgeStyle(card.badge_color);
            return (
              <span
                key={badge}
                className="px-2.5 py-0.5 rounded-md text-[10px] font-bold"
                style={style}
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
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-center gap-2">
        <h3 className="text-foreground font-bold text-base">{card.title}</h3>
        {card.subtitle && (
          <p className="text-xs text-muted-foreground">{card.subtitle}</p>
        )}
        <span
          className="w-full h-8 text-xs font-bold rounded-lg flex items-center justify-center group-hover:opacity-90 transition-colors"
          style={{
            background: card.button_bg_color || "hsl(var(--primary))",
            color: card.button_font_color || "hsl(var(--primary-foreground))",
          }}
        >
          {card.button_text_access || "Acessar"}
        </span>
      </div>
    </button>
  );
}
