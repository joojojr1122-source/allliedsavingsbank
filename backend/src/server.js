const http = require("http");
const path = require("path");
const { URL } = require("url");
const { loadLocalEnv } = require("./utils/env");

loadLocalEnv();

const { handleAuthRoute } = require("./routes/authRoutes");
const { handleAccountRoute } = require("./routes/accountRoutes");
const { handleAdminRoute } = require("./routes/adminRoutes");
const { getDatabaseInfo } = require("./services/databaseService");
const { sendJson, sendStaticFile } = require("./utils/http");

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "..", "frontend");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) {
    sendJson(res, 200, {
      ok: true,
      service: "turkishbank-account-portal",
      timestamp: new Date().toISOString(),
      database: getDatabaseInfo(),
      environment: {
        node: process.version,
        vercel: Boolean(process.env.VERCEL),
        adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD),
        sessionSecretConfigured: Boolean(process.env.SESSION_SECRET)
      }
    });
    return;
  }

  if (url.pathname.startsWith("/api/auth")) {
    await handleAuthRoute(req, res, url);
    return;
  }

  if (url.pathname.startsWith("/api/account")) {
    await handleAccountRoute(req, res, url);
    return;
  }

  if (url.pathname.startsWith("/api/admin")) {
    await handleAdminRoute(req, res, url);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const requestedPath = url.pathname === "/"
    ? "/index.html"
    : url.pathname === "/favicon.ico"
      ? "/favicon.svg"
      : url.pathname;
  sendStaticFile(res, FRONTEND_DIR, requestedPath);
});

server.listen(PORT, () => {
  console.log(`Banking portal running at http://localhost:${PORT}`);
  console.log("Demo login: daniel.nowak@outlook.com / Nowak@4142");
  console.log("Or account number: 80420742 with the same password");
});
