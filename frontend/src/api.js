// "/api" is proxied to the backend by Vite (see vite.config.js) to avoid CORS
const API_URL = import.meta.env.VITE_API_URL ?? "/api";

// ?demo in the page URL uses sample data instead of the backend (?demo=empty, ?demo=error)
const demo = new URLSearchParams(location.search).get("demo");

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
    throw new Error(
      token
        ? "Your token is invalid or has expired - please log in again."
        : 'No token - please log in (the token must be in localStorage under the "token" key).'
    );
  }
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Error ${res.status}`);
  }
  return data;
}

function normalizeOrder(o, i) {
  const address =
    typeof o.address === "string"
      ? o.address
      : [o.address?.street, o.address?.city].filter(Boolean).join(", ");

  return {
    id: o.id ?? o._id ?? i,
    title: o.title || `Order #${i + 1}`,
    desc: o.desc ?? "",
    client: o.clientName ?? o.client?.name ?? "",
    address,
    date: o.deadline ?? o.date,
    status: o.status,
  };
}

const byDate = (a, b) => new Date(a.date) - new Date(b.date);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  if (demo !== null) {
    await wait(600);
    if (demo === "error") throw new Error("Can't connect to the server.");
    return demo === "empty" ? [] : mockOrders.map(normalizeOrder).sort(byDate);
  }

  const data = await request("/orders/get");
  const list = Array.isArray(data) ? data : data?.orders ?? [];
  return list.map(normalizeOrder).sort(byDate);
}

export async function addOrder(order) {
  if (demo !== null) {
    await wait(300);
    mockOrders.push({ ...order, id: mockOrders.length + 1 });
    return;
  }

  return request("/orders/add", {
    method: "POST",
    body: JSON.stringify(order),
  });
}
