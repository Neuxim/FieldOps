import { useState } from "react";
import Button from "./components/Button";
import Modal from "./components/Modal";
import { deleteOrder } from "./api";

export default function DeleteDialog({ order, onDeleted, onCancel }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteOrder(order);
      onDeleted();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <Modal onClose={onCancel} labelledBy="delete-title">
      <div className="card form">
        <h2 id="delete-title" className="card-title">
          Delete order?
        </h2>
        <p className="dialog-text">
          "{order.title}" will be permanently deleted.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
