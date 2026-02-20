import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BettingHouse } from "../pages/AdminBettingHouses";

interface BettingHouseContextValue {
  houses: BettingHouse[];
  selectedHouseId: string | null;
  selectedHouse: BettingHouse | null;
  setSelectedHouseId: (id: string) => void;
  loading: boolean;
}

const BettingHouseContext = createContext<BettingHouseContextValue>({
  houses: [],
  selectedHouseId: null,
  selectedHouse: null,
  setSelectedHouseId: () => {},
  loading: true,
});

const STORAGE_KEY = "admin_selected_house_id";

export function BettingHouseProvider({ children }: { children: ReactNode }) {
  const [houses, setHouses] = useState<BettingHouse[]>([]);
  const [selectedHouseId, setSelectedHouseIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHouses = async () => {
      const { data } = await supabase
        .from("betting_houses")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      const list = (data as BettingHouse[]) ?? [];
      setHouses(list);

      // Auto-select: restore saved, or pick default, or first
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && list.find((h) => h.id === saved)) {
        setSelectedHouseIdState(saved);
      } else {
        const def = list.find((h) => h.is_default) ?? list[0];
        if (def) {
          setSelectedHouseIdState(def.id);
          localStorage.setItem(STORAGE_KEY, def.id);
        }
      }
      setLoading(false);
    };
    fetchHouses();
  }, []);

  const setSelectedHouseId = (id: string) => {
    setSelectedHouseIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const selectedHouse = houses.find((h) => h.id === selectedHouseId) ?? null;

  return (
    <BettingHouseContext.Provider value={{ houses, selectedHouseId, selectedHouse, setSelectedHouseId, loading }}>
      {children}
    </BettingHouseContext.Provider>
  );
}

export function useBettingHouseAdmin() {
  return useContext(BettingHouseContext);
}
