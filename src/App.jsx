import { useCallback, useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import Login from "./Login/login";
import Register from "./Login/register";
import { isDemo } from "./api";

const TOKEN_KEY = "token";
const EXPIRY_KEY = "tokenExpiresAt";

function getTokenExpiry(token) {
  const storedExpiry = Number(localStorage.getItem(EXPIRY_KEY));
  if (Number.isFinite(storedExpiry) && storedExpiry > 0) return storedExpiry;

  const parts = token?.split(".");
  if (parts?.length !== 3) return null;

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    return Number.isFinite(decoded.exp) ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readValidToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiresAt = getTokenExpiry(token);
  if (expiresAt && expiresAt <= Date.now()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  }
  return token;
}

function App() {
  const [token, setToken] = useState(() => readValidToken());
  const [screen, setScreen] = useState("login");

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setToken(null);
    setScreen("login");
  }, []);

  const checkSession = useCallback(() => {
    if (!token) return;
    const expiresAt = getTokenExpiry(token);
    if (expiresAt && expiresAt <= Date.now()) logout();
  }, [logout, token]);

  useEffect(() => {
    if (!token) return undefined;

    const expiresAt = getTokenExpiry(token);
    if (!expiresAt) return undefined;

    const timer = window.setTimeout(checkSession, Math.max(0, expiresAt - Date.now()));
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
    };
  }, [checkSession, token]);

  useEffect(() => {
    const syncSession = () => setToken(readValidToken());
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  useEffect(() => {
    window.addEventListener("session-expired", logout);
    return () => window.removeEventListener("session-expired", logout);
  }, [logout]);

  if (isDemo) {
    return <Dashboard />;
  }

  if (token) {
    return <Dashboard onLogout={logout} />;
  }

  if (screen === "register") {
    return (
      <Register
        onRegistered={() => setScreen("login")}
        onShowLogin={() => setScreen("login")}
      />
    );
  }

  return (
    <Login
      onLogin={(newToken) => setToken(newToken)}
      onShowRegister={() => setScreen("register")}
    />
  );
}

export default App;
