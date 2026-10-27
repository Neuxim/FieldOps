import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import Button from "./components/Button";
import OrdersFilters from "./OrdersFilters";
import StatusPicker from "./StatusPicker";
import { EMPTY_FILTERS, formatDate, hasReport, localDay } from "./orderUtils";
import { STATUS_OPTIONS, statusInfo, statusTone } from "./status";

const PAGE_SIZE = 8;

function matchesFilters(order, { status, from, to }) {
  if (status && statusTone(order.status) !== status) return false;
  if (from || to) {
    const day = localDay(order.date);
    if (!day) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
  }
  return true;
}

export default function OrdersList({
  orders,
  loading,
  error,
  onRetry,
  onOpen,
  onEdit,
  onDelete,
  onReport,
  onStatusChange,
}) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const changeFilters = (next) => {
    setFilters(next);
    setPage(1); // a different result set starts from the first page
  };
  const resetFilters = () => changeFilters(EMPTY_FILTERS);

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

  const filtered = orders.filter((o) => matchesFilters(o, filters));
  const filtersActive = Boolean(filters.status || filters.from || filters.to);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const items = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <OrdersFilters filters={filters} onChange={changeFilters} onReset={resetFilters} />

      {filtersActive && filtered.length > 0 && (
        <p className="results-count">
          Showing {filtered.length} of {orders.length} orders
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="note">
          <strong>No orders match these filters</strong>
          <p>Try a different status or date range.</p>
          <Button variant="secondary" onClick={resetFilters}>
            Show all orders
          </Button>
        </div>
      ) : (
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
                  <th>Report</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const [label, tone] = statusInfo(o.status);
                  return (
                    <tr key={o.id}>
                      <td data-label="Title">
                        <div>
                          <button type="button" className="row-link" onClick={() => onOpen(o)}>
                            {o.title}
                          </button>
                          {o.desc && <span className="cell-desc">{o.desc}</span>}
                        </div>
                      </td>
                      <td data-label="Client">{o.client || "—"}</td>
                      <td data-label="Address">{o.address || "—"}</td>
                      <td data-label="Date">{formatDate(o.date)}</td>
                      <td data-label="Status">
                        <StatusPicker
                          value={o.status}
                          label={label}
                          tone={tone}
                          options={STATUS_OPTIONS}
                          onChange={(status) => onStatusChange(o, status)}
                        />
                      </td>
                      <td data-label="Report">
                        {hasReport(o) ? (
                          <span className="chip chip-ok">Report</span>
                        ) : tone === "done" ? (
                          <button
                            type="button"
                            className="chip chip-warn chip-button"
                            title="This order has no report - add it now"
                            onClick={() => onReport(o)}
                          >
                            Add report
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="" className="actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit order"
                          aria-label={`Edit ${o.title}`}
                          onClick={() => onEdit(o)}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title={hasReport(o) ? "An order with a report can't be deleted" : "Delete order"}
                          aria-label={`Delete ${o.title}`}
                          disabled={hasReport(o)}
                          onClick={() => onDelete(o)}
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <nav className="pager" aria-label="Pagination">
            <Button variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <span>
              Page {current} of {pages} ({filtered.length} total)
            </span>
            <Button variant="secondary" disabled={current >= pages} onClick={() => setPage(current + 1)}>
              Next
            </Button>
          </nav>
        </>
      )}
    </>
  );
}
