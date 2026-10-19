// In dev, "/api" is proxied to the backend by Vite (see vite.config.js) to avoid CORS
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "/api" : "https://fieldops-xbkz.onrender.com");

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

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Can't connect to the server.");
  }
  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    window.dispatchEvent(new Event("session-expired"));
    throw new Error("Your session has expired - please sign in again.");
  }
  if (!res.ok) {
    const error = new Error(data?.message || data?.error || `Error ${res.status}`);
    error.status = res.status;
    error.fields = fieldErrors(data?.errors);
    throw error;
  }
  return data;
}

const listFrom = (data, key) => (Array.isArray(data) ? data : data?.[key] ?? []);
const byDate = (a, b) => new Date(a.date) - new Date(b.date);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeOrder(o, i) {
  const address =
    typeof o.address === "string"
      ? o.address
      : [o.address?.street, o.address?.city].filter(Boolean).join(", ");

  return {
    id: o.id ?? o._id ?? i,
    title: o.title || `Order #${i + 1}`,
    desc: o.description ?? o.desc ?? "",
    client: o.client_data ?? o.clientData ?? o.clientName ?? "",
    address,
    date: o.deadline ?? o.date,
    status: o.order_status ?? o.status,
  };
}

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
  return {
    id: i + 1,
    title: `${titles[i % 4]} #${i + 1}`,
    clientName: ["Anna Nowak", "Marek Zieliński", "Ewa Kowalczyk"][i % 3],
    address: [
      "ul. Lipowa 4, Rzeszów",
      "ul. Kwiatowa 12, Nowa Sarzyna",
      "ul. Słoneczna 7, Leżajsk",
    ][i % 3],
    deadline: d.toISOString(),
    status: ["todo", "in_progress", "done", "cancelled"][i % 4],
  };
});

export async function getOrders() {
  if (isDemo) {
    await wait(600);
    if (demo === "error") throw new Error("Can't connect to the server.");
    return demo === "empty" ? [] : mockOrders.map(normalizeOrder).sort(byDate);
  }

  const data = await request("/orders/get");
  return listFrom(data, "orders").map(normalizeOrder).sort(byDate);
}

export async function addOrder(order) {
  if (isDemo) {
    await wait(300);
    mockOrders.push({ ...order, id: mockOrders.length + 1 });
    return;
  }

  return request("/orders/add", {
    method: "POST",
    body: JSON.stringify(order),
  });
}
