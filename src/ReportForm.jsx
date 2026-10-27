import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faXmark } from "@fortawesome/free-solid-svg-icons";
import Button from "./components/Button";
import SignaturePad from "./SignaturePad";
import { describeError, saveReport } from "./api";
import { formatBytes, resizeImage } from "./imageUtils";
import { canFillReport, formatDate, hasReport } from "./orderUtils";
import { deleteDraft, loadDraft, saveDraft } from "./reportDrafts";
import { signatureToBlob } from "./signature";

const MAX_PHOTOS = 10;
// Backend field names: documentation -> description, name, location, signature_id, photo_id
const FIELDS = ["description", "name", "location", "signature"];
// Wait this long after the last change before writing the draft
const SAVE_DELAY = 400;

const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "short" });

const initialValues = (order) => ({
  description: "",
  name: order.client ?? "",
  location: order.address ?? "",
});

const withUrl = (p) => ({ ...p, url: URL.createObjectURL(p.blob) });

// Report for an order that has none yet (not cancelled). Saving it marks the order as done.
// Everything typed is kept as a draft on this device until the report is saved.
export default function ReportForm({ order, onSaved, onCancel }) {
  const [values, setValues] = useState(() => initialValues(order));
  const [signature, setSignature] = useState(null); // strokes, see signature.js
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]); // { id, blob, url, name }
  const [photoError, setPhotoError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [progress, setProgress] = useState("");
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [restoredAt, setRestoredAt] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [draftsOff, setDraftsOff] = useState(false);
  const fileInput = useRef(null);
  const photosRef = useRef(photos);
  const touched = useRef(false); // changed by the user since the form opened / since the last save
  const done = useRef(false); // report submitted - no more draft writes

  useEffect(() => {
    photosRef.current = photos;
  });
  // Free the thumbnails' memory when leaving the form
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Bring back what was typed before the tab was closed (or the battery died)
  useEffect(() => {
    let cancelled = false;
    loadDraft(order.id)
      .then((draft) => {
        if (cancelled || !draft) return;
        setValues({ ...initialValues(order), ...draft.values });
        setSignature(draft.signature ?? null);
        setPhotos((draft.photos ?? []).map(withUrl));
        setRestoredAt(draft.savedAt);
        setSavedAt(draft.savedAt);
      })
      .catch(() => !cancelled && setDraftsOff(true))
      .finally(() => !cancelled && setDraftReady(true));
    return () => {
      cancelled = true;
    };
  }, [order]);

  // Autosave: shortly after each change, and right away when the page is hidden or closed.
  // `persist` always writes the latest form state (it is refreshed after every render).
  const persist = useRef(() => {});
  useEffect(() => {
    persist.current = async () => {
      if (!touched.current || done.current) return;
      touched.current = false;
      const start = initialValues(order);
      const hasContent =
        values.description.trim() ||
        values.name !== start.name ||
        values.location !== start.location ||
        signature ||
        photos.length > 0;
      try {
        if (hasContent) {
          await saveDraft(order, {
            values,
            signature,
            photos: photos.map(({ id, blob, name }) => ({ id, blob, name })),
          });
          setSavedAt(Date.now());
        } else {
          await deleteDraft(order.id);
          setSavedAt(null);
        }
      } catch {
        setDraftsOff(true);
      }
    };
  });

  useEffect(() => {
    if (!draftReady || !touched.current) return undefined;
    const timer = setTimeout(() => persist.current(), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [draftReady, values, signature, photos]);

  useEffect(() => {
    const flush = () => persist.current();
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(); // leaving the form (e.g. Cancel) keeps the latest changes
    };
  }, []);

  if (!canFillReport(order)) {
    return (
      <div className="note">
        <strong>The report can't be filled in</strong>
        <p>
          {hasReport(order)
            ? "This order already has a report."
            : "A cancelled order doesn't need a report."}
        </p>
        <Button variant="secondary" onClick={onCancel}>
          Back to the order
        </Button>
      </div>
    );
  }

  if (!draftReady) {
    return (
      <p className="note" role="status">
        <span>
          <span className="spinner" />
          Opening the report…
        </span>
      </p>
    );
  }

  const edit = () => {
    touched.current = true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    edit();
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const startOver = async () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    touched.current = false;
    setValues(initialValues(order));
    setSignature(null);
    setPhotos([]);
    setErrors({});
    setRestoredAt(null);
    setSavedAt(null);
    await deleteDraft(order.id).catch(() => {});
  };

  const useMyPosition = () => {
    if (!navigator.geolocation) return setLocationNote("This browser can't share your position.");
    setLocating(true);
    setLocationNote("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        edit();
        setValues((v) => ({ ...v, location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        setErrors((er) => ({ ...er, location: undefined }));
        setLocating(false);
      },
      () => {
        setLocationNote("Couldn't get your position (no permission or no signal). Type the location instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const addPhotos = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (files.length === 0) return;

    setPhotoError("");
    setProcessing(true);
    const next = [...photos];
    const problems = [];
    for (const file of files) {
      if (next.length >= MAX_PHOTOS) {
        problems.push(`You can add up to ${MAX_PHOTOS} photos.`);
        break;
      }
      try {
        const blob = await resizeImage(file);
        next.push(withUrl({ id: crypto.randomUUID(), blob, name: file.name }));
      } catch (err) {
        problems.push(`${file.name}: ${err.message}`);
      }
    }
    edit();
    setPhotos(next);
    setProcessing(false);
    if (problems.length) setPhotoError(problems.join(" "));
  };

  const removePhoto = (id) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    edit();
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!values.description.trim()) found.description = "Describe the work that was done";
    if (!values.location.trim()) found.location = "Enter the location";
    if (!signature) found.signature = "The signature of the person receiving the work is required";
    if (values.name.trim().split(/\s+/).filter(Boolean).length < 2) {
      found.name = "Enter the first and last name of the person signing";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError("");
    try {
      await saveReport(
        order,
        {
          description: values.description.trim(),
          name: values.name.trim().replace(/\s+/g, " "),
          location: values.location.trim(),
          photos: photos.map((p) => p.blob),
          signature: await signatureToBlob(signature),
        },
        setProgress,
      );
      done.current = true;
      await deleteDraft(order.id).catch(() => {});
      onSaved();
    } catch (err) {
      if (err.alreadyReported) {
        // Nothing to finish here any more - the draft would only come back as "unfinished"
        done.current = true;
        await deleteDraft(order.id).catch(() => {});
      }
      const { fields, message } = describeError(err, FIELDS);
      setErrors(fields);
      setServerError(message);
      setSaving(false);
      setProgress("");
    }
  };

  const totalSize = photos.reduce((sum, p) => sum + p.blob.size, 0);

  return (
    <form onSubmit={handleSubmit} noValidate className="card form form-narrow report-form">
      <h2 className="card-title">Report</h2>
      <p className="form-subtitle">{order.title}</p>

      {restoredAt && (
        <p className="banner draft-banner" role="status">
          <FontAwesomeIcon icon={faClockRotateLeft} />
          <span>
            Restored your unfinished report from {formatDate(restoredAt)}.{" "}
            <button type="button" className="inline-link" onClick={startOver} disabled={saving}>
              Start over
            </button>
          </span>
        </p>
      )}

      <div className="field">
        <textarea
          name="description"
          placeholder="Description of the work done *"
          aria-label="Description of the work done"
          className={`input ${errors.description ? "invalid" : ""}`}
          rows={5}
          value={values.description}
          onChange={handleChange}
        />
        {errors.description && <small className="field-error">{errors.description}</small>}
      </div>

      <div className="field">
        <div className="device-row">
          <input
            name="location"
            placeholder="Location *"
            aria-label="Location"
            className={`input ${errors.location ? "invalid" : ""}`}
            value={values.location}
            onChange={handleChange}
          />
          <Button type="button" variant="secondary" disabled={locating} onClick={useMyPosition}>
            {locating ? "Locating…" : "Use my position"}
          </Button>
        </div>
        {errors.location && <small className="field-error">{errors.location}</small>}
        {locationNote && <small className="field-hint">{locationNote}</small>}
      </div>

      <fieldset className="signature-section">
        <legend className="field-label">Signature of the person receiving the work *</legend>
        <SignaturePad
          value={signature}
          invalid={Boolean(errors.signature)}
          onChange={(sig) => {
            edit();
            setSignature(sig);
            if (sig) setErrors((er) => ({ ...er, signature: undefined }));
          }}
        />
        {errors.signature && <small className="field-error">{errors.signature}</small>}

        <label className="field">
          <span className="field-label">Signed by (first and last name) *</span>
          <input
            name="name"
            placeholder="e.g. Anna Nowak"
            autoComplete="off"
            className={`input ${errors.name ? "invalid" : ""}`}
            value={values.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <small className="field-error">{errors.name}</small>}
        </label>
      </fieldset>

      <div className="field">
        <span className="field-label">Photos (optional)</span>
        {photos.length > 0 && (
          <ul className="photo-grid">
            {photos.map((p, i) => (
              <li key={p.id} className="thumb">
                <img src={p.url} alt={`Photo ${i + 1}`} />
                <button
                  type="button"
                  className="thumb-remove"
                  onClick={() => removePhoto(p.id)}
                  disabled={saving}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={addPhotos} />
        <div className="photo-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={saving || processing || photos.length >= MAX_PHOTOS}
            onClick={() => fileInput.current.click()}
          >
            {processing ? "Processing…" : "Add photos"}
          </Button>
          <small className="field-hint">
            {photos.length} / {MAX_PHOTOS}
            {photos.length > 0 && ` · ${formatBytes(totalSize)} in total`}. Photos are shrunk automatically so the
            report uploads fast.
          </small>
        </div>
        {photoError && <small className="field-error">{photoError}</small>}
      </div>

      {serverError && <p className="error">{serverError}</p>}

      <Button type="submit" disabled={saving || processing} className="btn-block">
        {saving ? progress || "Saving..." : "Save report"}
      </Button>

      <p className="draft-status" role="status">
        {draftsOff
          ? "Drafts can't be kept in this browser - finish the report before closing the page."
          : savedAt
            ? `Draft saved on this device at ${timeFormat.format(savedAt)}.`
            : "Your progress is saved on this device as you type."}
      </p>

      <p className="form-footer">
        Saving the report marks the order as done.{" "}
        <Button type="button" variant="link" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </p>
    </form>
  );
}
