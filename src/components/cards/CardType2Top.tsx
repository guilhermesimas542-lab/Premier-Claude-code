import { Lock } from "lucide-react";
import type { CardData } from "@/hooks/useCards";

interface Props {
  card: CardData;
  hasAccess: boolean;
  onAction: () => void;
}

export function CardType2Top({ card, hasAccess, onAction }: Props) {
  const showLocked = card.requires_access && !hasAccess;

  return (
    <button
      onClick={onAction}
      className="relative w-full overflow-hidden rounded-xl border border-white/10 hover:-translate-y-0.5 hover:border-primary/50 transition-all duration-200 text-left group"
      style={{ background: "hsl(0 0% 7%)" }}
    >
      {/* Badge */}
      {card.badge_text && (
        <span
          className="absolute -top-2 right-2 z-20 px-2 py-0.5 rounded-md text-[9px] font-bold"
          style={{
            background: card.badge_color === "gold" ? "hsl(48 96% 53%)" : "hsl(var(--primary))",
            color: card.badge_color === "gold" ? "#000" : "hsl(var(--primary-foreground))",
          }}
        >
          {card.badge_text}
        </span>
      )}

      {/* Image area */}
      <div className="relative h-32">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover rounded-t-xl" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl rounded-t-xl" style={{ background: "hsl(0 0% 10%)" }}>
            {card.icon || "📦"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_7%)] via-transparent to-transparent" />

        {/* Lock overlay */}
        {showLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="w-8 h-8 text-white/60" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-foreground font-bold text-base truncate mb-1">{card.title}</h3>
        {card.subtitle && (
          <p className="text-xs text-muted-foreground truncate mb-2">{card.subtitle}</p>
        )}

        {showLocked ? (
          <span className="w-full h-9 text-sm font-bold bg-orange-500 text-white rounded-lg flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            {card.button_text_acquire || "Adquirir Agora"}
          </span>
        ) : (
          <span className="w-full h-9 text-sm font-bold bg-primary text-primary-foreground rounded-lg flex items-center justify-center group-hover:bg-primary/90 transition-colors">
            {card.button_text_access || "Acessar"}
          </span>
        )}
      </div>
    </button>
  );
}
