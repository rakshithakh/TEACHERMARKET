import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, token as tokenStore } from '../services/api';

const AppContext = createContext(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};

export function AppProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [coins,       setCoins]       = useState(0);
  const [toasts,      setToasts]      = useState([]);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      const t = tokenStore.get();
      if (!t) { setAuthLoading(false); return; }
      try {
        const data = await authApi.me();
        setUser(data.user);
        setCoins(data.user?.teacher?.coinBalance || 0);
      } catch {
        tokenStore.remove();
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  // Toast
  const toast = useCallback((msg, type = 's') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800);
  }, []);

  // After successful login / register
  const loginWithData = useCallback((tok, userData) => {
    tokenStore.save(tok);
    setUser(userData);
    setCoins(userData?.teacher?.coinBalance || 0);
  }, []);

  const logout = useCallback(() => {
    tokenStore.remove();
    setUser(null);
    setCoins(0);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const updateCoins = useCallback((newBal) => {
    setCoins(newBal);
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, teacher: prev.teacher ? { ...prev.teacher, coinBalance: newBal } : prev.teacher };
    });
  }, []);

  return (
    <AppContext.Provider value={{
      user, loginWithData, logout, updateUser,
      coins, updateCoins,
      authLoading,
      toast, toasts,
    }}>
      {children}
    </AppContext.Provider>
  );
}
