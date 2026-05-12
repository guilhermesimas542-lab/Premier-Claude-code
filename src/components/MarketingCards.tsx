import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import { SalesFunnel } from "./SalesFunnel";
import { mockGetUser } from "@/mocks/user";

interface Card {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  card_type: string;
  checkout_url: string | null;
  target_audience: string;
  display_order: number;
}

interface FunnelStep {
  id: string;
  step_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
}

export function MarketingCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [funnelOpen, setFunnelOpen] = useState(false);

  const user = mockGetUser();
  const userTier = "ultra"; // MockUser always has ULTRA plan

  useEffect(() => {
    const fetchCards = async () => {
      const { data } = await supabase
        .from("cards" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setCards((data as any as Card[]) ?? []);
    };
    fetchCards();
  }, []);

  const isLocked = (card: Card) => {
    if (card.target_audience === "all") return false;
    const tierHierarchy = ["free", "basic", "pro", "ultra"];
    const userLevel = tierHierarchy.indexOf(userTier);
    const requiredLevel = tierHierarchy.indexOf(card.target_audience);
    return userLevel < requiredLevel;
  };

  const openFunnel = async (card: Card) => {
    const { data } = await supabase
      .from("funnel_steps" as any)
      .select("*")
      .eq("card_id", card.id)
      .order("step_order", { ascending: true });
    setFunnelSteps((data as any as FunnelStep[]) ?? []);
    setSelectedCard(card);
    setFunnelOpen(true);
  };

  if (cards.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 w-full">
        {cards.map((card) => {
          const locked = isLocked(card);
          const isCheckoutLink = card.card_type !== "funnel" && !!card.checkout_url;
          const cardClassName = `cta-checkout relative rounded-xl overflow-hidden border border-border/30 text-left block transition-transform hover:scale-[1.02] active:scale-[0.98] ${locked ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`;
          const cardId = `cta-checkout-marketing-card-${card.id}`;

          const inner = (
            <>
              {card.image_url ? (
                <img src={card.image_url} alt={card.title} className="w-full h-28 object-cover" />
              ) : (
                <div className="w-full h-28 bg-gradient-to-br from-primary/20 to-accent/20" />
              )}
              <div className="p-3">
                <h4 className="text-sm font-semibold text-foreground leading-tight truncate">{card.title}</h4>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.subtitle}</p>
                )}
              </div>
              {locked && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                  <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </>
          );

          if (isCheckoutLink) {
            return (
              <a
                key={card.id}
                href={card.checkout_url!}
                id={cardId}
                className={cardClassName}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={locked}
              >
                {inner}
              </a>
            );
          }

          return (
            <button
              key={card.id}
              id={cardId}
              onClick={() => !locked && card.card_type === "funnel" ? openFunnel(card) : undefined}
              className={cardClassName}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {selectedCard && (
        <SalesFunnel
          open={funnelOpen}
          onClose={() => { setFunnelOpen(false); setSelectedCard(null); }}
          steps={funnelSteps}
          checkoutUrl={selectedCard.checkout_url}
          cardTitle={selectedCard.title}
        />
      )}
    </>
  );
}
