import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import Calendar from "./Calendar";
import Devices from "./Devices";
import Orders from "./Orders";
import Profile from "./Profile";

const PAGES = {
  orders: ["Orders", Orders],
  calendar: ["Calendar", Calendar],
  devices: ["Devices", Devices],
  profile: ["Profile", Profile],
};
const TABS = ["orders", "calendar", "devices"];

const pageFromHash = () => {
  const page = location.hash.slice(1);
  return page in PAGES ? page : "orders";
};

export default function Dashboard({ onLogout }) {
  const [page, setPage] = useState(pageFromHash);
  const Page = PAGES[page][1];

  useEffect(() => {
    const sync = () => setPage(pageFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const tabProps = (key) => ({
    href: `#${key}`,
    className: `tab ${page === key ? "active" : ""}`,
    "aria-current": page === key ? "page" : undefined,
  });

  return (
    <>
      <nav className="topbar">
        <span className="brand">FieldOps</span>
        <div className="tabs">
          {TABS.map((key) => (
            <a key={key} {...tabProps(key)}>
              {PAGES[key][0]}
            </a>
          ))}
        </div>
        <div className="topbar-account">
          <a {...tabProps("profile")} title="Profile">
            <FontAwesomeIcon icon={faUser} />
            <span className="tab-label">Profile</span>
          </a>
          {onLogout && (
            <button type="button" className="btn btn-link" onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
      </nav>

      <main className="page">
        <Page />
      </main>
    </>
  );
}
