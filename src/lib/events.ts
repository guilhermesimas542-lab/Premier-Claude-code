// Event tracking - sends events to the /events Edge Function

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

// ─── Device ID (persists forever) ──────────────────────────────────────────
function getDeviceId(): string {
  const KEY = "premier_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ─── Session ID with 30-min timeout ────────────────────────────────────────
function getSessionId(): string {
  const KEY_ID = "premier_session_id";
  const KEY_TS = "premier_session_ts";
  const TIMEOUT = 30 * 60 * 1000;

  const now = Date.now();
  const lastTs = parseInt(localStorage.getItem(KEY_TS) ?? "0", 10);
  let sessionId = localStorage.getItem(KEY_ID);

  if (!sessionId || now - lastTs > TIMEOUT) {
    sessionId = `${now}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(KEY_ID, sessionId);
  }
  localStorage.setItem(KEY_TS, String(now));
  return sessionId;
}

// ─── Universal properties ──────────────────────────────────────────────────
function getUniversalProps(): Record<string, unknown> {
  const ua = navigator.userAgent;
  let browser = "Other";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  let os = "Other";
  if (ua.includes("Android")) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  return {
    platform: "web",
    browser,
    os,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    referrer: document.referrer || null,
  };
}

/**
 * Track an event by calling the /events Edge Function.
 * Silently fails if no token is available.
 */
export async function trackEvent(
  eventName: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const token = getToken();
    if (!token) return;

    const houseId = localStorage.getItem("selected_house_id") ?? null;

    const payload = {
      event_name: eventName,
      metadata,
      screen: window.location.pathname,
      properties: {
        ...getUniversalProps(),
        ...metadata,
      },
      device_id: getDeviceId(),
      session_id: getSessionId(),
      event_id: crypto.randomUUID(),
      house_id: houseId,
    };

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    await fetch(
      `https://${projectId}.supabase.co/functions/v1/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify(payload),
      }
    );
  } catch {
    // Silencioso
  }
}
