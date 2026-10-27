import { useState } from "react";
import styles from "./login.module.css";
import { validateField } from "./validation";

const API_BASE = import.meta.env.DEV ? "/api" : "https://fieldops-xbkz.onrender.com";
function validateForm(form) {
  return ["firstName", "lastName", "email", "password", "confirmPassword"].reduce(
    (errors, field) => {
      const message = validateField(field, form[field], form);
      if (message) errors[field] = message;
      return errors;
    },
    {},
  );
}

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

function Register({ onRegistered, onShowLogin }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setWarning("");
    if (submitted) setErrors(validateForm(nextForm));
    else if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setErrors((current) => ({ ...current, [name]: validateField(name, value, form) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setWarning("");
    setSuccess("");
    setSubmitted(true);

    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(getApiError(data, "Could not create your account. Please try again."));
      }

      setSuccess("Your account has been created. You can now sign in.");
      window.setTimeout(onRegistered, 1500);
    } catch (error) {
      setWarning(error.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field) =>
    errors[field] ? <span className={styles.fieldError} id={`${field}-error`}>{errors[field]}</span> : null;

  return (
    <form className={styles.register} onSubmit={handleSubmit} noValidate>
      <h1>Create an account</h1>
      <p className={styles.formIntro}>Enter your details to create a technician account.</p>

      <label htmlFor="firstName">First name</label>
      <input
        id="firstName"
        type="text"
        name="firstName"
        placeholder="e.g. Anna"
        autoComplete="given-name"
        maxLength={40}
        value={form.firstName}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={Boolean(errors.firstName)}
        aria-describedby={errors.firstName ? "firstName-error" : undefined}
        required
      />
      {fieldError("firstName")}

      <label htmlFor="lastName">Last name</label>
      <input
        id="lastName"
        type="text"
        name="lastName"
        placeholder="e.g. Kowalska"
        autoComplete="family-name"
        maxLength={40}
        value={form.lastName}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={Boolean(errors.lastName)}
        aria-describedby={errors.lastName ? "lastName-error" : undefined}
        required
      />
      {fieldError("lastName")}

      <label htmlFor="register-email">Email address</label>
      <input
        id="register-email"
        type="email"
        name="email"
        placeholder="adres@firma.pl"
        autoComplete="email"
        value={form.email}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={Boolean(errors.email)}
        aria-describedby={errors.email ? "email-error" : undefined}
        required
      />
      {fieldError("email")}

      <label htmlFor="register-password">Password</label>
      <input
        id="register-password"
        type="password"
        name="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        value={form.password}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={Boolean(errors.password)}
        aria-describedby={errors.password ? "password-error" : "password-hint"}
        required
      />
      {fieldError("password")}
      <small id="password-hint">At least 8 characters, one uppercase letter, one number, and one special character.</small>

      <label htmlFor="confirm-password">Confirm password</label>
      <input
        id="confirm-password"
        type="password"
        name="confirmPassword"
        placeholder="Enter your password again"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={Boolean(errors.confirmPassword)}
        aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
        required
      />
      {fieldError("confirmPassword")}

      {warning && <div className={styles.warning} role="alert">{warning}</div>}
      {success && <div className={styles.success} role="status">{success}</div>}

      <button id={styles.btn} disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p>
        Already have an account?{" "}
        <button type="button" className={styles.linkButton} onClick={onShowLogin}>
          Sign in
        </button>
      </p>
    </form>
  );
}

export default Register;
