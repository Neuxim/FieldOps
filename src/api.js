import { toPng } from "./imageUtils";
import { statusTone } from "./status";

// In dev, "/api" is proxied to the backend by Vite (see vite.config.js) to avoid CORS
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "/api" : "https://fieldops-xbkz.onrender.com");

const ENDPOINTS = {
  orders: "/orders/get",
  addOrder: "/orders/add", // accepts deviceId
  changeOrder: "/orders/change", // PATCH; the order is identified by id and old_title
  removeOrder: "/orders/remove",
  devices: "/devices/get", // ?search=name  or  ?number=serial
  addDevice: "/devices/add",
  changeDevice: "/devices/change", // PATCH
  generateReport: "/raports/generateRaport", // POST; also sets the order to done
  reports: "/raports/get", // reports of the logged-in user
  // Raw image as the body (Content-Type: image/png); the response has file.url
  uploadSignature: "/files/signature",
  uploadPhoto: "/files/photo",
  // NOT CONFIRMED with the backend: where an uploaded file can be read when only its id is known
  signatureFile: (id) => `/files/signature/${id}`,
  photoFile: (id) => `/files/photo/${id}`,
  // PATCH { name, email, oldPassword?, newPassword? }. There is no endpoint that reads the profile.
  editProfile: "/auth/edit",
};

// ?demo in the page URL uses sample data instead of the backend (?demo=empty, ?demo=error)
const demo = new URLSearchParams(location.search).get("demo");
export const isDemo = demo !== null;

function toText(value) {
  if (Array.isArray(value)) return value.map(toText).join(", ");
  if (value && typeof value === "object") {
    return value.message ?? value.msg ?? JSON.stringify(value);
  }
  return String(value);
}

function fieldErrors(errors) {
  if (!errors) return {};
  const entries = Array.isArray(errors)
    ? errors.map((e) => [e.path ?? e.param ?? e.field ?? "", e.msg ?? e.message ?? e])
    : Object.entries(errors);
  return Object.fromEntries(entries.map(([key, value]) => [key, toText(value)]));
}

export function describeError(err, fieldNames) {
  const fields = {};
  const other = [];
  for (const [key, text] of Object.entries(err.fields ?? {})) {
    if (fieldNames.includes(key)) fields[key] = text;
    else other.push(key ? `${key}: ${text}` : text);
  }
  return { fields, message: [err.message, ...other].join(" · ") };
}

// keepSession: a 401 means wrong input (e.g. current password), not an expired session
async function request(path, { keepSession = false, ...options } = {}) {
  const token = localStorage.getItem("token");
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        // JSON only for string bodies; FormData sets its own multipart header
        ...(typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Can't connect to the server.");
  }
  const data = await res.json().catch(() => null);

  if (res.status === 401 && !keepSession) {
    window.dispatchEvent(new Event("session-expired"));
    throw new Error("Your session has expired - please sign in again.");
  }
  if (!res.ok) {
    const error = new Error(data?.message || data?.error || `Error ${res.status}`);
    error.status = res.status;
    error.fields = fieldErrors(data?.errors);
    error.data = data;
    throw error;
  }
  return data;
}

const listFrom = (data, key) => (Array.isArray(data) ? data : data?.[key] ?? []);

// The reports response isn't documented: accept a plain list or one under a usual key
function reportList(data) {
  if (Array.isArray(data)) return data;
  for (const key of ["reports", "raports", "raport", "report", "data", "items", "results"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

// Reports by order id from the last successful /raports/get
let lastReports = new Map();
// Orders that got a report in this session (or that the server said already have one),
// so the list shows it even before /raports/get includes it
const reportedOrders = new Set();
const byDate = (a, b) => new Date(a.date) - new Date(b.date);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read the photo."));
    reader.readAsDataURL(blob);
  });
}

function normalizeDevice(d, i) {
  return {
    id: d.id ?? d._id ?? i,
    name: d.name ?? d.title ?? `Device #${i + 1}`,
    model: d.model ?? "",
    location: d.location ?? "",
    serialNumber: String(d.serialNumber ?? d.serial_number ?? d.number ?? d.code ?? ""),
  };
}

const imageUrl = (v) => {
  if (!v) return null;
  if (typeof v === "string") return /^(https?:|data:|blob:|\/)/.test(v) ? v : null;
  return imageUrl(v.url ?? v.path ?? v.src ?? null);
};

