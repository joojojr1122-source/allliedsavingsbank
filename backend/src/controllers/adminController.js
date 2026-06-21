const { getDatabaseInfo, readDatabase } = require("../services/databaseService");
const { getLatestApprovalEmail, queueApprovalEmail } = require("../services/emailService");
const {
  approvePendingAccount,
  publicUser,
  rejectPendingAccount,
  updateAccountStatusAsAdmin,
  approveTransaction,
  denyTransaction,
  findUserByEmail,
  getUserById
} = require("../services/userService");
const { readJsonBody, sendJson } = require("../utils/http");

function isAdminRequest(req) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers["x-admin-password"] || "";
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");

  if (!configuredPassword) {
    if (isProduction) {
      return false;
    }
    return providedPassword === "admin12345";
  }

  return providedPassword === configuredPassword;
}

async function approveAccountAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminApprovalEmail || "";
    const user = await approvePendingAccount(email);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Approval failed" });
  }
}

async function sendApprovalEmailAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminApprovalEmail || "";
    const message = await queueApprovalEmail(email);
    sendJson(res, 200, { message });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Approval email failed" });
  }
}

async function rejectAccountAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const email = req.adminApprovalEmail || "";
    const user = await rejectPendingAccount(email, body.reason);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Rejection failed" });
  }
}

async function updateAccountStatus(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const email = req.adminApprovalEmail || "";
    const user = await updateAccountStatusAsAdmin(email, body.status, body.note);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Status update failed" });
  }
}

async function approveTransactionAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminTransactionUserEmail || "";
    const transactionId = req.adminTransactionId || "";
    const user = await findUserByEmail(email);

    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    const updatedUser = await approveTransaction(user.id, transactionId);
    sendJson(res, 200, { user: publicUser(updatedUser) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Transaction approval failed" });
  }
}

async function denyTransactionAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminTransactionUserEmail || "";
    const transactionId = req.adminTransactionId || "";
    const user = await findUserByEmail(email);

    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    const updatedUser = await denyTransaction(user.id, transactionId);
    sendJson(res, 200, { user: publicUser(updatedUser) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Transaction denial failed" });
  }
}

async function getAdminSummary(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  const database = await readDatabase();
  const users = database.users || [];
  const transactions = users.flatMap((user) => user.transactions || []);

  sendJson(res, 200, {
    database: getDatabaseInfo(),
    totals: {
      users: users.length,
      accounts: users.length,
      pending: users.filter((user) => user.account?.status === "Pending Approval").length,
      active: users.filter((user) => user.account?.status === "Active").length,
      frozen: users.filter((user) => user.account?.status === "Frozen").length,
      rejected: users.filter((user) => user.account?.status === "Rejected").length,
      balance: users.reduce((total, user) => total + Number(user.account?.balance || 0), 0),
      transactions: transactions.length
    },
    users: users.map((user) => {
      const approvalEmail = getLatestApprovalEmail(user, database);
      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        product: user.account?.type || "Current Account",
        accountNumber: user.account?.number || "",
        balance: Number(user.account?.balance || 0),
        status: user.account?.status || "Active",
        applicationStatus: user.application?.status || "",
        decisionReason: user.application?.decisionReason || "",
        submittedAt: user.application?.submittedAt || user.createdAt || "",
        openedAt: user.account?.openedAt || user.createdAt || "",
        lastLoginAt: user.security?.lastLoginAt || "",
        approvalEmailStatus: approvalEmail?.status || "",
        approvalEmailAt: approvalEmail?.createdAt || "",
        auditLog: (user.auditLog || []).slice(0, 5)
      };
    }).sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt))),
    recentTransactions: transactions
      .map((transaction) => ({
        id: transaction.id,
        userId: transaction.userId || "",
        userEmail: users.find((u) => (u.transactions || []).some((t) => t.id === transaction.id))?.email || "",
        userName: users.find((u) => (u.transactions || []).some((t) => t.id === transaction.id))
          ? `${users.find((u) => (u.transactions || []).some((t) => t.id === transaction.id)).firstName || ""} ${users.find((u) => (u.transactions || []).some((t) => t.id === transaction.id)).lastName || ""}`.trim()
          : "",
        type: transaction.type,
        description: transaction.description,
        amount: Number(transaction.amount || 0),
        status: transaction.status,
        reference: transaction.reference || "",
        createdAt: transaction.createdAt
      }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 20)
  });
}

async function getPersistenceStatus(req, res) {
  sendJson(res, 200, { database: getDatabaseInfo() });
}

module.exports = {
  approveAccountAsAdmin,
  sendApprovalEmailAsAdmin,
  rejectAccountAsAdmin,
  updateAccountStatus,
  approveTransactionAsAdmin,
  denyTransactionAsAdmin,
  getAdminSummary,
  getPersistenceStatus
};
