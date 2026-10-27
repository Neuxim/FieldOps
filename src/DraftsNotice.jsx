import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePen } from "@fortawesome/free-solid-svg-icons";
import Button from "./components/Button";
import { canFillReport, formatDate, hasReport } from "./orderUtils";

// Reports that were started on this device but not saved yet (e.g. the battery died)
export default function DraftsNotice({ drafts, orders, onContinue, onDiscard }) {
  const [confirming, setConfirming] = useState(null);

  if (drafts.length === 0) return null;

  return (
    <section className="card drafts" aria-labelledby="drafts-title">
      <h2 id="drafts-title" className="drafts-title">
        <FontAwesomeIcon icon={faFilePen} /> Unfinished {drafts.length === 1 ? "report" : "reports"}
      </h2>
      <ul className="drafts-list">
        {drafts.map((d) => {
          const order = orders.find((o) => String(o.id) === d.orderId);
          const canContinue = order && canFillReport(order);
          return (
            <li key={d.key}>
              <div>
                <strong>{order?.title ?? d.orderTitle}</strong>
                <span className="muted">
                  {" "}
                  · saved {formatDate(d.savedAt)}
                  {order && !canContinue && (hasReport(order) ? " · the order already has a report" : " · the order was cancelled")}
                </span>
              </div>
              {confirming === d.key ? (
                <div className="drafts-actions">
                  <span>Discard what was typed?</span>
                  <Button variant="danger" onClick={() => onDiscard(d)}>
                    Discard
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming(null)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <div className="drafts-actions">
                  {canContinue && <Button onClick={() => onContinue(order)}>Continue</Button>}
                  <Button variant="secondary" onClick={() => setConfirming(d.key)}>
                    Discard
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
