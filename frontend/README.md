# FieldOps – frontend

React + Vite app for managing orders.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

Requests to `/api/...` go through the Vite dev server to the backend on Render (see `vite.config.js`), so there are no CORS errors.

## Logging in

The orders endpoints need a token. Log in once and the token is saved in `localStorage` under `token`:

```js
fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "you@example.com", password: "your-password" }),
})
  .then((r) => r.json())
  .then((d) => d.token && localStorage.setItem("token", d.token));
```

## Sample data

Add `?demo` to the page URL to use sample orders instead of the backend.
`?demo=empty` and `?demo=error` show the empty and error states.
