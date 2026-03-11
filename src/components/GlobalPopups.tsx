import { useUserBettingHouse } from "@/hooks/useUserBettingHouse";
import { WelcomePopup } from "@/components/HousePopups";

/**
 * Wrapper rendered inside BrowserRouter so WelcomePopup
 * can use useLocation and react to route changes.
 */
export function GlobalPopups() {
  const { house } = useUserBettingHouse();
  return <WelcomePopup house={house} />;
}
