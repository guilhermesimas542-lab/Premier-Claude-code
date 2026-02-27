// Event tracking - sends events to the /events Edge Function
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "premier_token";

/** Store the auth token returned by auth-login */
export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Get the stored auth token */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Clear the stored auth token */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Track an event by calling the /events Edge Function.
 * Silently fails if no token is available.
 */
export async function trackEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  try {
    const token = getToken();
    if (!token) return;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ event_name: eventName, metadata }),
      }
    );

    if (!res.ok) {
      console.warn(`[trackEvent] ${eventName} failed:`, res.status);
    }
  } catch (err) {
    console.warn(`[trackEvent] ${eventName} error:`, err);
  }
}
