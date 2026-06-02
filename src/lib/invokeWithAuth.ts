import { supabase } from "@/integrations/supabase/client";

type TokenPayload = {
  user_id: string;
  email: string;
  tier: string;
  exp: number;
};

const REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6h
const TOKEN_KEY = "premier_token";

let refreshPromise: Promise<string | null> | null = null;

function decodeToken(token: string | null): TokenPayload | null {
  if (!token) return null;
  try {
    return JSON.parse(atob(token)) as TokenPayload;
  } catch {
    return null;
  }
}

function getCurrentToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuthAndRedirect(reason: string): void {
  console.warn("[invokeWithAuth] auth perdido:", reason);
  localStorage.removeItem(TOKEN_KEY);
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const current = getCurrentToken();
      const decoded = decodeToken(current);
      if (!decoded?.email) {
        console.warn("[invokeWithAuth] token irrecuperável, sem email");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("auth-login", {
        body: { email: decoded.email },
      });

      if (error || !(data as any)?.token) {
        console.error("[invokeWithAuth] refresh falhou:", error || data);
        return null;
      }

      setToken((data as any).token);
      console.log("[invokeWithAuth] token renovado");
      return (data as any).token as string;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function invokeWithAuth<T = any>(
  functionName: string,
  options: { body?: any; headers?: Record<string, string> } = {}
): Promise<{ data: T | null; error: any }> {
  let token = getCurrentToken();
  let decoded = decodeToken(token);

  // Refresh proativo se token expira em < 6h
  if (decoded && decoded.exp - Date.now() < REFRESH_THRESHOLD_MS) {
    const newToken = await refreshToken();
    if (newToken) {
      token = newToken;
      decoded = decodeToken(newToken);
    }
  }

  if (!token) {
    clearAuthAndRedirect("token_ausente");
    return { data: null, error: { message: "no_token" } };
  }

  const headers = {
    ...(options.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };

  const firstAttempt = await supabase.functions.invoke<T>(functionName, {
    body: options.body,
    headers,
  });

  if (!firstAttempt.error) {
    return firstAttempt;
  }

  // Só retenta em 401 (token expirado). Outros status (402, 429, 500, 503...)
  // são erros legítimos e devem ser propagados pro caller tratar.
  const status =
    (firstAttempt.error as any)?.context?.status ??
    (firstAttempt.error as any)?.status;
  if (status && status !== 401) {
    return firstAttempt;
  }

  console.log("[invokeWithAuth] 401 detectado, fazendo refresh + retry...");
  const newToken = await refreshToken();
  if (!newToken) {
    clearAuthAndRedirect("refresh_falhou");
    return { data: null, error: { message: "refresh_failed" } };
  }

  return await supabase.functions.invoke<T>(functionName, {
    body: options.body,
    headers: { ...(options.headers ?? {}), Authorization: `Bearer ${newToken}` },
  });
}
