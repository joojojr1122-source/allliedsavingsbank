const { URL } = require("url");
const { handleAuthRoute } = require("../backend/src/routes/authRoutes");
const { handleAccountRoute } = require("../backend/src/routes/accountRoutes");
const { handleAdminRoute } = require("../backend/src/routes/adminRoutes");
const { sendJson } = require("../backend/src/utils/http");

module.exports = async function handler(req, res) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url, `https://${host}`);

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
