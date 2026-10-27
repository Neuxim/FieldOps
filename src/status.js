// The backend returns Polish status values (e.g. "do wykonania")
export const STATUS = {
  "do wykonania": ["To do", "todo"],
  todo: ["To do", "todo"],
  "w realizacji": ["In progress", "progress"],
  in_progress: ["In progress", "progress"],
  wykonane: ["Done", "done"],
  done: ["Done", "done"],
  anulowane: ["Cancelled", "cancelled"],
  cancelled: ["Cancelled", "cancelled"],
};

export const STATUS_OPTIONS = ["do wykonania", "w realizacji", "wykonane"].map(
  (value) => ({ value, label: STATUS[value][0], tone: STATUS[value][1] })
);

export const statusInfo = (status) => STATUS[status] ?? [status || "—", "other"];
export const statusTone = (status) => statusInfo(status)[1];
