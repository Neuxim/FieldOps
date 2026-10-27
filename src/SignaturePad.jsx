import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import Button from "./components/Button";
import { PAD_HEIGHT, drawStroke, setupContext } from "./signature";

// Sizes the canvas to its box (sharp on hi-dpi screens) and draws the whole signature
// plus the stroke in progress. Returns the scale: CSS pixels per signature unit.
function paint(c, signature, current) {
  const ratio = window.devicePixelRatio || 1;
  const width = c.clientWidth;
  c.width = Math.round(width * ratio);
  c.height = Math.round(PAD_HEIGHT * ratio);

  const ctx = c.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, PAD_HEIGHT);

  const scale = signature ? width / signature.width : 1;
  setupContext(ctx, scale);
  for (const s of signature?.strokes ?? []) drawStroke(ctx, s, scale);
  if (current) drawStroke(ctx, current, scale);
  return scale;
}

// Signature with mouse, pen or finger. `value` / onChange use the stroke format from signature.js.
export default function SignaturePad({ value, onChange, invalid }) {
  const canvas = useRef(null);
  const valueRef = useRef(value);
  const stroke = useRef(null); // points of the stroke being drawn
  const scaleRef = useRef(1);

  useEffect(() => {
    valueRef.current = value;
    scaleRef.current = paint(canvas.current, value, stroke.current);
  }, [value]);

  // Tablet rotated / window resized: keep the signature, just draw it at the new size
  useEffect(() => {
    const c = canvas.current;
    const observer = new ResizeObserver(() => {
      scaleRef.current = paint(c, valueRef.current, stroke.current);
    });
    observer.observe(c);
    return () => observer.disconnect();
  }, []);

  const point = (e) => {
    const box = canvas.current.getBoundingClientRect();
    return [(e.clientX - box.left) / scaleRef.current, (e.clientY - box.top) / scaleRef.current];
  };

  const start = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    canvas.current.setPointerCapture(e.pointerId);
    stroke.current = [point(e)];
    drawStroke(canvas.current.getContext("2d"), stroke.current, scaleRef.current);
  };

  const move = (e) => {
    if (!stroke.current) return;
    const points = stroke.current;
    points.push(point(e));
    drawStroke(canvas.current.getContext("2d"), points.slice(-2), scaleRef.current);
  };

  const end = () => {
    const points = stroke.current;
    if (!points) return;
    stroke.current = null;
    const sig = valueRef.current ?? { width: canvas.current.clientWidth, height: PAD_HEIGHT, strokes: [] };
    onChange({ ...sig, strokes: [...sig.strokes, points] });
  };

  const undo = () => {
    const strokes = value.strokes.slice(0, -1);
    onChange(strokes.length > 0 ? { ...value, strokes } : null);
  };

  return (
    <div className="sig">
      <div className="sig-wrap">
        <canvas
          ref={canvas}
          className={invalid ? "invalid" : ""}
          style={{ height: PAD_HEIGHT }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          role="img"
          aria-label="Signature area - sign with a mouse, pen or finger"
        />
        {!value && <span className="sig-hint">Sign here</span>}
      </div>
      <div className="sig-actions">
        <Button type="button" variant="secondary" onClick={undo} disabled={!value}>
          <FontAwesomeIcon icon={faRotateLeft} /> Undo
        </Button>
        <Button type="button" variant="secondary" onClick={() => onChange(null)} disabled={!value}>
          <FontAwesomeIcon icon={faEraser} /> Clear
        </Button>
      </div>
    </div>
  );
}
