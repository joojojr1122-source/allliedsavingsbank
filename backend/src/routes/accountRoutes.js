const {
  addBeneficiary,
  deleteBeneficiary,
  getCurrentAccount,
  postTransaction,
  listTransactions,
  deleteTransaction,
  updateAccountControls,
  updateProfile,
  approveTransaction,
  denyTransaction,
  updateScheduledPayment
} = require("../controllers/accountController");
const { sendJson } = require("../utils/http");

async function handleAccountRoute(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/account/me") {
    await getCurrentAccount(req, res);
    return;
  }

  if (req.method === "PATCH" && url.pathname === "/api/account/me") {
    await updateProfile(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/account/transactions") {
    await listTransactions(req, res);
    return;
  }

  if (req.method === "PATCH" && url.pathname === "/api/account/controls") {
    await updateAccountControls(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/account/beneficiaries") {
    await addBeneficiary(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/account/transactions") {
    await postTransaction(req, res);
    return;
  }

  if (req.method === "PATCH") {
    const approvalMatch = url.pathname.match(/^\/api\/account\/transaction\/([^/]+)\/(approve|deny)\/?$/);
    if (approvalMatch) {
      req.transactionId = approvalMatch[1];
      if (approvalMatch[2] === "approve") {
        await approveTransaction(req, res);
      } else {
        await denyTransaction(req, res);
      }
      return;
    }

    const editMatch = url.pathname.match(/^\/api\/account\/transaction\/([^/]+)\/?$/);
    if (editMatch) {
      req.transactionId = editMatch[1];
      await updateScheduledPayment(req, res);
      return;
    }
  }

  if (req.method === "DELETE") {
    const beneficiaryMatch = url.pathname.match(/^\/api\/account\/beneficiaries\/([^/]+)\/?$/);
    if (beneficiaryMatch) {
      req.beneficiaryId = beneficiaryMatch[1];
      await deleteBeneficiary(req, res);
      return;
    }

    const match = url.pathname.match(/^\/api\/account\/transaction\/([^/]+)\/?$/);
    if (match) {
      req.transactionId = match[1];
      await deleteTransaction(req, res);
      return;
    }
  }

  sendJson(res, 404, { error: "Account route not found" });
}

module.exports = { handleAccountRoute };
