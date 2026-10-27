// A signature is kept as strokes, not as an image, so it can be redrawn sharply at any
// size (tablet rotation), undone stroke by stroke and stored in a report draft.
// Shape: { width, height, strokes: [[[x, y], ...], ...] } in the coordinates of a pad
// that was `width` x `height` CSS pixels when signing started. null = no signature.

export const PAD_HEIGHT = 200;

const LINE_WIDTH = 2.6;
const INK = "#111";

export function setupContext(ctx, scale) {
  ctx.lineWidth = LINE_WIDTH * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
}

// Smooth line through the points (quadratic curves between midpoints)
export function drawStroke(ctx, points, scale) {
  const p = points.map(([x, y]) => [x * scale, y * scale]);
  if (p.length === 1) {
    ctx.beginPath();
    ctx.arc(p[0][0], p[0][1], (LINE_WIDTH * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length - 1; i++) {
    const midX = (p[i][0] + p[i + 1][0]) / 2;
    const midY = (p[i][1] + p[i + 1][1]) / 2;
    ctx.quadraticCurveTo(p[i][0], p[i][1], midX, midY);
  }
  const last = p[p.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

// PNG of the signature on a white background, for the upload
export function signatureToBlob(signature, ratio = 2) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(signature.width * ratio);
  canvas.height = Math.round(signature.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  setupContext(ctx, ratio);
  for (const stroke of signature.strokes) drawStroke(ctx, stroke, ratio);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The signature couldn't be processed."))),
      "image/png",
    ),
  );
}
