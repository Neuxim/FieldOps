import { useState } from "react";
import Button from "./components/Button";

const PAGE_SIZE = 8;

// The backend stores Polish status values (e.g. "niewykonane")
const STATUS = {
  niewykonane: ["To do", "todo"],
  todo: ["To do", "todo"],
  in_progress: ["In progress", "progress"],
  wykonane: ["Done", "done"],
  done: ["Done", "done"],
  anulowane: ["Cancelled", "cancelled"],
  cancelled: ["Cancelled", "cancelled"],
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value) {
  const d = new Date(value);
  return isNaN(d) ? "—" : dateFormat.format(d);
}

export default function OrdersList({ orders, loading, error, onRetry }) {
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const items = orders.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (loading && orders.length === 0) {
    return (
      <p className="note" role="status">
        <span>
          <span className="spinner" />
          Loading orders…
        </span>
      </p>
    );
  }

  if (error) {
    return (
      <div className="note note-error" role="alert">
        <strong>Couldn't load orders</strong>
        <p>{error}</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="note">
        <strong>You don't have any orders yet</strong>
        <p>Once you add some, they'll show up here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Address</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const [label, tone] = STATUS[o.status] ?? [o.status || "—", "other"];
              return (
                <tr key={o.id}>
                  <td data-label="Title">
                    <div>
                      <strong>{o.title}</strong>
                      {o.desc && <span className="cell-desc">{o.desc}</span>}
                    </div>
                  </td>
                  <td data-label="Client">{o.client || "—"}</td>
                  <td data-label="Address">{o.address || "—"}</td>
                  <td data-label="Date">{formatDate(o.date)}</td>
                  <td data-label="Status">
                    <span className={`badge ${tone}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <nav className="pager" aria-label="Pagination">
        <Button
          variant="secondary"
          disabled={current <= 1}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </Button>
        <span>
          Page {current} of {pages} ({orders.length} total)
        </span>
        <Button
          variant="secondary"
          disabled={current >= pages}
          onClick={() => setPage(current + 1)}
        >
          Next
        </Button>
      </nav>
    </>
  );
}
