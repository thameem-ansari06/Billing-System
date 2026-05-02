import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch('http://localhost:8000/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return null;
      }
      if (res.ok) {
        const profile = await res.json();
        return profile;
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
    return null;
  };

  // Rehydrate from localStorage on first load
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 > Date.now()) {
            const profile = await fetchUserProfile(token);
            setUser({
              ...profile,
              token,
            });
          } else {
            localStorage.removeItem('token');
          }
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  /** Called after a successful /auth/login response. */
  const login = async (token) => {
    localStorage.setItem('token', token);
    const profile = await fetchUserProfile(token);
    setUser({
      ...profile,
      token,
    });
  };

  /** Clear session and redirect to login. */
  const logout = () => {
    localStorage.removeItem('token');
    // Also wipe the cart for this session
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    if (user?.token) {
      const profile = await fetchUserProfile(user.token);
      setUser({ ...profile, token: user.token });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
