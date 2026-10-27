import { statusTone } from "./status";

export { STATUS, statusInfo, statusTone } from "./status";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value) {
  const d = new Date(value);
  return isNaN(d) ? "—" : dateFormat.format(d);
}

// Date as YYYY-MM-DD in the user's local time zone (null if invalid)
export function localDay(value) {
  const d = new Date(value);
  if (isNaN(d)) return null;
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export const todayString = () => localDay(new Date());

// Value for <input type="datetime-local"> (local time, YYYY-MM-DDTHH:mm)
export function toInputValue(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Order -> values of the edit form
export const orderToValues = (o) => ({
  title: o.title ?? "",
  desc: o.desc ?? "",
  client: o.client ?? "",
  address: o.address ?? "",
  date: toInputValue(o.date),
  deviceId: o.deviceId ?? "",
});

const fingerprint = (o) =>
  JSON.stringify([o.title, o.desc, o.client, o.address, o.date, String(o.deviceId ?? ""), o.status]);

// Did someone change the order since `base` was loaded? Uses `version` when available, otherwise compares the data.
export function hasChanged(base, current) {
  if (!base || !current) return false;
  if (base.version != null && current.version != null) return base.version !== current.version;
  return fingerprint(base) !== fingerprint(current);
}

export const EMPTY_FILTERS = { status: "", from: "", to: "" };

// The backend's generateRaport finishes the order itself, so any order without a report can get one
// (except a cancelled one). An order with a report can't be deleted.
export const hasReport = (order) => Boolean(order.report || order.hasReport);
export const canFillReport = (order) => !hasReport(order) && statusTone(order.status) !== "cancelled";
