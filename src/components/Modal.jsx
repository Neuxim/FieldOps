import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

// Open modals, newest last - Escape closes only the top one (modals can be nested)
const stack = [];

// With `title` the content gets a card with a header and a close button;
// without it, children render their own card and label it via `labelledBy`
export default function Modal({ onClose, labelledBy, title, wide = false, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const self = {};
    stack.push(self);

    const onKey = (e) => {
      if (e.key === "Escape" && stack.at(-1) === self) closeRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    (dialog?.querySelector("input, textarea, select") ?? dialog?.querySelector("button"))?.focus();

    return () => {
      stack.splice(stack.indexOf(self), 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const titleId = title ? `${labelledBy ?? "modal"}-title` : labelledBy;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeRef.current();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal${wide ? " modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {title ? (
          <div className="card modal-body">
            <header className="modal-header">
              <h2 id={titleId}>{title}</h2>
              <button
                type="button"
                className="icon-btn modal-close"
                onClick={() => closeRef.current()}
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body
  );
}
