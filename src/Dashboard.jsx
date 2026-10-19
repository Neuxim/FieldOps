import Orders from "./Orders";

export default function Dashboard({ onLogout }) {
  return (
    <>
      <nav className="topbar">
        <span className="brand">FieldOps</span>
        {onLogout && (
          <button type="button" className="btn btn-link" onClick={onLogout}>
            Sign out
          </button>
        )}
      </nav>

      <main className="page">
        <Orders />
      </main>
    </>
  );
}
