import { useEffect, useState } from "react";
import Button from "./components/Button";
import Modal from "./components/Modal";
import DeviceForm from "./DeviceForm";
import StickerDialog from "./StickerDialog";
import { getDevices } from "./api";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("search");
  const [editing, setEditing] = useState(null);
  const [sticker, setSticker] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      getDevices({ [searchBy]: query.trim() })
        .then((data) => {
          if (cancelled) return;
          setDevices(data);
          setError("");
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchBy, reloadKey]);

  const reload = () => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  };

  const handleSaved = () => {
    setEditing(null);
    reload();
  };

  return (
    <>
      <header className="page-header">
        <h1>Devices</h1>
        <Button onClick={() => setEditing("new")}>Add device</Button>
      </header>

      <div className="search">
        <select
          className="input"
          aria-label="Search by"
          value={searchBy}
          onChange={(e) => {
            setLoading(true);
            setSearchBy(e.target.value);
          }}
        >
          <option value="search">Name</option>
          <option value="number">Serial number</option>
        </select>
        <input
          type="search"
          className="input"
          placeholder={
            searchBy === "search"
              ? "Search by name…"
              : "Search by serial number…"
          }
          aria-label="Search devices"
          value={query}
          onChange={(e) => {
            setLoading(true);
            setQuery(e.target.value);
          }}
        />
      </div>

      {loading && devices.length === 0 ? (
        <p className="note" role="status">
          <span>
            <span className="spinner" />
            Loading devices…
          </span>
        </p>
      ) : error ? (
        <div className="note note-error" role="alert">
          <strong>Couldn't load devices</strong>
          <p>{error}</p>
          <Button onClick={reload}>Try again</Button>
        </div>
      ) : devices.length === 0 ? (
        <div className="note">
          <strong>
            {query ? "No devices match your search" : "You don't have any devices yet"}
          </strong>
          <p>
            {query
              ? "Try a different name or serial number."
              : "Once you add some, they'll show up here."}
          </p>
        </div>
      ) : (
        <div className="table-wrap" aria-busy={loading}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Model</th>
                <th>Location</th>
                <th>Serial number</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.name}</strong>
                  </td>
                  <td>{d.model}</td>
                  <td>{d.location}</td>
                  <td className="mono">{d.serialNumber}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Edit device"
                      aria-label={`Edit ${d.name}`}
                      onClick={() => setEditing(d)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Print sticker"
                      aria-label={`Print sticker for ${d.name}`}
                      onClick={() => setSticker(d)}
                    >
                      🏷️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} labelledBy="device-form-title">
          <DeviceForm
            device={editing === "new" ? null : editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {sticker && (
        <StickerDialog device={sticker} onClose={() => setSticker(null)} />
      )}
    </>
  );
}
