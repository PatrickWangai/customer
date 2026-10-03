// Custom server for cPanel's Node.js app hosting (Phusion Passenger).
// Passenger runs this file directly rather than `next start` — it has no
// concept of the Next.js CLI, it just expects a plain Node script that
// listens on the port it provides via process.env.PORT. This is Next.js's
// documented custom-server pattern (next()/getRequestHandler()), not a
// Passenger-specific hack — the same file would work unmodified on any
// host that wants a custom server rather than `next start`.
const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on port ${port}`);
  });
});
