import { useState } from "react";
import Button from "./components/Button";
import { addOrder, describeError } from "./api";

// Named after the backend's error keys; sent as description/clientData (see handleSubmit)
const FIELDS = ["title", "desc", "client", "address", "date"];
const REQUIRED = ["title", "desc", "client", "address"];

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function validate(values) {
  const errors = {};
  for (const name of REQUIRED) {
    if (!values[name].trim()) errors[name] = "This field is required";
  }
  if (!values.date || isNaN(new Date(values.date))) {
    errors.date = "Enter a valid date";
  }
  return errors;
}

export default function OrderForm({ onSaved, onCancel }) {
  const [values, setValues] = useState({
    title: "",
    desc: "",
    client: "",
    address: "",
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
        description: values.desc.trim(),
        clientData: values.client.trim(),
        address: values.address.trim(),
        date: new Date(values.date).toISOString(),
      });
      onSaved();
    } catch (err) {
      const { fields, message } = describeError(err, FIELDS);
      setErrors(fields);
      setServerError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card form form-narrow">
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
          placeholder="Description *"
          aria-label="Description"
          className={`input ${errors.desc ? "invalid" : ""}`}
          value={values.desc}
          onChange={handleChange}
        />
        {errors.desc && <small className="field-error">{errors.desc}</small>}
      </div>

      <div className="field">
        <input
          name="client"
          placeholder="Client *"
          aria-label="Client"
          className={`input ${errors.client ? "invalid" : ""}`}
          value={values.client}
          onChange={handleChange}
        />
        {errors.client && (
          <small className="field-error">{errors.client}</small>
        )}
      </div>

      <div className="field">
        <input
          name="address"
          placeholder="Address *"
          aria-label="Address"
          className={`input ${errors.address ? "invalid" : ""}`}
          value={values.address}
          onChange={handleChange}
        />
        {errors.address && (
          <small className="field-error">{errors.address}</small>
        )}
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
