import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

export interface BettingHouseData {
  id: string;
  name: string;
  slug: string;
  iframe_url: string;
  is_default: boolean;
  open_in_new_tab: boolean;
  force_sports_link_new_tab: boolean;
}

export function useUserBettingHouse() {
  const [house, setHouse] = useState<BettingHouseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHouse = async () => {
      const mockUser = mockGetUser();
      if (!mockUser) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from("users")
        .select("betting_house_id")
        .eq("email", mockUser.email.toLowerCase().trim())
        .single();

      let houseId = userData?.betting_house_id;

      if (!houseId) {
        const { data: defaultHouse } = await supabase
          .from("betting_houses")
          .select("id")
          .eq("is_default", true)
          .eq("is_active", true)
          .single();
        houseId = defaultHouse?.id;
      }

      if (houseId) {
        const { data: houseData } = await supabase
          .from("betting_houses")
          .select("id, name, slug, iframe_url, is_default, open_in_new_tab, force_sports_link_new_tab")
          .eq("id", houseId)
          .single();
        setHouse(houseData as BettingHouseData);
      }

      setLoading(false);
    };

    fetchHouse();
  }, []);

  return { house, loading };
}
