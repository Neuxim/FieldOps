import { useState } from "react";
import styles from "./login.module.css";

const API_BASE = import.meta.env.DEV ? "/api" : "https://fieldops-xbkz.onrender.com";

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getApiError(data, fallback) {
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((error) => error?.message || error).join(" ");
  }
  if (typeof data?.errors === "string") return data.errors;
  return fallback;
}

function getExpiryTimestamp(data) {
  const seconds = Number(data?.expiresIn ?? data?.expires_in);
  if (Number.isFinite(seconds) && seconds > 0) return Date.now() + seconds * 1000;

  const expiresAt = data?.expiresAt ?? data?.expires_at;
  if (expiresAt) {
    const timestamp = typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt);
    if (Number.isFinite(timestamp)) return timestamp < 1e12 ? timestamp * 1000 : timestamp;
  }

  return null;
}

function Login({ onLogin, onShowRegister }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setWarning("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setWarning("");
    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWarning("Enter a valid email address.");
      return;
    }
    if (!form.password) {
      setWarning("Enter your password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: form.password }),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(getApiError(data, "Incorrect email address or password."));
      }

      const token = data.token ?? data.accessToken ?? data.access_token;
      if (typeof token !== "string" || !token.trim()) {
        throw new Error("The server did not return a session token. Please try again.");
      }

      localStorage.setItem("token", token);
      const expiresAt = getExpiryTimestamp(data);
      if (expiresAt) localStorage.setItem("tokenExpiresAt", String(expiresAt));
      else localStorage.removeItem("tokenExpiresAt");
      onLogin(token);
    } catch (error) {
      setWarning(error.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.register} onSubmit={handleSubmit} noValidate>
      <h1>Sign in</h1>
      <p className={styles.formIntro}>Sign in to access the technician dashboard.</p>

      <label htmlFor="login-email">Email address</label>
      <input
        id="login-email"
        type="email"
        name="email"
        placeholder="adres@firma.pl"
        autoComplete="email"
        value={form.email}
        onChange={handleChange}
        required
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        name="password"
        placeholder="Your password"
        autoComplete="current-password"
        value={form.password}
        onChange={handleChange}
        required
      />

      {warning && <div className={styles.warning} role="alert">{warning}</div>}

      <button id={styles.btn} disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p>
        Don’t have an account?{" "}
        <button type="button" className={styles.linkButton} onClick={onShowRegister}>
          Create an account
        </button>
      </p>
    </form>
  );
}

export default Login;
