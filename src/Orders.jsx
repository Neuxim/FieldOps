import { useEffect, useState } from "react";
import Button from "./components/Button";
import Modal from "./components/Modal";
import DeleteDialog from "./DeleteDialog";
import OrderForm from "./OrderForm";
import OrdersList from "./OrdersList";
import { changeOrder, getOrders } from "./api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [statusError, setStatusError] = useState("");
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

  const handleDeleted = () => {
    setDeleting(null);
    reload();
  };

  const handleStatusChange = async (order, status) => {
    const previous = orders;
    setStatusError("");
    setOrders((list) =>
      list.map((o) => (o.id === order.id ? { ...o, status } : o))
    );
    try {
      await changeOrder(order, { status });
    } catch (err) {
      setOrders(previous);
      setStatusError(err.message);
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>Orders</h1>
        <Button onClick={() => setEditing("new")}>Add order</Button>
      </header>

      {statusError && <p className="error">{statusError}</p>}

      <OrdersList
        orders={orders}
        loading={loading}
        error={error}
        onRetry={reload}
        onEdit={setEditing}
        onDelete={setDeleting}
        onStatusChange={handleStatusChange}
      />

      {editing && (
        <Modal onClose={() => setEditing(null)} labelledBy="order-form-title">
          <OrderForm
            order={editing === "new" ? null : editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <DeleteDialog
          order={deleting}
          onDeleted={handleDeleted}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
