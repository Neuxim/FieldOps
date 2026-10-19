import { useState } from "react";
import Button from "./components/Button";
import { addOrder } from "./api";

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = "This field is required";
  if (!values.date || isNaN(new Date(values.date))) {
    errors.date = "Enter a valid date";
  }
  return errors;
}

export default function OrderForm({ onSaved, onCancel }) {
  const [values, setValues] = useState({
    title: "",
    desc: "",
    date: nowForInput(),
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError("");
    try {
      await addOrder({
        title: values.title.trim(),
        desc: values.desc,
        client: {},
        address: {},
        date: new Date(values.date).toISOString(),
        status: "niewykonane",
      });
      onSaved();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card form order-form">
      <h2 className="card-title">New order</h2>

      <div className="field">
        <input
          name="title"
          placeholder="Order title *"
          aria-label="Order title"
          className={`input ${errors.title ? "invalid" : ""}`}
          value={values.title}
          onChange={handleChange}
        />
        {errors.title && <small className="field-error">{errors.title}</small>}
      </div>

      <div className="field">
        <textarea
          name="desc"
          placeholder="Description"
          aria-label="Description"
          className="input"
          value={values.desc}
          onChange={handleChange}
        />
      </div>

      <label className="field">
        <span className="field-label">Date *</span>
        <input
          type="datetime-local"
          name="date"
          className={`input ${errors.date ? "invalid" : ""}`}
          value={values.date}
          onChange={handleChange}
        />
        {errors.date && <small className="field-error">{errors.date}</small>}
      </label>

      {serverError && <p className="error">{serverError}</p>}

      <Button type="submit" disabled={saving} className="btn-block">
        {saving ? "Saving..." : "Save"}
      </Button>

      <p className="form-footer">
        Changed your mind?{" "}
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </p>
    </form>
  );
}
