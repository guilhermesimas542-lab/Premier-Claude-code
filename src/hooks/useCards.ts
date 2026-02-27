import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CardData {
  id: string;
  slug: string | null;
  name: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  card_type: string;
  category: string;
  badge_text: string | null;
  badge_color: string | null;
  button_text_access: string | null;
  button_text_acquire: string | null;
  requires_access: boolean;
  access_field: string | null;
  checkout_url: string | null;
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

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cards" as any)
        .select("*")
        .eq("is_active", true)
        .in("slug", slugs)
        .order("display_order", { ascending: true });
      setCards((data as any as CardData[]) ?? []);
      setLoading(false);
    };
    fetchCards();
  }, [slugs.join(",")]);

  return { cards, loading };
}
