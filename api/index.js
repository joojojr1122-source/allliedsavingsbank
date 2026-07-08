const { URL } = require("url");
const { loadLocalEnv } = require("../backend/src/utils/env");

loadLocalEnv();

const { handleAuthRoute } = require("../backend/src/routes/authRoutes");
const { handleAccountRoute } = require("../backend/src/routes/accountRoutes");
const { handleAdminRoute } = require("../backend/src/routes/adminRoutes");
const { getDatabaseInfo } = require("../backend/src/services/databaseService");
const { sendJson } = require("../backend/src/utils/http");

module.exports = async function handler(req, res) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url, `https://${host}`);

  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) {
    sendJson(res, 200, {
      ok: true,
      service: "allied-savings-account-portal",
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

  sendJson(res, 404, { error: "API route not found" });
};
