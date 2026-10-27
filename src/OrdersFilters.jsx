import Button from "./components/Button";
import { todayString } from "./orderUtils";

// Values match the status "tone" from orderUtils.js
const STATUS_OPTIONS = [
  ["todo", "To do"],
  ["progress", "In progress"],
  ["done", "Done"],
  ["cancelled", "Cancelled"],
];

export default function OrdersFilters({ filters, onChange, onReset }) {
  const today = todayString();
  const isToday = filters.from === today && filters.to === today;
  const active = Boolean(filters.status || filters.from || filters.to);

  const set = (patch) => onChange({ ...filters, ...patch });
  const toggleToday = () => (isToday ? set({ from: "", to: "" }) : set({ from: today, to: today }));

  return (
    <section className="filters" aria-label="Filter orders">
      <label className="field">
        <span className="field-label">Status</span>
        <select className="input" value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Date from</span>
        <input
          type="date"
          className="input"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => set({ from: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">Date to</span>
        <input
          type="date"
          className="input"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => set({ to: e.target.value })}
        />
      </label>

      <div className="filters-actions">
        <Button type="button" variant={isToday ? "primary" : "secondary"} onClick={toggleToday}>
          Today
        </Button>
        <Button type="button" variant="secondary" disabled={!active} onClick={onReset}>
          Show all
        </Button>
      </div>
    </section>
  );
}
