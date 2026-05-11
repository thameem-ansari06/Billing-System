import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API, WS_API } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch(`${API}/users/me`, {
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

  useEffect(() => {
    let socket;
    let timeoutId;

    const connectWS = () => {
      if (user?.token) {
        const wsUrl = `${WS_API}/auth/ws/status?token=${user.token}`;
        console.log(`[WS] Attempting connection to: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("[WS] Connected to status monitor");
          setIsWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'online_users') {
              setActiveUsers(message.data);
            }
          } catch (err) {
            console.error("[WS] Failed to parse message:", err);
          }
        };

        socket.onclose = (event) => {
          console.log(`[WS] Connection closed: ${event.code}`);
          setIsWsConnected(false);
          // If code is 4003, it means token error, don't retry until user relogs
          if (event.code === 4003) {
            console.error("[WS] Authentication failed. Please re-login.");
            return;
          }
          // Auto-reconnect after exactly 3 seconds if not a clean logout (1000)
          if (event.code !== 1000) {
            const delay = 3000;
            console.log(`[WS] Reconnecting in ${(delay/1000).toFixed(1)}s...`);
            timeoutId = setTimeout(connectWS, delay);
          }
        };

        socket.onerror = (error) => {
          console.error("[WS] WebSocket error:", error);
          // Note: socket.onclose will be called after this
        };
      } else {
        setActiveUsers([]);
        setIsWsConnected(false);
      }
    };

    connectWS();

    return () => {
      if (socket) {
        console.log("[WS] Cleaning up connection...");
        socket.close(1000); // 1000 = Normal Closure
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user?.token]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading, activeUsers, isWsConnected }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

