// Premier Ultra - API Client
// Biblioteca para integração do frontend com o backend

const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

// =============================================
// TIPOS
// =============================================

export interface User {
  id: string;
  email: string;
  main_tier: 'free' | 'basic' | 'pro' | 'ultra';
  is_vitalicio: boolean;
  vitalicio_since: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface Entitlement {
  product_key: 'alavancagem' | 'desaltas';
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface AllowedAccess {
  tiers: string[];
  addons: string[];
}

export interface LoginResponse {
  success: boolean;
  show_paywall_popup?: boolean; // AJUSTE 1: Flag para mostrar popup
  checkout?: string | null;
  message?: string;
  user?: User;
  entitlements?: Entitlement[];
  allowed_access?: AllowedAccess;
  token?: string;
}

export interface MeResponse {
  success: boolean;
  show_paywall_popup?: boolean;
  checkout?: string | null;
  message?: string;
  user?: User;
  entitlements?: Entitlement[];
  allowed_access?: AllowedAccess;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  button_text: string | null;
  button_link: string | null;
  starts_at: string;
  ends_at: string | null;
}

export interface BannersResponse {
  success: boolean;
  banners: Banner[];
}

export interface Entry {
  id: string;
  date: string;
  title: string;
  market: string | null;
  odd: number | null;
  tier_required: string;
  addon_required: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface EntriesResponse {
  success: boolean;
  date: string;
  user_tier: string;
  allowed_tiers: string[];
  active_addons: string[];
  entries: Entry[];
}

export interface EventResponse {
  success: boolean;
  event_id?: string;
  message?: string;
}

export interface SessionStartResponse {
  success: boolean;
  session_id?: string;
  started_at?: string;
  message?: string;
}

export interface SessionEndResponse {
  success: boolean;
  session_id?: string;
  duration_seconds?: number;
  message?: string;
}

// =============================================
// TOKEN MANAGEMENT
// =============================================

const TOKEN_KEY = 'premier_token';
const USER_KEY = 'premier_user';
const ACCESS_KEY = 'premier_access';
const PAYWALL_KEY = 'premier_show_paywall';
const CHECKOUT_KEY = 'premier_checkout_url';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function getStoredAccess(): AllowedAccess | null {
  const stored = localStorage.getItem(ACCESS_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function shouldShowPaywall(): boolean {
  return localStorage.getItem(PAYWALL_KEY) === 'true';
}

export function getCheckoutUrl(): string | null {
  return localStorage.getItem(CHECKOUT_KEY);
}

export function dismissPaywall(): void {
  localStorage.setItem(PAYWALL_KEY, 'false');
}

export function persistAuth(
  token: string, 
  user: User, 
  access: AllowedAccess,
  showPaywall: boolean = false,
  checkoutUrl: string | null = null
): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
  localStorage.setItem(PAYWALL_KEY, String(showPaywall));
  if (checkoutUrl) {
    localStorage.setItem(CHECKOUT_KEY, checkoutUrl);
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(PAYWALL_KEY);
  localStorage.removeItem(CHECKOUT_KEY);
  // Limpar também dados antigos para compatibilidade
  localStorage.removeItem('jwt');
  localStorage.removeItem('_user');
  localStorage.removeItem('appConfig');
  localStorage.removeItem('userData');
}

export function isAuthenticated(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  
  try {
    const data = JSON.parse(atob(token));
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

// =============================================
// API CALLS
// =============================================

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  // Se token expirado ou inválido, limpar auth
  if (response.status === 401) {
    clearAuth();
    window.location.replace('/login');
    throw new Error('Sessão expirada');
  }

  return data;
}

// =============================================
// AUTH ENDPOINTS
// =============================================

export async function login(email: string): Promise<LoginResponse> {
  const response = await apiCall<LoginResponse>('/auth-login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  if (response.success && response.token && response.user && response.allowed_access) {
    persistAuth(
      response.token, 
      response.user, 
      response.allowed_access,
      response.show_paywall_popup ?? false,
      response.checkout ?? null
    );
  }

  return response;
}

export async function getMe(): Promise<MeResponse> {
  return apiCall<MeResponse>('/me');
}

// =============================================
// CONTENT ENDPOINTS
// =============================================

export async function getBanners(): Promise<BannersResponse> {
  return apiCall<BannersResponse>('/banners');
}

export async function getEntries(date?: string): Promise<EntriesResponse> {
  const queryParam = date ? `?date=${date}` : '';
  return apiCall<EntriesResponse>(`/entries${queryParam}`);
}

// =============================================
// ANALYTICS ENDPOINTS
// =============================================

export async function trackEvent(
  eventName: string,
  metadata?: Record<string, unknown>
): Promise<EventResponse> {
  return apiCall<EventResponse>('/events', {
    method: 'POST',
    body: JSON.stringify({ event_name: eventName, metadata }),
  });
}

export async function startSession(): Promise<SessionStartResponse> {
  return apiCall<SessionStartResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ action: 'start' }),
  });
}

export async function endSession(sessionId: string): Promise<SessionEndResponse> {
  return apiCall<SessionEndResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ action: 'end', session_id: sessionId }),
  });
}

export async function heartbeatSession(sessionId: string): Promise<{ success: boolean }> {
  return apiCall<{ success: boolean }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ action: 'heartbeat', session_id: sessionId }),
  });
}

// =============================================
// PERMISSION HELPERS
// =============================================

export function canAccessTier(requiredTier: string): boolean {
  const access = getStoredAccess();
  if (!access) return false;
  return access.tiers.includes(requiredTier);
}

export function hasAddon(addon: 'alavancagem' | 'desaltas'): boolean {
  const access = getStoredAccess();
  if (!access) return false;
  return access.addons.includes(addon);
}

export function isVitalicio(): boolean {
  const user = getStoredUser();
  return user?.is_vitalicio ?? false;
}

export function getUserTier(): string {
  const user = getStoredUser();
  return user?.main_tier ?? 'free';
}

export function isFreeUser(): boolean {
  return getUserTier() === 'free';
}
