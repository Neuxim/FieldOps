import { useEffect, useRef, useState } from "react";
import Button from "./components/Button";
import Modal from "./components/Modal";

// Reads barcodes and QR codes with the camera (browser's BarcodeDetector: Chrome, Edge, Android).
// Typing the number by hand is always available as an equal alternative.
const MESSAGES = {
  starting: "Starting the camera…",
  scanning: "Point the camera at a barcode or QR code.",
  denied: "Camera access was denied. Allow it in the browser settings or type the number below.",
  nocamera: "No camera was found on this device. Type the number below.",
  unsupported: "This browser can't read codes with the camera. Type the number below (or use Chrome / Edge).",
};

export default function ScanDialog({ onResult, onClose }) {
  const video = useRef(null);
  const [state, setState] = useState("starting");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let stream;
    let frame;
    let stopped = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return setState("nocamera");
      if (!("BarcodeDetector" in window)) return setState("unsupported");

      let detector;
      try {
        detector = new window.BarcodeDetector({
          formats: await window.BarcodeDetector.getSupportedFormats(),
        });
      } catch {
        detector = new window.BarcodeDetector();
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (err) {
        const noCamera = err.name === "NotFoundError" || err.name === "OverconstrainedError";
        return setState(noCamera ? "nocamera" : "denied");
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());

      const el = video.current;
      el.srcObject = stream;
      await el.play();
      setState("scanning");

      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(el);
          if (codes[0]?.rawValue) return onResult(codes[0].rawValue.trim());
        } catch {
          /* try the next frame */
        }
        frame = requestAnimationFrame(tick);
      };
      tick();
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    e.stopPropagation(); // the dialog is opened from inside the order form; don't submit that too
    if (manual.trim()) onResult(manual.trim());
  };

  return (
    <Modal title="Select device by code" onClose={onClose}>
      <video ref={video} className="scan-video" muted playsInline hidden={state !== "scanning"} />
      <p className={state === "scanning" || state === "starting" ? "scan-hint" : "scan-note"}>
        {MESSAGES[state]}
      </p>
      <form onSubmit={submit} className="scan-form">
        <label className="field">
          <span className="field-label">Device number</span>
          <input
            className="input"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="e.g. SN-884-120"
            autoFocus
          />
        </label>
        <Button type="submit" disabled={!manual.trim()}>
          Use number
        </Button>
      </form>
    </Modal>
  );
}
