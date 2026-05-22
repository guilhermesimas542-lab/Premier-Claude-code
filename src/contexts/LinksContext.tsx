import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockGetUser } from "@/mocks/user";

interface LinksData {
  support_whatsapp_url: string | null;
  acquire_access_url: string | null;
  telegram_group_url: string | null;
  iframe_url: string | null;
}

const DEFAULT_LINKS: LinksData = {
  support_whatsapp_url: null,
  acquire_access_url: null,
  telegram_group_url: null,
  iframe_url: null,
};

interface LinksContextValue {
  links: LinksData;
  loading: boolean;
}

const LinksContext = createContext<LinksContextValue>({
  links: DEFAULT_LINKS,
  loading: true,
});

export function LinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<LinksData>(DEFAULT_LINKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      const mockUser = mockGetUser();

      let houseId: string | null = null;

      if (mockUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("betting_house_id")
          .eq("email", mockUser.email.toLowerCase().trim())
          .single();
        houseId = userData?.betting_house_id ?? null;
      }

      if (!houseId) {
        const { data: defaultHouse } = await supabase
          .from("betting_houses")
          .select("id")
          .eq("is_default", true)
          .eq("is_active", true)
          .single();
        houseId = defaultHouse?.id ?? null;
      }

      if (houseId) {
        const { data } = await supabase
          .from("betting_houses")
          .select("support_whatsapp_url, acquire_access_url, telegram_group_url, iframe_url")
          .eq("id", houseId)
          .single();

        if (data) {
          setLinks({
            support_whatsapp_url: (data as any).support_whatsapp_url ?? null,
            acquire_access_url: (data as any).acquire_access_url ?? null,
            telegram_group_url: (data as any).telegram_group_url ?? null,
            iframe_url: (data as any).iframe_url ?? null,
          });
        }
      }

      setLoading(false);
    };

    fetchLinks();

    const handler = () => fetchLinks();
    window.addEventListener("premier:login", handler);
    return () => window.removeEventListener("premier:login", handler);
  }, []);

  return (
    <LinksContext.Provider value={{ links, loading }}>
      {children}
    </LinksContext.Provider>
  );
}

export function useLinks() {
  return useContext(LinksContext);
}
