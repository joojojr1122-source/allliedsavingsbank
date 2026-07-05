const {
  approveAccountAsAdmin,
  getAdminSummary,
  getEmailOutbox,
  getPersistenceStatus,
  getUserTransactionDebug,
  rejectAccountAsAdmin,
  sendApprovalEmailAsAdmin,
  sendCustomEmailAsAdmin,
  updateAccountStatus,
  approveTransactionAsAdmin,
  denyTransactionAsAdmin
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

  if (req.method === "GET" && url.pathname === "/api/admin/email-outbox") {
    await getEmailOutbox(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/admin/user-transactions/")) {
    const email = decodeURIComponent(url.pathname.replace("/api/admin/user-transactions/", ""));
    req.adminApprovalEmail = email;
    await getUserTransactionDebug(req, res);
    return;
  }

  if (req.method === "POST") {
    const approveMatch = url.pathname.match(/^\/api\/admin\/approve-account\/(.+)\/?$/);
    if (approveMatch) {
      req.adminApprovalEmail = decodeURIComponent(approveMatch[1]);
      await approveAccountAsAdmin(req, res);
      return;
    }

    const approvalEmailMatch = url.pathname.match(/^\/api\/admin\/send-approval-email\/(.+)\/?$/);
    if (approvalEmailMatch) {
      req.adminApprovalEmail = decodeURIComponent(approvalEmailMatch[1]);
      await sendApprovalEmailAsAdmin(req, res);
      return;
    }

    const sendEmailMatch = url.pathname.match(/^\/api\/admin\/send-email\/?$/);
    if (sendEmailMatch) {
      await sendCustomEmailAsAdmin(req, res);
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

    const txMatch = url.pathname.match(/^\/api\/admin\/transaction\/([^/]+)\/([^/]+)\/(approve|deny)\/?$/);
    if (txMatch) {
      req.adminTransactionUserEmail = decodeURIComponent(txMatch[1]);
      req.adminTransactionId = decodeURIComponent(txMatch[2]);
      if (txMatch[3] === "approve") {
        await approveTransactionAsAdmin(req, res);
      } else {
        await denyTransactionAsAdmin(req, res);
      }
      return;
    }
  }

  sendJson(res, 404, { error: "Admin route not found" });
}

module.exports = { handleAdminRoute };
