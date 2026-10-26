import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";

export default function StatusPicker({ value, label, tone, options, onChange }) {
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const open = position !== null;

  useEffect(() => {
    if (!open) return;

    const close = () => setPosition(null);
    const onMouseDown = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        close();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const fitsBelow = window.innerHeight - rect.bottom > 220;
    setPosition(
      fitsBelow
        ? { top: rect.bottom + 6, left: rect.left }
        : { bottom: window.innerHeight - rect.top + 6, left: rect.left }
    );
  };

  const choose = (next) => {
    setPosition(null);
    if (next !== value) onChange(next);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`badge badge-button ${tone}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        {label}
        <FontAwesomeIcon icon={faCaretDown} className="caret" />
      </button>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className="status-menu"
            role="listbox"
            style={position}
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className="status-option"
                  onClick={() => choose(o.value)}
                >
                  <span className={`badge ${o.tone}`}>{o.label}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}
