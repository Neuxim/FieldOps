import { useEffect, useState } from "react";
import Button from "./components/Button";
import OrderForm from "./OrderForm";
import OrdersList from "./OrdersList";
import { getOrders } from "./api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
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
    setShowForm(false);
    reload();
  };

  return (
    <>
      <header className="page-header">
        <h1>Orders</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Add order</Button>
        )}
      </header>

      {showForm && (
        <OrderForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
      )}

      <OrdersList
        orders={orders}
        loading={loading}
        error={error}
        onRetry={reload}
      />
    </>
  );
}
