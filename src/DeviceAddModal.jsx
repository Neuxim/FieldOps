import { useState } from "react";
import Button from "./components/Button";
import Modal from "./components/Modal";
import { addDevice, describeError, findDeviceByNumber } from "./api";

const FIELDS = ["name", "model", "location", "serialNumber"];

// Adds a new device to the registry (POST /devices/add); returns the created device to onAdded
export default function DeviceAddModal({ initialNumber = "", onAdded, onClose }) {
  const [values, setValues] = useState({ name: "", model: "", location: "", serialNumber: initialNumber });
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
    e.stopPropagation(); // the dialog is opened from inside the order form; don't submit that too
    const found = {};
    if (!values.name.trim()) found.name = "This field is required";
    if (!values.serialNumber.trim()) found.serialNumber = "This field is required";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError("");
    try {
      const device = {
        name: values.name.trim(),
        model: values.model.trim(),
        location: values.location.trim(),
        serialNumber: values.serialNumber.trim(),
      };
      await addDevice(device);
      onAdded(await findDeviceByNumber(device.serialNumber)); // gives us the id assigned by the server
    } catch (err) {
      const { fields, message } = describeError(err, FIELDS);
      setErrors(fields);
      setServerError(message);
      setSaving(false);
    }
  };

  const input = (name, placeholder) => (
    <div className="field">
      <input
        name={name}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`input ${errors[name] ? "invalid" : ""}`}
        value={values[name]}
        onChange={handleChange}
      />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </div>
  );

  return (
    <Modal title="Add device" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="form">
        {input("name", "Device name *")}
        {input("model", "Model")}
        {input("location", "Location")}
        {input("serialNumber", "Serial number *")}
        {serverError && <p className="error">{serverError}</p>}
        <Button type="submit" disabled={saving} className="btn-block">
          {saving ? "Saving..." : "Add device"}
        </Button>
      </form>
    </Modal>
  );
}
