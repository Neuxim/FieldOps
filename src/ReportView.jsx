import { useState } from "react";
import FileImage from "./FileImage";
import Modal from "./components/Modal";
import { formatDate } from "./orderUtils";

const COORDS = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

// Finished report: description, photos (click to enlarge), location, signature and date
export default function ReportView({ report }) {
  const [zoomed, setZoomed] = useState(null);
  const coords = report.location.match(COORDS);

  return (
    <section className="card report">
      <h2>Report</h2>

      <p className="report-text">{report.description || "No description."}</p>

      {report.photos.length > 0 && (
        <>
          <h3>Photos ({report.photos.length})</h3>
          <ul className="photo-grid">
            {report.photos.map((src, i) => (
              <li key={i}>
                <button type="button" className="thumb" onClick={() => setZoomed(src)} aria-label={`Enlarge photo ${i + 1}`}>
                  <FileImage src={src} alt={`Photo ${i + 1}`} />
                </button>
              </li>
            ))}
          </ul>
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
