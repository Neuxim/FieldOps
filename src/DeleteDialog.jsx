import { useState } from "react";
import Button from "./components/Button";
import Modal from "./components/Modal";

// Confirmation before a permanent delete. onDelete does the request; onDeleted runs after it succeeded.
export default function DeleteDialog({ title, text, onDelete, onDeleted, onCancel }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await onDelete();
      onDeleted();
    } catch (err) {
      setError(
        err.status === 409
          ? "Someone else changed it in the meantime, so it wasn't deleted. Close this, check the latest version and try again."
          : err.message,
      );
      setDeleting(false);
    }
  };

  return (
    <Modal onClose={onCancel} labelledBy="delete-title">
      <div className="card form">
        <h2 id="delete-title" className="card-title">
          {title}
        </h2>
        <p className="dialog-text">{text}</p>
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