// signature_id / photo_ids hold file names (e.g. "8938f7c0-....png"); turn them into backend paths.
// Paths starting with "/" are read with the login token (see FileImage).
const fileUrl = (value, toPath) =>
  imageUrl(value) ?? (typeof value === "string" && value ? toPath(value) : null);

function normalizeReport(r) {
  if (!r || typeof r !== "object") return null;
  const loc = r.location;
  const lat = Number(loc?.lat ?? loc?.latitude);
  const lng = Number(loc?.lng ?? loc?.lon ?? loc?.longitude);
  const location =
    typeof loc === "string" ? loc.trim() : loc && Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : "";

  return {
    orderId:
      r.orderId ??
      r.order_id ??
      r.orderID ??
      r.order?.id ??
      r.order?._id ??
      (typeof r.order === "string" || typeof r.order === "number" ? r.order : null),
    description: r.documentation ?? r.description ?? r.desc ?? "",
    name: r.name ?? r.signerName ?? r.signer_name ?? "",
    location,
    photos: [
      ...(Array.isArray(r.photos) ? r.photos : []),
      ...(Array.isArray(r.images) ? r.images : []),
      ...(Array.isArray(r.photo_ids) ? r.photo_ids : []),
      ...(Array.isArray(r.photoIds) ? r.photoIds : []),
      r.photo,
      r.photo_url,
      r.photoUrl,
    ]
      .map((p) => fileUrl(p, ENDPOINTS.photoFile))
      .filter(Boolean),
    signature:
      imageUrl(r.signature ?? r.signature_url ?? r.signatureUrl) ??
      fileUrl(r.signature_id ?? r.signatureId, ENDPOINTS.signatureFile),
    signatureId: r.signature_id ?? r.signatureId ?? null,
    date: r.date ?? r.createdAt ?? r.created_at ?? null,
  };
}

function normalizeOrder(o, i) {
  const address =
    typeof o.address === "string"
      ? o.address
      : [o.address?.street, o.address?.city].filter(Boolean).join(", ");
  const report = normalizeReport(o.report ?? o.raport);
  // Some order responses only say that a report exists (an id or a flag)
  const reportRef =
    o.hasReport ?? o.has_report ?? o.hasRaport ?? o.reportId ?? o.report_id ?? o.raportId ?? o.raport_id;

  return {
    id: o.id ?? o._id ?? i,
    title: o.title || `Order #${i + 1}`,
    desc: o.description ?? o.desc ?? "",
    client: o.client_data ?? o.clientData ?? o.clientName ?? "",
    address,
    date: o.deadline ?? o.date,
    status: o.order_status ?? o.status,
    deviceId: o.deviceId ?? o.device_id ?? o.device?.id ?? o.device?._id ?? "",
    device: o.device && typeof o.device === "object" ? normalizeDevice(o.device, 0) : null,
    // Used to detect that someone else changed the order (conflicts)
    version: o.version ?? o.updatedAt ?? o.updated_at ?? null,
    report,
    hasReport: Boolean(report) || Boolean(reportRef) || reportedOrders.has(String(o.id ?? o._id ?? i)),
  };
}

/* ---------- Demo data (in memory, reset on page reload) ---------- */

const sampleImage = (label, hue) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="hsl(${hue} 35% 30%)"/><text x="400" y="310" font-size="40" text-anchor="middle" fill="#fff" font-family="sans-serif">${label}</text></svg>`,
  );
const sampleSignature =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="300" height="120" fill="#fff"/><path d="M20 80 C50 20 70 110 100 50 S150 100 180 40 S240 90 280 30" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/></svg>',
  );

const mockDevices = [
  { id: 1, name: "Heat pump", serialNumber: "FO-A1B2C3", model: "Vaillant aroTHERM plus 7", location: "Boiler room, ul. Lipowa 4" },
  { id: 2, name: "Air conditioner", serialNumber: "SN-884-120", model: "Daikin FTXM35", location: "Office 2.14" },
  { id: 3, name: "Gas boiler", serialNumber: "SN-552-901", model: "Viessmann Vitodens 100", location: "ul. Kwiatowa 12" },
  { id: 4, name: "Recuperator", serialNumber: "FO-Z9Y8X7", model: "Zehnder ComfoAir Q350", location: "ul. Słoneczna 7" },
];

const mockOrders = Array.from({ length: 19 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i - 4);
  d.setHours(8 + (i % 8), 0, 0, 0);
  const titles = [
    "Heat pump inspection",
    "Filter replacement",
    "Boiler won't start",
    "Recuperator calibration",
  ];
  const status = ["todo", "in_progress", "done", "cancelled"][i % 4];
  return {
    id: i + 1,
    title: `${titles[i % 4]} #${i + 1}`,
    description: "Scope of work to be confirmed on site with the client.",
    clientName: ["Anna Nowak", "Marek Zieliński", "Ewa Kowalczyk"][i % 3],
    address: [
      "ul. Lipowa 4, Rzeszów",
      "ul. Kwiatowa 12, Nowa Sarzyna",
      "ul. Słoneczna 7, Leżajsk",
    ][i % 3],
    deadline: d.toISOString(),
    status,
    deviceId: i % 5 === 4 ? "" : mockDevices[i % 4].id,
    version: 1,
    // Two finished orders come with a report (like one made from the mobile app)
    report:
      status === "done" && i < 8
        ? {
            orderId: i + 1,
            documentation: "Replaced the seals and checked the circuit pressure. Everything works as expected.",
            name: ["Anna Nowak", "Marek Zieliński", "Ewa Kowalczyk"][i % 3],
            location: "50.0412, 22.0045",
            photos: [sampleImage("Photo 1", 260), sampleImage("Photo 2", 200)],
            signature: sampleSignature,
            createdAt: new Date(d.getTime() + 3 * 3600e3).toISOString(),
          }
        : null,
  };
});

