import type { CardData } from "@/hooks/useCards";

interface Props {
  card: CardData;
  onAction: () => void;
}

export function CardType1Lateral({ card, onAction }: Props) {
  return (
    <button
      onClick={onAction}
      className="relative w-full overflow-hidden rounded-xl border border-white/10 flex hover:-translate-y-0.5 hover:border-primary/50 transition-all duration-200 text-left group"
      style={{ background: "hsl(0 0% 7%)" }}
    >
      {/* Badge */}
      {card.badge_text && (
        <span
          className="absolute -top-2.5 right-3 z-20 px-2.5 py-0.5 rounded-md text-[10px] font-bold"
          style={{
            background: card.badge_color === "gold" ? "hsl(48 96% 53%)" : "hsl(var(--primary))",
            color: card.badge_color === "gold" ? "#000" : "hsl(var(--primary-foreground))",
          }}
        >
          {card.badge_text}
        </span>
      )}

      {/* Image */}
      <div className="relative w-[40%] min-h-[120px] shrink-0">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover rounded-l-xl" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl rounded-l-xl" style={{ background: "hsl(0 0% 10%)" }}>
            {card.icon || "📦"}
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent, hsl(0 0% 7%))" }} />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-center gap-2">
        <h3 className="text-foreground font-bold text-base">{card.title}</h3>
        {card.subtitle && (
          <p className="text-xs text-muted-foreground">{card.subtitle}</p>
        )}
        <span className="w-full h-8 text-xs font-bold bg-primary text-primary-foreground rounded-lg flex items-center justify-center group-hover:bg-primary/90 transition-colors">
          {card.button_text_access || "Acessar"}
        </span>
      </div>
    </button>
  );
}
