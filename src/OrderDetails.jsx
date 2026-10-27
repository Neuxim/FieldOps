import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Button from "./components/Button";
import ReportView from "./ReportView";
import StatusBadge from "./StatusBadge";
import useDevices from "./useDevices";
import { getOrder, isDemo, simulateRemoteChange } from "./api";
import { canFillReport, formatDate, hasReport, statusTone } from "./orderUtils";
import { loadDraft } from "./reportDrafts";

const POLL_MS = 15000;

export default function OrderDetails({ id, onBack, onEdit, onReport, onDelete }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const devices = useDevices();
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDraft(id)
      .then((draft) => !cancelled && setHasDraft(Boolean(draft)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    getOrder(id)
      .then((data) => !cancelled && setOrder(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const reload = () => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  };

  // Quietly refresh so changes made elsewhere (e.g. the phone) show up
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      getOrder(id)
        .then(setOrder)
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [id]);

  const header = (
    <div className="back-row">
      <Button variant="secondary" onClick={onBack}>
        <FontAwesomeIcon icon={faArrowLeft} /> All orders
      </Button>
    </div>
  );

  if (loading && !order) {
    return (
      <>
        {header}
        <p className="note" role="status">
          <span>
            <span className="spinner" />
            Loading order…
          </span>
        </p>
      </>
    );
  }

  if (error && !order) {
    return (
      <>
        {header}
        <div className="note note-error" role="alert">
          <strong>Couldn't load the order</strong>
          <p>{error}</p>
          <Button onClick={() => reload}>Try again</Button>
        </div>
      </>
    );
  }

  const device = order.device ?? devices.devices.find((d) => String(d.id) === String(order.deviceId));
  const tone = statusTone(order.status);

  return (
    <>
      {header}

      <header className="page-header">
        <h1>{order.title}</h1>
        <StatusBadge status={order.status} />
      </header>

      <div className="detail-actions">
        <Button onClick={() => onEdit(order)}>Edit</Button>
        {canFillReport(order) && (
          <Button variant={hasDraft ? "primary" : "secondary"} onClick={() => onReport(order)}>
            {hasDraft ? "Continue report" : "Fill in report"}
          </Button>
        )}
        {/* The backend refuses to delete an order that has a report */}
        {!hasReport(order) && (
          <Button variant="danger" onClick={() => onDelete(order)}>
            Delete
          </Button>
        )}
        {isDemo && (
          <Button
            variant="secondary"
            onClick={async () => {
              await simulateRemoteChange(id);
              reload();
            }}
          >
            Demo: simulate change from phone
          </Button>
        )}
      </div>

      <section className="card">
        <dl className="detail-grid">
          <div>
            <dt>Client</dt>
            <dd>{order.client || "—"}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{order.address || "—"}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatDate(order.date)}</dd>
          </div>
          <div>
            <dt>Device</dt>
            <dd>
              {device ? (
                <>
                  {device.name}
                  {device.serialNumber && <span className="muted"> ({device.serialNumber})</span>}
                </>
              ) : (
                "No device"
              )}
            </dd>
          </div>
        </dl>
        <h3>Description</h3>
        <p className="report-text">{order.desc || "No description."}</p>
      </section>

      {order.report ? (
        <ReportView
          report={order.report}
          onChanged={(saved) => (saved ? setOrder((o) => ({ ...o, report: saved })) : reload())}
        />
      ) : hasReport(order) ? (
        <div className="note">
          <strong>Report filed</strong>
          <p>The report for this order is saved, but its details couldn't be loaded.</p>
        </div>
      ) : (
        <div className="note">
          <strong>No report yet</strong>
          {canFillReport(order) ? (
            <>
              <p>
                {tone === "done"
                  ? "This order is done but has no report. You can add it now."
                  : "Fill in the report when the work is done. Saving it marks the order as done."}
              </p>
              <Button onClick={() => onReport(order)}>
                {hasDraft ? "Continue report" : "Fill in report"}
              </Button>
            </>
          ) : (
            <p>A cancelled order doesn't need a report.</p>
          )}
        </div>
      )}
    </>
  );
}
