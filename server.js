const http = require("http");
const fs = require("fs");
const path = require("path");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT, 10) || 3000;

let indexHtml = null;
try {
  indexHtml = fs.readFileSync(path.join(__dirname, "public", "index.html"));
} catch (err) {
  console.warn("public/index.html not found, / will fall back to Next.js routing");
}

const app = next({ dev });
const handle = app.getRequestHandler();

let server;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendHealth(res) {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...CORS_HEADERS,
  });
  res.end(
    JSON.stringify({
      status: "ok",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    })
  );
}

function sendPreflight(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

function sendIndex(res) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    ...CORS_HEADERS,
  });
  res.end(indexHtml);
}

app.prepare().then(() => {
  server = http.createServer((req, res) => {
    const url = req.url.split("?")[0];

    if (url === "/api/health" && req.method === "GET") return sendHealth(res);
    if (url === "/api/health" && req.method === "OPTIONS") return sendPreflight(res);
    if (url === "/" && req.method === "GET" && indexHtml) return sendIndex(res);

    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`Health check API ready on http://localhost:${port}`);
  });
});

app.prepare().catch((err) => {
  console.error("Failed to initialize Next.js:", err);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  if (!server) process.exit(0);
  server.close(() => {
    console.log("Server closed. Exiting.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forcing shutdown.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