const findMock = (id) => {
  const o = mockOrders.find((x) => String(x.id) === String(id));
  if (!o) throw new Error("Order not found.");
  return o;
};

/* ---------- Orders ---------- */

export async function getOrders() {
  if (isDemo) {
    await wait(600);
    if (demo === "error") throw new Error("Can't connect to the server.");
    return demo === "empty" ? [] : mockOrders.map(normalizeOrder).sort(byDate);
  }

  // Reports live in a separate endpoint; join them to orders (a failing reports call must not hide the orders)
  const [data, reportsData] = await Promise.all([
    request(ENDPOINTS.orders),
    request(ENDPOINTS.reports).catch(() => null),
  ]);
  if (reportsData) {
    lastReports = new Map(
      reportList(reportsData)
        .map(normalizeReport)
        .filter((r) => r?.orderId != null)
        .map((r) => [String(r.orderId), r]),
    );
  }
  // If the reports call failed, the last list that loaded is used - a report never "disappears"

  return listFrom(data, "orders")
    .map(normalizeOrder)
    .map((o) => {
      const report = lastReports.get(String(o.id)) ?? o.report;
      return { ...o, report, hasReport: Boolean(report) || o.hasReport };
    })
    .sort(byDate);
}

// There is no "single order" endpoint yet, so the real mode picks it from the list
export async function getOrder(id) {
  if (isDemo) {
    await wait(250);
    if (demo === "error") throw new Error("Can't connect to the server.");
    return normalizeOrder(findMock(id), 0);
  }

  const orders = await getOrders();
  const order = orders.find((o) => String(o.id) === String(id));
  if (!order) throw new Error("Order not found.");
  return order;
}

export async function addOrder(order) {
  if (isDemo) {
    await wait(300);
    mockOrders.push({
      id: mockOrders.length + 1,
      title: order.title,
      description: order.description,
      clientName: order.clientData,
      address: order.address,
      deadline: order.date,
      status: "todo",
      deviceId: order.deviceId ?? "",
      version: 1,
      report: null,
    });
    return;
  }

  return request(ENDPOINTS.addOrder, {
    method: "POST",
    body: JSON.stringify(order),
  });
}

// `order` is the version the change is based on; `changes` uses the same field names (title, desc, status...).
// Throws with status 409 (and `current`) when the order was changed elsewhere in the meantime.
export async function changeOrder(order, changes) {
  const next = { ...order, ...changes };
  // An empty deviceId clears the link to the device
  const deviceId = next.deviceId === "" ? null : next.deviceId;

  if (isDemo) {
    await wait(300);
    const o = findMock(order.id);
    if (order.version != null && order.version !== o.version) {
      const error = new Error("The order was changed elsewhere in the meantime.");
      error.status = 409;
      error.current = normalizeOrder(o, 0);
      throw error;
    }
    Object.assign(o, {
      title: next.title,
      description: next.desc,
      clientName: next.client,
      address: next.address,
      deadline: next.date,
      status: next.status,
      deviceId: deviceId ?? "",
      version: o.version + 1,
    });
    return normalizeOrder(o, 0);
  }

  try {
    const data = await request(ENDPOINTS.changeOrder, {
      method: "PATCH",
      body: JSON.stringify({
        id: order.id,
        old_title: order.title,
        title: next.title,
        description: next.desc,
        clientData: next.client,
        address: next.address,
        date: next.date,
        status: next.status,
        deviceId,
      }),
    });
    const saved = data?.order ?? data;
    return saved && typeof saved === "object" && (saved.id ?? saved._id) ? normalizeOrder(saved, 0) : null;
  } catch (err) {
    if (err.status === 409 && err.data?.current) {
      err.current = normalizeOrder(err.data.current, 0);
    }
    throw err;
  }
}

