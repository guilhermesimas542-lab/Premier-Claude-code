// Premier Ultra - API Client (SUPABASE EXTERNO)
// Esta versão aponta EXCLUSIVAMENTE para o Supabase externo (INFLUENCE PASS)
// NÃO usa Lovable Cloud

import { EXTERNAL_API_BASE_URL, getActiveBackendInfo } from './supabaseExternal';

// =============================================
// TIPOS (reutilizados de api.ts)
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
  show_paywall_popup?: boolean;
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
// API CALLS - SUPABASE EXTERNO
// =============================================

async function apiCallExternal<T>(
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

  const fullUrl = `${EXTERNAL_API_BASE_URL}${endpoint}`;
  
  // Log para debug - mostra qual URL está sendo usada
  console.log(`🌐 [EXTERNAL API] ${options.method || 'GET'} ${fullUrl}`);

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Log do status
  console.log(`📡 [EXTERNAL API] Status: ${response.status}`);

  const data = await response.json();

  if (response.status === 401) {
    console.error('❌ [EXTERNAL API] Token expirado ou inválido');
    clearAuth();
    window.location.replace('/login');
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    console.error('❌ [EXTERNAL API] Erro:', data);
    throw new Error(data.message || `Erro ${response.status}`);
  }

  return data;
}

// =============================================
// AUTH ENDPOINTS
// =============================================

export async function loginExternal(email: string): Promise<LoginResponse> {
  const response = await apiCallExternal<LoginResponse>('/auth-login', {
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

export async function getMeExternal(): Promise<MeResponse> {
  return apiCallExternal<MeResponse>('/me');
}

// =============================================
// CONTENT ENDPOINTS
// =============================================

export async function getBannersExternal(): Promise<BannersResponse> {
  return apiCallExternal<BannersResponse>('/banners');
}

export async function getEntriesExternal(date?: string): Promise<EntriesResponse> {
  const queryParam = date ? `?date=${date}` : '';
  return apiCallExternal<EntriesResponse>(`/entries${queryParam}`);
}

// =============================================
// ANALYTICS ENDPOINTS
// =============================================

export async function trackEventExternal(
  eventName: string,
  metadata?: Record<string, unknown>
): Promise<EventResponse> {
  return apiCallExternal<EventResponse>('/events', {
    method: 'POST',
    body: JSON.stringify({ event_name: eventName, metadata }),
  });
}

export async function startSessionExternal(): Promise<SessionStartResponse> {
  return apiCallExternal<SessionStartResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ action: 'start' }),
  });
}

export async function endSessionExternal(sessionId: string): Promise<SessionEndResponse> {
  return apiCallExternal<SessionEndResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ action: 'end', session_id: sessionId }),
  });
}

export async function heartbeatSessionExternal(sessionId: string): Promise<{ success: boolean }> {
  return apiCallExternal<{ success: boolean }>('/sessions', {
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

// =============================================
// DEBUG HELPER
// =============================================

export function logBackendInfo(): void {
  const info = getActiveBackendInfo();
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  🟢 BACKEND ATIVO: SUPABASE EXTERNO        ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  Projeto: ${info.name}`);
  console.log(`║  URL: ${info.url}`);
  console.log(`║  Ref: ${info.projectRef}`);
  console.log('╚════════════════════════════════════════════╝');
}
