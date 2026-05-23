const { getAdminSummary, getPersistenceStatus } = require("../controllers/adminController");
const { sendJson } = require("../utils/http");

async function handleAdminRoute(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/admin/summary") {
    await getAdminSummary(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/persistence") {
    await getPersistenceStatus(req, res);
    return;
  }

  sendJson(res, 404, { error: "Admin route not found" });
}

module.exports = { handleAdminRoute };
