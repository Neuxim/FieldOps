import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import Button from "./components/Button";
import Modal from "./components/Modal";
import OrderForm from "./OrderForm";
import { getOrders } from "./api";
import { STATUS } from "./status";

// [minimum orders that day, label, css level, bar width %]
const LOAD_LEVELS = [
  [0, "Free", "free", 0],
  [1, "Light", "light", 33],
  [3, "Busy", "busy", 66],
  [5, "Full", "full", 100],
];

const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "short" });

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();

// Cancelled orders don't take up the technician's time
const countsTowardLoad = (o) => STATUS[o.status]?.[1] !== "cancelled";

function loadLevel(count) {
  return LOAD_LEVELS.findLast(([min]) => count >= min);
}

function weekLabel(start) {
  const end = addDays(start, 6);
  return `${dayFormat.format(start)} – ${dayFormat.format(end)}, ${end.getFullYear()}`;
}

export default function Calendar() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [editing, setEditing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getOrders()
      .then((data) => {
        if (cancelled) return;
        setOrders(data);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  };

  const handleSaved = () => {
    setEditing(null);
    reload();
  };

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const items = orders.filter((o) => sameDay(new Date(o.date), date));
    return { date, items, load: items.filter(countsTowardLoad).length };
  });
  const weekTotal = days.reduce((sum, d) => sum + d.load, 0);
  const isCurrentWeek = sameDay(weekStart, startOfWeek(today));

  const newOrderOn = (date) => {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    setEditing({ defaultDate: d });
  };

  return (
    <>
      <header className="page-header">
        <h1>Calendar</h1>
        <Button onClick={() => newOrderOn(isCurrentWeek ? today : weekStart)}>
          Add order
        </Button>
      </header>

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button
            type="button"
            className="icon-btn"
            title="Previous week"
            aria-label="Previous week"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Next week"
            aria-label="Next week"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
          <h2 className="calendar-range" aria-live="polite">
            {weekLabel(weekStart)}
          </h2>
          {!isCurrentWeek && (
            <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(today))}>
              This week
            </Button>
          )}
        </div>
        {!loading && !error && (
          <span className="calendar-summary">
            {weekTotal} {weekTotal === 1 ? "order" : "orders"} this week
          </span>
        )}
      </div>

      {error ? (
        <div className="note note-error" role="alert">
          <strong>Couldn't load orders</strong>
          <p>{error}</p>
          <Button onClick={reload}>Try again</Button>
        </div>
      ) : loading && orders.length === 0 ? (
        <p className="note" role="status">
          <span>
            <span className="spinner" />
            Loading orders…
          </span>
        </p>
      ) : (
        <div className="calendar" aria-busy={loading}>
          {days.map(({ date, items, load }) => {
            const [, levelLabel, level, width] = loadLevel(load);
            const isToday = sameDay(date, today);
            return (
              <section
                key={date.toISOString()}
                className={`calendar-day ${isToday ? "today" : ""}`}
                aria-label={`${weekdayFormat.format(date)} ${dayFormat.format(date)}`}
              >
                <header className="calendar-day-header">
                  <div>
                    <span className="calendar-weekday">{weekdayFormat.format(date)}</span>
                    <span className="calendar-date">{dayFormat.format(date)}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm"
                    title="Add order on this day"
                    aria-label={`Add order on ${dayFormat.format(date)}`}
                    onClick={() => newOrderOn(date)}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </header>

                <div className={`load load-${level}`}>
                  <div className="load-bar" aria-hidden="true">
                    <span style={{ width: `${width}%` }} />
                  </div>
                  <span className="load-text">
                    {levelLabel}
                    {load > 0 && ` · ${load} ${load === 1 ? "order" : "orders"}`}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="calendar-empty">No orders</p>
                ) : (
                  <ul className="calendar-orders">
                    {items.map((o) => {
                      const [label, tone] = STATUS[o.status] ?? [o.status || "—", "other"];
                      return (
                        <li key={o.id}>
                          <button
                            type="button"
                            className={`calendar-order ${tone}`}
                            onClick={() => setEditing({ order: o })}
                          >
                            <span className="calendar-order-time">
                              {timeFormat.format(new Date(o.date))}
                            </span>
                            <strong>{o.title}</strong>
                            {o.address && <span className="calendar-order-meta">{o.address}</span>}
                            <span className={`badge ${tone}`}>{label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} labelledBy="order-form-title">
          <OrderForm
            order={editing.order ?? null}
            defaultDate={editing.defaultDate}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
