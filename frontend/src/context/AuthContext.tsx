import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

interface AuthState {
  token: string | null;
  user: GitHubUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'graphlens_github_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, user: null, loading: true });

  const fetchUser = useCallback(async (token: string): Promise<GitHubUser | null> => {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  // On mount: check URL for OAuth callback code, then check localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // Clear code from URL immediately
      window.history.replaceState({}, '', window.location.pathname);

      // Exchange code for token via backend
      fetch(`/auth/github/callback?code=${code}`)
        .then(r => r.json())
        .then(async data => {
          if (data.token) {
            localStorage.setItem(STORAGE_KEY, data.token);
            const user = await fetchUser(data.token);
            setState({ token: data.token, user, loading: false });
          } else {
            setState({ token: null, user: null, loading: false });
          }
        })
        .catch(() => setState({ token: null, user: null, loading: false }));
      return;
    }

    // Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      fetchUser(stored).then(user => {
        if (user) {
          setState({ token: stored, user, loading: false });
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setState({ token: null, user: null, loading: false });
        }
      });
    } else {
      setState({ token: null, user: null, loading: false });
    }
  }, [fetchUser]);

  const login = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirect  = encodeURIComponent(window.location.origin);
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user:email&redirect_uri=${redirect}`;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ token: null, user: null, loading: false });
  };

  const getToken = useCallback(async () => state.token, [state.token]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
