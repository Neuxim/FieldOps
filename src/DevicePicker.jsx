import { useState } from "react";
import Button from "./components/Button";
import DeviceAddModal from "./DeviceAddModal";
import ScanDialog from "./ScanDialog";
import { findDeviceByNumber } from "./api";

// `devices` is the result of useDevices(); `value` is the selected device id ("" = no device)
export default function DevicePicker({ devices, value, onChange }) {
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [notFound, setNotFound] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [adding, setAdding] = useState(false);

  const clearMessages = () => {
    setNotFound("");
    setLookupError("");
  };

  const selectById = (id) => {
    const device = devices.devices.find((d) => String(d.id) === id);
    onChange(device ? device.id : "");
    clearMessages();
  };

  const select = (device) => {
    // A device missing from the loaded list (e.g. just added) - refresh the list so it shows up
    if (!devices.devices.some((d) => String(d.id) === String(device.id))) devices.reload();
    onChange(device.id);
    clearMessages();
  };

  // Called with a scanned or typed serial number -> GET /devices/find?number=
  const handleNumber = async (number) => {
    setScanning(false);
    clearMessages();
    setLookingUp(true);
    try {
      const device = await findDeviceByNumber(number);
      if (device) select(device);
      else setNotFound(number.trim());
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <div className="field">
      <span className="field-label">Device</span>
      <div className="device-row">
        <select
          className="input"
          aria-label="Device"
          value={String(value ?? "")}
          onChange={(e) => selectById(e.target.value)}
          disabled={devices.loading}
        >
          <option value="">No device</option>
          {devices.devices.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.name}
              {d.serialNumber ? ` (${d.serialNumber})` : ""}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" disabled={lookingUp} onClick={() => setScanning(true)}>
          {lookingUp ? "Looking up…" : "Scan or enter number"}
        </Button>
      </div>

      {devices.loading && <small className="field-hint">Loading the device list…</small>}
      {devices.error && (
        <small className="field-error">
          Couldn't load devices: {devices.error}{" "}
          <button type="button" className="inline-link" onClick={devices.reload}>
            Try again
          </button>
        </small>
      )}
      {lookupError && <small className="field-error">Couldn't look the device up: {lookupError}</small>}
      {notFound && (
        <small className="field-error">
          No device with number “{notFound}”.{" "}
          <button type="button" className="inline-link" onClick={() => setAdding(true)}>
            Add it as a new device
          </button>
        </small>
      )}

      {scanning && <ScanDialog onResult={handleNumber} onClose={() => setScanning(false)} />}
      {adding && (
        <DeviceAddModal
          initialNumber={notFound}
          onClose={() => setAdding(false)}
          onAdded={(device) => {
            setAdding(false);
            if (device) select(device);
            else devices.reload();
          }}
        />
      )}
    </div>
  );
}
