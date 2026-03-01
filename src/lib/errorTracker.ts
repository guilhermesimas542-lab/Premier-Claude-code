const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getHouseId(): string | null {
  try {
    return localStorage.getItem('admin_selected_house_id') ?? null;
  } catch {
    return null;
  }
}

function getUserEmail(): string | null {
  try {
    const raw = localStorage.getItem('premier_user_email');
    return raw ?? null;
  } catch {
    return null;
  }
}

async function sendError(error: Error, component?: string): Promise<void> {
  try {
    const fingerprint = `${error.name}:${error.message}`.slice(0, 200);
    const payload = {
      user_email: getUserEmail(),
      error_message: error.message,
      error_stack: error.stack?.slice(0, 2000) ?? null,
      error_fingerprint: fingerprint,
      screen: window.location.pathname,
      component: component ?? null,
      properties: {},
    };

    await fetch(`${SUPABASE_URL}/rest/v1/app_errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent — never let the error tracker cause more errors
  }
}

export function trackError(error: Error, component?: string): void {
  sendError(error, component);
}

export function installGlobalErrorTracker(): void {
  window.addEventListener('error', (event) => {
    if (event.error instanceof Error) {
      trackError(event.error, 'window.error');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const error =
      reason instanceof Error
        ? reason
        : new Error(String(reason ?? 'Unhandled Promise Rejection'));
    trackError(error, 'unhandledrejection');
  });
}
