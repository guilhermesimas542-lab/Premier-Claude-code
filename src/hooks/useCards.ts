import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CardImageUrls {
  mobile?: string | null;
  tablet?: string | null;
  desktop?: string | null;
}

export interface CardData {
  id: string;
  slug: string | null;
  name: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_urls: CardImageUrls | null;
  card_type: string;
  category: string;
  badges: string[] | null;
  badge_color: string | null;
  button_text_access: string | null;
  button_text_acquire: string | null;
  button_bg_color: string | null;
  button_font_color: string | null;
  requires_access: boolean;
  access_field: string | null;
  checkout_url: string | null;
  pay_card_id: string | null;
  questions: any[];
  display_order: number;
  is_active: boolean;
}

export function useCards(category?: string) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      let query = supabase
        .from("cards" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      const { data } = await query;
      setCards((data as any as CardData[]) ?? []);
      setLoading(false);
    };
    fetchCards();
  }, [category]);

  return { cards, loading };
}

export function useCardsBySlugs(slugs: string[]) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedSlugs = slugs.map((s) => s.trim().toLowerCase()).filter(Boolean);

  useEffect(() => {
    const fetchCards = async () => {
      if (normalizedSlugs.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const slugOrFilter = normalizedSlugs.map((slug) => `slug.ilike.${slug}`).join(",");

      const { data } = await supabase
        .from("cards" as any)
        .select("*")
        .eq("is_active", true)
        .or(slugOrFilter)
        .order("display_order", { ascending: true });

      setCards((data as any as CardData[]) ?? []);
      setLoading(false);
    };
    fetchCards();
  }, [normalizedSlugs.join(",")]);

  return { cards, loading };
}
