// Mock User System - Fake Login (sem backend)

const MOCK_USER_KEY = 'mock_user';

export interface MockUser {
  email: string;
  plan: 'ULTRA';
  dbId?: string;
  mainTier?: string;
  bettingHouseId?: string | null;
}

export function mockLogin(email: string, dbId?: string, mainTier?: string): MockUser {
  const user: MockUser = {
    email: email.toLowerCase().trim(),
    plan: 'ULTRA',
    dbId,
    mainTier: mainTier || 'free',
  };
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  return user;
}

export function mockLogout(): void {
  localStorage.removeItem(MOCK_USER_KEY);
  // Limpar chaves legadas
  localStorage.removeItem('jwt');
  localStorage.removeItem('_user');
  localStorage.removeItem('appConfig');
  localStorage.removeItem('userData');
  localStorage.removeItem('premier_token');
  localStorage.removeItem('premier_user');
  localStorage.removeItem('premier_access');
  localStorage.removeItem('premier_show_paywall');
  localStorage.removeItem('premier_checkout_url');
  localStorage.removeItem('betSite');
  localStorage.removeItem('telegramUrl');
  localStorage.removeItem('checkout');
  localStorage.removeItem('basicImageBanner');
  localStorage.removeItem('proUrl');
  localStorage.removeItem('proImageBanner');
  localStorage.removeItem('banner1Url');
  localStorage.removeItem('banner1Image');
  localStorage.removeItem('metric');
  localStorage.removeItem('betSiteType');
}

export function mockGetUser(): MockUser | null {
  const stored = localStorage.getItem(MOCK_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as MockUser;
  } catch {
    return null;
  }
}

export function isMockAuthenticated(): boolean {
  return !!localStorage.getItem(MOCK_USER_KEY);
}
