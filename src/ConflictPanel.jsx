import { useState } from "react";
import Button from "./components/Button";
import { formatDate, orderToValues } from "./orderUtils";

const FIELDS = [
  ["title", "Title"],
  ["desc", "Description"],
  ["client", "Client"],
  ["address", "Address"],
  ["date", "Date"],
  ["deviceId", "Device"],
];

// Compares what the user typed ("mine") with the version currently on the server and lets them choose.
export default function ConflictPanel({ mine, theirs, deviceName, onKeepMine, onTakeServer, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(true);
  const server = orderToValues(theirs);

  const show = (key, value) => {
    if (key === "date") return value ? formatDate(value) : "—";
    if (key === "deviceId") return value ? deviceName(value) : "No device";
    return value || "—";
  };

  const rows = FIELDS.map(([key, label]) => ({ key, label, diff: String(mine[key] ?? "") !== String(server[key] ?? "") }));
  const visible = onlyDiff ? rows.filter((r) => r.diff) : rows;

  return (
    <section className="card conflict" role="alert">
      <h2 className="conflict-title">This order was changed in the meantime</h2>
      <p>
        Someone saved a newer version (for example from the phone). What you typed is still here - choose which
        version should stay.
      </p>

      <label className="check">
        <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> Show only
        differences
      </label>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Your version</th>
              <th>Server version</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan="3">Both versions contain the same data.</td>
              </tr>
            )}
            {visible.map(({ key, label, diff }) => (
              <tr key={key} className={diff ? "diff" : ""}>
                <td data-label="Field">{label}</td>
                <td data-label="Your version">{show(key, mine[key])}</td>
                <td data-label="Server version">{show(key, server[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirming ? (
        <div className="conflict-actions">
          <strong>Discard your changes and use the server version?</strong>
          <Button type="button" onClick={onTakeServer}>
            Yes, use server version
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
            Go back
          </Button>
        </div>
      ) : (
        <div className="conflict-actions">
          <Button type="button" onClick={onKeepMine}>
            Keep my version
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
            Use server version
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Decide later
          </Button>
        </div>
      )}
    </section>
  );
}
