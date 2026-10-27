import { statusInfo } from "./orderUtils";

export default function StatusBadge({ status }) {
  const [label, tone] = statusInfo(status);
  return <span className={`badge ${tone}`}>{label}</span>;
}
