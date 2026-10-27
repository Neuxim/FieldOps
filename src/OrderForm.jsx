import { useEffect, useState } from "react";
import Button from "./components/Button";
import ConflictPanel from "./ConflictPanel";
import DevicePicker from "./DevicePicker";
import useDevices from "./useDevices";
import { addOrder, changeOrder, describeError, getOrder } from "./api";
import { hasChanged, orderToValues, toInputValue } from "./orderUtils";

// Named after the backend's error keys; sent as description/clientData (see save)
const FIELDS = ["title", "desc", "client", "address", "date", "deviceId"];
const REQUIRED = ["title", "desc", "client", "address"];
const POLL_MS = 10000;

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

// Used both for adding a new order and (with `order`) for editing an existing one.
// `defaultDate` presets the date of a new order (e.g. the day clicked in the calendar).
export default function OrderForm({ order = null, defaultDate, onSaved, onCancel }) {
  const isEdit = Boolean(order);
  const [values, setValues] = useState(() =>
    order
      ? orderToValues(order)
      : {
          title: "",
          desc: "",
          client: "",
          address: "",
          date: toInputValue(defaultDate ?? new Date()),
          deviceId: "",
        },
  );
  const [base, setBase] = useState(order); // the server version this edit is based on
  const [conflict, setConflict] = useState(null); // server version we collided with
  const [remote, setRemote] = useState(null); // newer server version noticed in the background
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const devices = useDevices();

  // While the form is open, check whether someone else changed the order
  useEffect(() => {
    if (!isEdit) return undefined;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const current = await getOrder(order.id);
        setRemote(hasChanged(base, current) ? current : null);
      } catch {
        /* temporary network problem - ignore */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [isEdit, order?.id, base]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const deviceName = (id) => devices.devices.find((d) => String(d.id) === String(id))?.name ?? "Unknown device";

  const save = async (baseOrder = base) => {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError("");
    try {
      if (isEdit) {
        // Nothing is overwritten silently: if the server version moved on, the user decides
        const current = await getOrder(order.id);
        if (hasChanged(baseOrder, current)) {
          setConflict(current);
          return;
        }
      }

      const title = values.title.trim();
      const desc = values.desc.trim();
      const client = values.client.trim();
      const address = values.address.trim();
      const date = new Date(values.date).toISOString();
      const { deviceId } = values; // "" = no device (clears the link when editing)

      const saved = isEdit
        ? await changeOrder(baseOrder, { title, desc, client, address, date, deviceId })
        : await addOrder({
            title,
            description: desc,
            clientData: client,
            address,
            date,
            ...(deviceId !== "" ? { deviceId } : {}),
          });
      onSaved(saved);
    } catch (err) {
      if (err.status === 409) {
        const current = err.current ?? (await getOrder(order.id).catch(() => null));
        if (current) {
          setConflict(current);
          return;
        }
      }
      const { fields, message } = describeError(err, FIELDS);
      setErrors(fields);
      setServerError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    save();
  };

  // Conflict: keep what the user typed and save it on top of the newest server version
  const keepMine = () => {
    const newest = conflict;
    setBase(newest);
    setConflict(null);
    setRemote(null);
    save(newest);
  };

  // Conflict: replace the form content with the server version
  const takeServer = () => {
    setValues(orderToValues(conflict));
    setBase(conflict);
    setConflict(null);
    setRemote(null);
    setErrors({});
  };

  return (
    <>
      {conflict && (
        <ConflictPanel
          mine={values}
          theirs={conflict}
          deviceName={deviceName}
          onKeepMine={keepMine}
          onTakeServer={takeServer}
          onClose={() => setConflict(null)}
        />
      )}

      {remote && !conflict && (
        <p className="banner" role="status">
          This order was changed in the meantime (for example from the phone). What you typed is safe.{" "}
          <button type="button" className="inline-link" onClick={() => setConflict(remote)}>
            Compare versions
          </button>
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="card form form-narrow">
        <h2 id="order-form-title" className="card-title">
          {isEdit ? "Edit order" : "New order"}
        </h2>

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
          {errors.client && <small className="field-error">{errors.client}</small>}
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
          {errors.address && <small className="field-error">{errors.address}</small>}
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

        <DevicePicker
          devices={devices}
          value={values.deviceId}
          onChange={(id) => setValues((v) => ({ ...v, deviceId: id }))}
        />
        {errors.deviceId && <small className="field-error">{errors.deviceId}</small>}

        {serverError && <p className="error">{serverError}</p>}

        <Button type="submit" disabled={saving} className="btn-block">
          {saving ? "Saving..." : isEdit ? "Save changes" : "Save"}
        </Button>

        <p className="form-footer">
          Changed your mind?{" "}
          <Button type="button" variant="link" onClick={onCancel}>
            Cancel
          </Button>
        </p>
      </form>
    </>
  );
}
