import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  isAuthenticated, 
  getStoredUser, 
  getStoredAccess, 
  getMe, 
  clearAuth,
  persistAuth,
  shouldShowPaywall,
  User,
  AllowedAccess
} from '@/lib/api';

interface UseAuthReturn {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: User | null;
  access: AllowedAccess | null;
  showPaywall: boolean;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AllowedAccess | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const logout = useCallback(() => {
    clearAuth();
    setIsLoggedIn(false);
    setUser(null);
    setAccess(null);
    navigate('/login');
  }, [navigate]);

  const refreshAuth = useCallback(async () => {
    if (!isAuthenticated()) {
      setIsLoading(false);
      setIsLoggedIn(false);
      return;
    }

    try {
      const response = await getMe();
      
      if (response.success && response.user && response.allowed_access) {
        // Update local storage with fresh data
        const token = localStorage.getItem('premier_token') || '';
        persistAuth(
          token,
          response.user,
          response.allowed_access,
          response.show_paywall_popup ?? false,
          response.checkout ?? null
        );
        
        setUser(response.user);
        setAccess(response.allowed_access);
        setIsLoggedIn(true);
        setShowPaywall(response.show_paywall_popup ?? false);
      } else {
        // Token invalid or expired
        logout();
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Initial auth check
    if (!isAuthenticated()) {
      setIsLoading(false);
      navigate('/login');
      return;
    }

    // Load from storage first for immediate UI
    const storedUser = getStoredUser();
    const storedAccess = getStoredAccess();
    
    if (storedUser && storedAccess) {
      setUser(storedUser);
      setAccess(storedAccess);
      setIsLoggedIn(true);
      setShowPaywall(shouldShowPaywall());
    }

    // Then refresh from API
    refreshAuth();
  }, [navigate, refreshAuth]);

  return {
    isLoading,
    isLoggedIn,
    user,
    access,
    showPaywall,
    logout,
    refreshAuth,
  };
}
