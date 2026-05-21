import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, token as tokenStore } from '../services/api';

const Ctx = createContext(null);
export const useApp = () => { const c = useContext(Ctx); if (!c) throw new Error('useApp outside AppProvider'); return c; };

export function AppProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [coins,       setCoins]       = useState(0);
  const [toasts,      setToasts]      = useState([]);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      if (!tokenStore.get()) { setAuthLoading(false); return; }
      try {
        const data = await authApi.me();
        setUser(data.user);
        setCoins(data.user?.teacher?.coinBalance || 0);
      } catch(e) {
        console.error(e);
        tokenStore.remove();
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  const toast = useCallback((msg, type = 's') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), type === 'i' ? 8000 : 4500);
  }, []);

  const loginWithData = useCallback((userData, maybeToken) => {
    if (maybeToken) tokenStore.save(maybeToken);
    setUser(userData);
    setCoins(userData?.teacher?.coinBalance || 0);
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    setUser(null);
    setCoins(0);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) return;
    const data = await authApi.me();
    setUser(data.user);
    setCoins(data.user?.teacher?.coinBalance || 0);
  }, []);

  const updateUser   = useCallback((p) => setUser(prev => prev ? { ...prev, ...p } : prev), []);
  const updateCoins  = useCallback((bal) => {
    const b = typeof bal === 'number' ? bal : parseInt(bal) || 0;
    setCoins(b);
    setUser(prev => prev ? { ...prev, teacher: prev.teacher ? { ...prev.teacher, coinBalance: b } : prev.teacher } : prev);
  }, []);

  return (
    <Ctx.Provider value={{ user, loginWithData, logout, updateUser, refreshUser, coins, updateCoins, authLoading, toast, toasts }}>
      {children}
    </Ctx.Provider>
  );
}
