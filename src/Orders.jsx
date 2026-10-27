import { useEffect, useState } from "react";
import Button from "./components/Button";
import DeleteDialog from "./DeleteDialog";
import DraftsNotice from "./DraftsNotice";
import OrderDetails from "./OrderDetails";
import OrderForm from "./OrderForm";
import OrdersList from "./OrdersList";
import ReportForm from "./ReportForm";
import { changeOrder, deleteOrder, getOrders } from "./api";
import { deleteDraft, listDrafts } from "./reportDrafts";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // Which screen is shown: list | new | details | edit | report
  const [view, setView] = useState({ name: "list" });
  const [detailsKey, setDetailsKey] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // Drafts are optional: if this browser can't keep them, the list still loads
    Promise.all([getOrders(), listDrafts().catch(() => [])])
      .then(([data, saved]) => {
        if (cancelled) return;
        setOrders(data);
        setError("");
        // A draft of an order that no longer exists can't be finished
        const ids = new Set(data.map((o) => String(o.id)));
        const orphans = saved.filter((d) => !ids.has(d.orderId));
        orphans.forEach((d) => deleteDraft(d.orderId).catch(() => {}));
        setDrafts(saved.filter((d) => ids.has(d.orderId)));
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

  const showList = () => {
    reload();
    setView({ name: "list" });
  };
  const showDetails = (id) => {
    reload();
    setDetailsKey((k) => k + 1); // forces OrderDetails to fetch fresh data
    setView({ name: "details", id });
  };
  // Edit returns to where it was opened from (list or details)
  const edit = (order, from) => setView({ name: "edit", order, from });
  const leaveEdit = () => (view.from === "details" ? showDetails(view.order.id) : showList());

  const handleDeleted = () => {
    setDeleting(null);
    showList();
  };

  const handleStatusChange = async (order, status) => {
    const previous = orders;
    setStatusError("");
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await changeOrder(order, { status });
      reload(); // picks up the new version of the order
    } catch (err) {
      setOrders(previous);
      if (err.status === 409) {
        setStatusError("Someone else changed this order in the meantime. The list now shows the latest version - try again.");
        reload();
      } else {
        setStatusError(err.message);
      }
    }
  };

  const discardDraft = async (draft) => {
    await deleteDraft(draft.orderId).catch(() => {});
    setDrafts((list) => list.filter((d) => d.key !== draft.key));
  };

  const deleteDialog = deleting && (
    <DeleteDialog
      title="Delete order?"
      text={`"${deleting.title}" will be permanently deleted.`}
      onDelete={() => deleteOrder(deleting)}
      onDeleted={handleDeleted}
      onCancel={() => setDeleting(null)}
    />
  );

  if (view.name === "new") {
    return <OrderForm onSaved={showList} onCancel={() => setView({ name: "list" })} />;
  }

  if (view.name === "edit") {
    return <OrderForm order={view.order} onSaved={leaveEdit} onCancel={leaveEdit} />;
  }

  if (view.name === "report") {
    return (
      <ReportForm
        order={view.order}
        onSaved={() => showDetails(view.order.id)}
        onCancel={() => showDetails(view.order.id)}
      />
    );
  }

  if (view.name === "details") {
    return (
      <>
        <OrderDetails
          key={detailsKey}
          id={view.id}
          onBack={showList}
          onEdit={(order) => edit(order, "details")}
          onReport={(order) => setView({ name: "report", order })}
          onDelete={setDeleting}
        />
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1>Orders</h1>
        <Button onClick={() => setView({ name: "new" })}>Add order</Button>
      </header>

      <DraftsNotice
        drafts={drafts}
        orders={orders}
        onContinue={(order) => setView({ name: "report", order })}
        onDiscard={discardDraft}
      />

      {statusError && <p className="error">{statusError}</p>}

      <OrdersList
        orders={orders}
        loading={loading}
        error={error}
        onRetry={reload}
        onOpen={(order) => setView({ name: "details", id: order.id })}
        onEdit={(order) => edit(order, "list")}
        onDelete={setDeleting}
        onReport={(order) => setView({ name: "report", order })}
        onStatusChange={handleStatusChange}
      />

      {deleteDialog}
    </>
  );
}
