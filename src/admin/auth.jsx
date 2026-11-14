import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as client from './api.js';

/*
  Who is signed in. status: 'loading' (checking a saved session) | 'authed' | 'guest' | 'error'.
  `ended` says why the last session stopped, for the notice on the sign-in page:
  'logout' | 'password' | 'expired'.
*/

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => ({
    status: client.hasSession() ? 'loading' : 'guest',
    user: null,
    error: null,
  }));
  const [ended, setEnded] = useState(null);
  const statusRef = useRef(state.status);
  statusRef.current = state.status;
  const endingRef = useRef(null); // reason for a sign-out we started ourselves

  const loadUser = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const user = await client.me();
      setState({ status: 'authed', user, error: null });
    } catch (err) {
      if (err.status === 401) client.dropSession(); // the listener below turns this into 'guest'
      else setState({ status: 'error', user: null, error: err });
    }
  }, []);

  useEffect(() => {
    if (client.hasSession()) loadUser();
    return client.onSessionChange((session, source) => {
      if (!session) {
        const was = statusRef.current;
        setEnded(endingRef.current ?? (was === 'authed' || was === 'loading' ? 'expired' : null));
        endingRef.current = null;
        setState({ status: 'guest', user: null, error: null });
      } else if (source === 'tab' && statusRef.current !== 'authed') {
        loadUser(); // signed in from another tab
      }
    });
  }, [loadUser]);

  const login = useCallback(async (username, password) => {
    const user = await client.login(username, password);
    setEnded(null);
    setState({ status: 'authed', user, error: null });
  }, []);

  const logout = useCallback(async () => {
    endingRef.current = 'logout';
    await client.logout();
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    endingRef.current = 'password';
    try {
      await client.changePassword(oldPassword, newPassword);
    } catch (err) {
      endingRef.current = null;
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, ended, login, logout, changePassword, reload: loadUser }),
    [state, ended, login, logout, changePassword, loadUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
