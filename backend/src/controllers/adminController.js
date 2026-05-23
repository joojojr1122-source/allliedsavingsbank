const { getDatabaseInfo, readDatabase } = require("../services/databaseService");
const { sendJson } = require("../utils/http");

function isAdminRequest(req) {
  const configuredPassword = process.env.ADMIN_PASSWORD || "admin12345";
  const providedPassword = req.headers["x-admin-password"] || "";
  return providedPassword === configuredPassword;
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
      balance: users.reduce((total, user) => total + Number(user.account?.balance || 0), 0),
      transactions: transactions.length
    },
    users: users.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      product: user.account?.type || "Current Account",
      accountNumber: user.account?.number || "",
      balance: Number(user.account?.balance || 0),
      status: user.account?.status || "Active",
      openedAt: user.account?.openedAt || user.createdAt || "",
      lastLoginAt: user.security?.lastLoginAt || ""
    })).sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt))),
    recentTransactions: transactions
      .map((transaction) => ({
        id: transaction.id,
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
  getAdminSummary,
  getPersistenceStatus
};
