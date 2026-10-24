import { useState } from "react";
import Button from "./components/Button";
import { addDevice, changeDevice, describeError } from "./api";

const FIELDS = ["name", "model", "location", "serialNumber"];
const REQUIRED = ["name", "model", "location"];

function validate(values) {
  const errors = {};
  for (const name of REQUIRED) {
    if (!values[name].trim()) errors[name] = "This field is required";
  }
  return errors;
}

export default function DeviceForm({ device, onSaved, onCancel }) {
  const [values, setValues] = useState({
    name: device?.name ?? "",
    model: device?.model ?? "",
    location: device?.location ?? "",
    serialNumber: device?.serialNumber ?? "",
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
      const data = {
        name: values.name.trim(),
        model: values.model.trim(),
        location: values.location.trim(),
      };
      if (device) {
        await changeDevice({ id: device.id, ...data });
      } else {
        const serialNumber = values.serialNumber.trim();
        await addDevice(serialNumber ? { ...data, serialNumber } : data);
      }
      onSaved();
    } catch (err) {
      const { fields, message } = describeError(err, FIELDS);
      setErrors(fields);
      setServerError(message);
    } finally {
      setSaving(false);
    }
  };

  const input = (name, placeholder, label) => (
    <div className="field">
      <input
        name={name}
        placeholder={placeholder}
        aria-label={label}
        className={`input ${errors[name] ? "invalid" : ""}`}
        value={values[name]}
        onChange={handleChange}
      />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="card form">
      <h2 id="device-form-title" className="card-title">
        {device ? "Edit device" : "New device"}
      </h2>

      {input("name", "Name *", "Name")}
      {input("model", "Model *", "Model")}
      {input("location", "Location *", "Location")}

      {device ? (
        <p className="form-footer">Serial number: {device.serialNumber}</p>
      ) : (
        input(
          "serialNumber",
          "Serial number (empty = generate code)",
          "Serial number"
        )
      )}

      {serverError && <p className="error">{serverError}</p>}

      <Button type="submit" disabled={saving} className="btn-block">
        {saving ? "Saving..." : "Save"}
      </Button>

      <p className="form-footer">
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </p>
    </form>
  );
}
