import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Button from "./components/Button";
import Modal from "./components/Modal";

export default function StickerDialog({ device, onClose }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(device.serialNumber, { margin: 1, width: 300 }).then(
      (url) => {
        if (!cancelled) setQr(url);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [device.serialNumber]);

  return (
    <Modal onClose={onClose} labelledBy="sticker-title">
      <div className="card form">
        <h2 id="sticker-title" className="card-title no-print">
          Device sticker
        </h2>

        <div className="sticker">
          {qr && <img src={qr} alt={`QR code ${device.serialNumber}`} />}
          <div className="sticker-text">
            <span className="sticker-brand">FieldOps</span>
            <strong>{device.name}</strong>
            <span>{device.model}</span>
            <span className="sticker-code">{device.serialNumber}</span>
          </div>
        </div>

        <div className="dialog-actions no-print">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()} disabled={!qr}>
            Print
          </Button>
        </div>
      </div>
    </Modal>
  );
}
