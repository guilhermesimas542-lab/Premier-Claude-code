import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/events";

export function AnalyticsRouteTracker() {
  const location = useLocation();
  const prevScreen = useRef<string | null>(null);
  const enterTime = useRef<number>(Date.now());

  useEffect(() => {
    const currentScreen = location.pathname;

    // Ignore admin routes
    if (currentScreen.startsWith("/admin")) return;

    // screen_time for previous screen
    if (prevScreen.current && prevScreen.current !== currentScreen) {
      const seconds = Math.round((Date.now() - enterTime.current) / 1000);
      trackEvent("screen_time", {
        screen: prevScreen.current,
        seconds,
      });
    }

    // screen_view (unified — page_view removed to avoid duplicates)
    trackEvent("screen_view", { screen: currentScreen });

    prevScreen.current = currentScreen;
    enterTime.current = Date.now();
  }, [location.pathname]);

  // session_start once per mount
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    trackEvent("session_start", { screen: location.pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
