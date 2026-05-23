const {
  approveAccountAsAdmin,
  getAdminSummary,
  getPersistenceStatus,
  rejectAccountAsAdmin,
  updateAccountStatus
} = require("../controllers/adminController");
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

  if (req.method === "POST") {
    const approveMatch = url.pathname.match(/^\/api\/admin\/approve-account\/(.+)\/?$/);
    if (approveMatch) {
      req.adminApprovalEmail = decodeURIComponent(approveMatch[1]);
      await approveAccountAsAdmin(req, res);
      return;
    }

    const rejectMatch = url.pathname.match(/^\/api\/admin\/reject-account\/(.+)\/?$/);
    if (rejectMatch) {
      req.adminApprovalEmail = decodeURIComponent(rejectMatch[1]);
      await rejectAccountAsAdmin(req, res);
      return;
    }
  }

  if (req.method === "PATCH") {
    const statusMatch = url.pathname.match(/^\/api\/admin\/account-status\/(.+)\/?$/);
    if (statusMatch) {
      req.adminApprovalEmail = decodeURIComponent(statusMatch[1]);
      await updateAccountStatus(req, res);
      return;
    }
  }

  sendJson(res, 404, { error: "Admin route not found" });
}

module.exports = { handleAdminRoute };
