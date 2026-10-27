import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Button from "./components/Button";
import FileImage from "./FileImage";
import Modal from "./components/Modal";
import { editReport } from "./api";
import { formatDate } from "./orderUtils";

const COORDS = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

// Edits the description and removes photos. Nothing is overwritten silently: when the report was changed
// elsewhere, the user sees the other text and saves again on top of it (or cancels).
function ReportEditor({ report, onSaved, onCancel }) {
  const [base, setBase] = useState(report); // the server version this edit is based on
  const [description, setDescription] = useState(report.description);
  const [removed, setRemoved] = useState(() => new Set()); // src of the photos to remove
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [saving, setSaving] = useState(false);
  const photos = base.photos.filter((p) => !removed.has(p.src));

  const save = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Enter a description.");
      return;
    }
    setSaving(true);
    setError("");
    setConflict("");
    try {
      onSaved(await editReport(base, { description: description.trim(), photos }));
    } catch (err) {
      if (err.status === 409 && err.current) {
        setBase(err.current);
        setConflict(err.current.description);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="report-edit">
      {conflict !== "" && (
        <div className="note note-error" role="alert">
          <strong>Someone else changed this report in the meantime</strong>
          <p>Their description:</p>
          <p className="report-text">{conflict || "No description."}</p>
          <p>Save again to replace it with yours, or cancel to keep theirs.</p>
        </div>
      )}

      <div className="field">
        <textarea
          aria-label="Description of the work done"
          className={`input ${error && !description.trim() ? "invalid" : ""}`}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {photos.length > 0 && (
        <ul className="photo-grid">
          {photos.map((p, i) => (
            <li key={p.src} className="thumb">
              <FileImage src={p.thumb} alt={`Photo ${i + 1}`} />
              <button
                type="button"
                className="thumb-remove"
                onClick={() => setRemoved((s) => new Set(s).add(p.src))}
                disabled={saving}
                aria-label={`Remove photo ${i + 1}`}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}

      <div className="dialog-actions">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save report"}
        </Button>
      </div>
    </form>
  );
}

// Finished report: description, photos (click to enlarge), location, signature and date.
// onChanged gets the saved report after an edit (or null to reload it).
export default function ReportView({ report, onChanged }) {
  const [zoomed, setZoomed] = useState(null);
  const [editing, setEditing] = useState(false);
  const coords = report.location.match(COORDS);

  return (
    <section className="card report">
      <div className="report-head">
        <h2>Report</h2>
        {onChanged && !editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit report
          </Button>
        )}
      </div>

      {editing ? (
        <ReportEditor
          report={report}
          onSaved={(saved) => {
            setEditing(false);
            onChanged(saved);
          }}
          onCancel={() => {
            setEditing(false);
            onChanged(null);
          }}
        />
      ) : (
        <>
          <p className="report-text">{report.description || "No description."}</p>

          {report.photos.length > 0 && (
            <>
              <h3>Photos ({report.photos.length})</h3>
              <ul className="photo-grid">
                {report.photos.map((p, i) => (
                  <li key={p.src}>
                    <button type="button" className="thumb" onClick={() => setZoomed(p.src)} aria-label={`Enlarge photo ${i + 1}`}>
                      <FileImage src={p.thumb} alt={`Photo ${i + 1}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <dl className="detail-grid">
        <div>
          <dt>Location</dt>
          <dd>
            {coords ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${coords[1]}&mlon=${coords[2]}#map=17/${coords[1]}/${coords[2]}`}
                target="_blank"
                rel="noreferrer"
              >
                {report.location}
              </a>
            ) : (
              report.location || "Not recorded"
            )}
          </dd>
        </div>
        <div>
          <dt>Report date</dt>
          <dd>{report.date ? formatDate(report.date) : "—"}</dd>
        </div>
        {report.name && (
          <div>
            <dt>Signed by</dt>
            <dd>{report.name}</dd>
          </div>
        )}
      </dl>

      <div>
        <h3>Signature</h3>
        {report.signature ? (
          <FileImage className="signature" src={report.signature} alt={`Signature${report.name ? ` of ${report.name}` : ""}`} />
        ) : report.signatureId != null ? (
          <p className="muted">Signature is on file (no image available).</p>
        ) : (
          <p className="muted">No signature.</p>
        )}
      </div>

      {zoomed && (
        <Modal title="Photo" wide onClose={() => setZoomed(null)}>
          <FileImage className="zoom-img" src={zoomed} alt="Enlarged photo" />
        </Modal>
      )}
    </section>
  );
}
