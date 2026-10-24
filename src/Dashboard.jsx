import { useEffect, useState } from "react";
import Devices from "./Devices";
import Orders from "./Orders";

const PAGES = { orders: "Orders", devices: "Devices" };

const pageFromHash = () => {
  const page = location.hash.slice(1);
  return page in PAGES ? page : "orders";
};

export default function Dashboard({ onLogout }) {
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    const sync = () => setPage(pageFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <>
      <nav className="topbar">
        <span className="brand">FieldOps</span>
        <div className="tabs">
          {Object.entries(PAGES).map(([key, label]) => (
            <a
              key={key}
              href={`#${key}`}
              className={`tab ${page === key ? "active" : ""}`}
              aria-current={page === key ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </div>
        {onLogout && (
          <button type="button" className="btn btn-link" onClick={onLogout}>
            Sign out
          </button>
        )}
      </nav>

      <main className="page">
        {page === "devices" ? <Devices /> : <Orders />}
      </main>
    </>
  );
}