export async function deleteOrder(order) {
  if (isDemo) {
    await wait(300);
    mockOrders.splice(mockOrders.indexOf(findMock(order.id)), 1);
    return;
  }

  return request(ENDPOINTS.removeOrder, {
    method: "DELETE",
    body: JSON.stringify({ id: order.id, title: order.title }),
  });
}

/* ---------- Devices ---------- */

export async function getDevices({ search = "", number = "" } = {}) {
  if (isDemo) {
    await wait(300);
    if (demo === "error") throw new Error("Can't connect to the server.");
    return mockDevices
      .filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) &&
          d.serialNumber.toLowerCase().includes(number.toLowerCase())
      )
      .map(normalizeDevice);
  }

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (number) params.set("number", number);
  const query = params.toString();

  const data = await request(`${ENDPOINTS.devices}${query ? `?${query}` : ""}`);
  return listFrom(data, "devices").map(normalizeDevice);
}

// Looks a device up by its serial number; returns null when there is no such device
export async function findDeviceByNumber(number) {
  const serial = number.trim();
  if (isDemo) {
    await wait(250);
    const d = mockDevices.find((x) => x.serialNumber.toLowerCase() === serial.toLowerCase());
    return d ? normalizeDevice(d, 0) : null;
  }

  // GET /devices/get?number= filters by serial number; pick the exact match
  try {
    const devices = await getDevices({ number: serial });
    return devices.find((d) => d.serialNumber.toLowerCase() === serial.toLowerCase()) ?? null;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// An empty serialNumber lets the server generate a code
export async function addDevice({ name, model, location, serialNumber }) {
  if (isDemo) {
    await wait(300);
    const serial = serialNumber || `FO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    if (mockDevices.some((d) => d.serialNumber.toLowerCase() === serial.toLowerCase())) {
      const error = new Error("A device with this serial number already exists.");
      error.status = 409;
      error.fields = { serialNumber: "This serial number is already registered" };
      throw error;
    }
    mockDevices.push({ id: mockDevices.length + 1, name, model, location, serialNumber: serial });
    return;
  }

  return request(ENDPOINTS.addDevice, {
    method: "POST",
    body: JSON.stringify(serialNumber ? { name, model, location, serialNumber } : { name, model, location }),
  });
}

export async function changeDevice({ id, name, model, location }) {
  if (isDemo) {
    await wait(300);
    const d = mockDevices.find((x) => String(x.id) === String(id));
    if (d) Object.assign(d, { name, model, location });
    return;
  }

  return request(ENDPOINTS.changeDevice, {
    method: "PATCH",
    body: JSON.stringify({ id, name, model, location }),
  });
}

/* ---------- Reports ---------- */

// Sends the image itself as the body; returns the id generateRaport expects (the stored file name)
async function uploadFile(endpoint, blob) {
  const send = (b) =>
    request(endpoint, { method: "POST", body: b, headers: { "Content-Type": b.type || "image/png" } });

  let data;
  try {
    data = await send(blob);
  } catch (err) {
    // The API documents PNG uploads; if a JPEG photo is refused, send it again as PNG
    const refused = err.status >= 400 && err.status < 500 && err.status !== 401;
    if (blob.type === "image/png" || !refused) throw err;
    data = await send(await toPng(blob));
  }

  const file = data?.file ?? data;
  const id = file?.id ?? file?._id ?? file?.filename ?? file?.name ?? file?.url?.split("/").pop();
  if (!id) throw new Error("The server didn't return an id for the uploaded file.");
  return String(id);
}

// photos: Blobs (already shrunk), signature: Blob. onProgress gets a short status text.
export async function saveReport(order, { description, name, location, photos, signature }, onProgress) {
  if (isDemo) {
    await wait(500);
    const o = findMock(order.id);
    if (o.report) throw new Error("This order already has a report.");
    if (statusTone(o.status) === "cancelled") throw new Error("A cancelled order can't get a report.");
    o.report = {
      orderId: o.id,
      documentation: description,
      name,
      location,
      photos: await Promise.all(photos.map(blobToDataUrl)),
      signature: await blobToDataUrl(signature),
      createdAt: new Date().toISOString(),
    };
    o.status = "done"; // like the real endpoint: generating the report finishes the order
    o.version += 1;
    return;
  }

  const photoIds = [];
  for (let i = 0; i < photos.length; i++) {
    onProgress?.(`Uploading photo ${i + 1} of ${photos.length}…`);
    photoIds.push(await uploadFile(ENDPOINTS.uploadPhoto, photos[i]));
  }
  onProgress?.("Uploading signature…");
  const signatureId = await uploadFile(ENDPOINTS.uploadSignature, signature);

  onProgress?.("Saving report…");
  try {
    const data = await request(ENDPOINTS.generateReport, {
      method: "POST",
      body: JSON.stringify({
        orderId: order.id,
        documentation: description,
        name,
        location,
        signature_id: signatureId,
        ...(photoIds.length > 0 ? { photo_ids: photoIds } : {}),
      }),
    });
    reportedOrders.add(String(order.id));
    return data;
  } catch (err) {
    // The server already has a report for this order (e.g. made on another device)
    if (err.status === 409 || /already|exist|istnieje|już/i.test(err.message)) {
      reportedOrders.add(String(order.id));
      const error = new Error("This order already has a report, so a second one can't be saved.");
      error.status = err.status;
      error.alreadyReported = true;
      throw error;
    }
    throw err;
  }
}

// Demo only: pretends someone changed the order from the phone
export async function simulateRemoteChange(id) {
  if (!isDemo) return;
  const o = findMock(id);
  o.description = `${o.description.replace(/ \[phone: .*\]$/, "")} [phone: ${new Date().toLocaleTimeString("en-US")}]`;
  o.version += 1;
}

/* ---------- Profile ---------- */

const mockProfile = { name: "Jan Serwisant", email: "jan@fieldops.pl" };

// The server has no "get my profile" endpoint, so the app keeps the last known
// { name, email } of the signed-in user: from the login response, the token or the last edit
export const PROFILE_KEY = "profile";

function readStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function storeProfile(user) {
  if (!user || typeof user !== "object") return;
  const { name, email } = user;
  if (name || email) localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, email }));
}

function tokenClaims() {
  const payload = localStorage.getItem("token")?.split(".")[1];
  if (!payload) return {};
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      [...atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))]
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function normalizeProfile(u) {
  const [first = "", ...rest] = (u?.name ?? "").trim().split(/\s+/);
  return {
    firstName: u?.firstName ?? u?.first_name ?? first,
    lastName: u?.lastName ?? u?.last_name ?? rest.join(" "),
    email: u?.email ?? "",
  };
}

export async function getProfile() {
  if (isDemo) {
    await wait(300);
    return normalizeProfile(mockProfile);
  }

  const claims = tokenClaims();
  const stored = readStoredProfile();
  return normalizeProfile({
    name: stored.name ?? claims.name ?? claims.username,
    email: stored.email ?? claims.email,
  });
}

// name and email are sent with every edit; the password fields only when changing the password.
// keepSession: a wrong old password must not sign the user out.
async function editProfile(body) {
  const data = await request(ENDPOINTS.editProfile, {
    method: "PATCH",
    keepSession: true,
    body: JSON.stringify(body),
  });
  const user = data?.user ?? data;
  storeProfile(user?.name || user?.email ? user : { name: body.name, email: body.email });
  return data;
}

export async function changeProfile({ firstName, lastName, email }) {
  const name = `${firstName} ${lastName}`;

  if (isDemo) {
    await wait(300);
    Object.assign(mockProfile, { name, email });
    return;
  }

  return editProfile({ name, email });
}

// `profile` is the current { firstName, lastName, email } - the endpoint expects name and email too
export async function changePassword({ profile, currentPassword, newPassword }) {
  if (isDemo) {
    await wait(300);
    return;
  }

  return editProfile({
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    oldPassword: currentPassword,
    newPassword,
  });
}

// Stored files (report photos, signatures) need the login token, so <img> can't load them directly.
// Returns an object URL for the image; the caller revokes it when done.
export async function getFileObjectUrl(path) {
  const token = localStorage.getItem("token");
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error("Can't connect to the server.");
  }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return URL.createObjectURL(await res.blob());
}
