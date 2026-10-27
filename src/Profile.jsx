import { useEffect, useState } from "react";
import Button from "./components/Button";
import { changePassword, changeProfile, describeError, getProfile } from "./api";
import { validateField } from "./Login/validation";

const DETAIL_FIELDS = ["firstName", "lastName", "email"];
const PASSWORD_FIELDS = ["currentPassword", "password", "confirmPassword"];
const EMPTY_PASSWORDS = { currentPassword: "", password: "", confirmPassword: "" };

function validate(fields, values) {
  const errors = {};
  for (const name of fields) {
    const message =
      name === "currentPassword"
        ? values[name] ? "" : "Enter your current password."
        : validateField(name, values[name], values);
    if (message) errors[name] = message;
  }
  return errors;
}

function Field({ name, label, type = "text", autoComplete, values, errors, onChange, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        className={`input ${errors[name] ? "invalid" : ""}`}
        value={values[name]}
        onChange={onChange}
        aria-invalid={Boolean(errors[name])}
      />
      {errors[name] ? (
        <small className="field-error">{errors[name]}</small>
      ) : (
        hint && <small className="field-hint">{hint}</small>
      )}
    </label>
  );
}

function DetailsForm({ profile, onSaved }) {
  const [values, setValues] = useState(profile);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const unchanged = DETAIL_FIELDS.every((name) => values[name] === profile[name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(DETAIL_FIELDS, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError("");
    try {
      const next = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
      };
      await changeProfile(next);
      onSaved(next);
      setValues(next);
      setSuccess("Your details have been saved.");
    } catch (err) {
      const { fields, message } = describeError(err, DETAIL_FIELDS);
      setErrors(fields);
      setServerError(message);
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props) => (
    <Field name={name} label={label} values={values} errors={errors} onChange={handleChange} {...props} />
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="card form">
      <h2 className="section-title">Your details</h2>
      {!profile.email && (
        <p className="field-hint">
          Your saved details aren't available on this device (they come from signing in). Enter them and save.
        </p>
      )}

      <div className="field-row">
        {field("firstName", "First name", { autoComplete: "given-name" })}
        {field("lastName", "Last name", { autoComplete: "family-name" })}
      </div>
      {field("email", "Email address", { type: "email", autoComplete: "email" })}

      {serverError && <p className="error">{serverError}</p>}
      {success && <p className="success" role="status">{success}</p>}

      <Button type="submit" disabled={saving || unchanged} className="btn-block">
        {saving ? "Saving..." : "Save details"}
      </Button>
    </form>
  );
}

// The server reports problems as oldPassword / newPassword; show them on the matching inputs
const SERVER_PASSWORD_FIELDS = { oldPassword: "currentPassword", newPassword: "password" };

function PasswordForm({ profile }) {
  const [values, setValues] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(PASSWORD_FIELDS, values);
    if (!found.password && values.password === values.currentPassword) {
      found.password = "The new password must be different from the current one.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // The edit endpoint always takes name and email as well - don't send empty ones
    if (!profile.email || !profile.firstName) {
      setServerError("Save your details (name and email) first, then change the password.");
      return;
    }

    setSaving(true);
    setServerError("");
    try {
      await changePassword({
        profile,
        currentPassword: values.currentPassword,
        newPassword: values.password,
      });
      setValues(EMPTY_PASSWORDS);
      setSuccess("Your password has been changed.");
    } catch (err) {
      const { fields, message } = describeError(err, Object.keys(SERVER_PASSWORD_FIELDS));
      setErrors(
        Object.fromEntries(Object.entries(fields).map(([key, text]) => [SERVER_PASSWORD_FIELDS[key], text]))
      );
      setServerError(message);
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props) => (
    <Field
      name={name}
      label={label}
      type="password"
      values={values}
      errors={errors}
      onChange={handleChange}
      {...props}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="card form">
      <h2 className="section-title">Change password</h2>

      {field("currentPassword", "Current password", { autoComplete: "current-password" })}
      {field("password", "New password", {
        autoComplete: "new-password",
        hint: "At least 8 characters, one uppercase letter, one number, and one special character.",
      })}
      {field("confirmPassword", "Confirm new password", { autoComplete: "new-password" })}

      {serverError && <p className="error">{serverError}</p>}
      {success && <p className="success" role="status">{success}</p>}

      <Button type="submit" disabled={saving} className="btn-block">
        {saving ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => {
    setError("");
    setReloadKey((k) => k + 1);
  };

  return (
    <>
      <header className="page-header">
        <h1>Profile</h1>
      </header>

      {error ? (
        <div className="note note-error" role="alert">
          <strong>Couldn't load your profile</strong>
          <p>{error}</p>
          <Button onClick={reload}>Try again</Button>
        </div>
      ) : !profile ? (
        <p className="note" role="status">
          <span>
            <span className="spinner" />
            Loading profile…
          </span>
        </p>
      ) : (
        <div className="profile-grid">
          <DetailsForm profile={profile} onSaved={setProfile} />
          <PasswordForm profile={profile} />
        </div>
      )}
    </>
  );
}
