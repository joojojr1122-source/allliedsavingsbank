const { getDatabaseInfo, readDatabase, writeDatabase } = require("../services/databaseService");
const {
  getLatestApprovalEmail,
  queueApprovalEmail,
  queueCustomEmail
} = require("../services/emailService");
const {
  approvePendingAccount,
  publicUser,
  rejectPendingAccount,
  updateAccountStatusAsAdmin,
  approveTransaction,
  denyTransaction,
  createTransaction,
  updateAccountControls,
  findUserByEmail,
  getUserById,
  deleteUser,
  updateAccountBalanceFrozen,
  unfreezeAccount
} = require("../services/userService");
const { readJsonBody, sendJson } = require("../utils/http");
const fs = require("fs/promises");
const path = require("path");

function isAdminRequest(req) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers["x-admin-password"] || "";
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");

  if (!configuredPassword) {
    if (isProduction) {
      return false;
    }
    return providedPassword === "Admin4142";
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

async function sendCustomEmailAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { to, subject, text, html, from } = body || {};

    if (!to || !subject || !text) {
      sendJson(res, 400, { error: "Missing required fields: to, subject, and text are required" });
      return;
    }

    const message = await queueCustomEmail({ to, subject, text, html, from });
    sendJson(res, 200, { message });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Email send failed" });
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

    const result = await denyTransaction(user.id, transactionId);
    sendJson(res, 200, { user: publicUser(result.user), accountBlocked: result.accountBlocked });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Transaction denial failed" });
  }
}

async function createTransactionAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminTransactionUserEmail || "";
    const body = await readJsonBody(req);
    const user = await findUserByEmail(email);

    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    const updatedUser = await createTransaction(user.id, body);
    sendJson(res, 200, { user: publicUser(updatedUser) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Transaction creation failed" });
  }
}

async function updateAccountControlsAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminAccountControlsEmail || "";
    const body = await readJsonBody(req);
    const user = await findUserByEmail(email);

    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    const updatedUser = await updateAccountControls(user.id, body);
    sendJson(res, 200, { user: publicUser(updatedUser) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Account controls update failed" });
  }
}

async function deleteAccountAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminAccountEmail || "";
    const result = await deleteUser(email);
    sendJson(res, 200, { user: result });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Account deletion failed" });
  }
}

async function updateBalanceFrozen(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminAccountEmail || "";
    const body = await readJsonBody(req);
    const balanceFrozen = body.balanceFrozen;
    const user = await updateAccountBalanceFrozen(email, balanceFrozen);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Balance freeze update failed" });
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

  const userByTransactionId = new Map();
  users.forEach((user) => {
    (user.transactions || []).forEach((tx) => {
      if (!userByTransactionId.has(tx.id)) {
        userByTransactionId.set(tx.id, user);
      }
    });
  });

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
      .map((tx) => {
        const owner = userByTransactionId.get(tx.id);
        return {
          id: tx.id,
          userId: owner?.id || tx.userId || "",
          userEmail: owner?.email || tx.userEmail || "",
          userName: owner ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() : "",
          type: tx.type,
          description: tx.description,
          amount: Number(tx.amount || 0),
          status: tx.status,
          reference: tx.reference || "",
          createdAt: tx.createdAt
        };
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 20)
  });
}

async function getPersistenceStatus(req, res) {
  const info = getDatabaseInfo();
  try {
    const database = await readDatabase();
    const users = database.users || [];
    const transactions = users.flatMap((user) => user.transactions || []);
    let writeOk = null;
    let writeError = "";
    if (info.persistent) {
      try {
        await writeDatabase(database);
        writeOk = true;
      } catch (error) {
        writeOk = false;
        writeError = error && error.message ? error.message : String(error);
      }
    }
    sendJson(res, 200, {
      database: info,
      writeOk,
      writeError,
      storage: {
        schemaVersion: database.schemaVersion,
        users: users.length,
        transactions: transactions.length
      }
    });
  } catch (error) {
    sendJson(res, 200, {
      database: info,
      writeOk: false,
      writeError: error && error.message ? error.message : String(error)
    });
  }
}

async function getEmailOutbox(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const database = await readDatabase();
    const outbox = (database.emailOutbox || []).slice(0, 20).map((entry) => ({
      id: entry.id,
      type: entry.type,
      status: entry.status,
      to: entry.to,
      subject: entry.subject,
      text: entry.text,
      provider: entry.provider,
      error: entry.error,
      createdAt: entry.createdAt,
      sentAt: entry.sentAt
    }));
    sendJson(res, 200, { outbox });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Failed to read email outbox" });
  }
}

async function getUserTransactionDebug(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = String(req.adminApprovalEmail || "").trim();
    const database = await readDatabase();
    const user = (database.users || []).find((item) => item.email === email);

    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    const transactions = (user.transactions || []).map((tx) => ({
      id: tx.id,
      type: tx.type,
      description: tx.description,
      amount: Number(tx.amount || 0),
      status: tx.status,
      reference: tx.reference || "",
      createdAt: tx.createdAt,
      processedAt: tx.processedAt || "",
      completedAt: tx.completedAt || "",
      balanceAfter: tx.balanceAfter,
      beneficiary: tx.beneficiary || null
    }));

    sendJson(res, 200, {
      email: user.email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      accountBalance: user.account.balance,
      accountStatus: user.account.status,
      transactions,
      storage: getDatabaseInfo()
    });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Failed to load user transactions" });
  }
}

async function replaceUserAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const email = req.adminAccountEmail || "";

    if (!email) {
      sendJson(res, 400, { error: "Email is required" });
      return;
    }

    if (!body.user) {
      sendJson(res, 400, { error: "User data is required" });
      return;
    }

    const database = await readDatabase();
    const userIndex = database.users.findIndex((item) => item.email === String(email || "").trim().toLowerCase());

    if (userIndex === -1) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }

    const newUser = body.user;
    newUser.updatedAt = new Date().toISOString();

    database.users[userIndex] = newUser;

    await writeDatabase(database);

    sendJson(res, 200, { user: newUser, message: "User replaced successfully" });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "User replacement failed" });
  }
}

async function migrateLocalDatabase(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const seedPath = path.join(__dirname, "..", "..", "data", "database.json");
    const seedContent = await fs.readFile(seedPath, "utf8");
    const seedDb = JSON.parse(seedContent);

    const database = await readDatabase();
    
    // Merge: keep all existing users except Sandra (replace her)
    const sandraEmail = "hasnemsandra@gmail.com";
    const seedSandra = seedDb.users.find(u => u.email === sandraEmail);
    
    if (!seedSandra) {
      sendJson(res, 404, { error: "Sandra not found in seed database" });
      return;
    }

    const existingIndex = database.users.findIndex(u => u.email === sandraEmail);
    
    if (existingIndex >= 0) {
      database.users[existingIndex] = seedSandra;
    } else {
      database.users.push(seedSandra);
    }

    database.schemaVersion = 5;
    database.updatedAt = new Date().toISOString();

    await writeDatabase(database);

    sendJson(res, 200, { 
      message: "Migration complete", 
      sandraTransactions: seedSandra.transactions?.length,
      sandraBalance: seedSandra.account?.balance,
      totalUsers: database.users.length
    });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Migration failed" });
  }
}

async function unfreezeAccountAsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Admin access denied" });
    return;
  }

  try {
    const email = req.adminAccountEmail || "";
    const result = await unfreezeAccount(email);
    sendJson(res, 200, { user: result });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Unfreeze failed" });
  }
}

module.exports = {
  approveAccountAsAdmin,
  sendApprovalEmailAsAdmin,
  rejectAccountAsAdmin,
  updateAccountStatus,
  approveTransactionAsAdmin,
  denyTransactionAsAdmin,
  createTransactionAsAdmin,
  updateAccountControlsAsAdmin,
  deleteAccountAsAdmin,
  updateBalanceFrozen,
  getAdminSummary,
  getPersistenceStatus,
  getEmailOutbox,
  getUserTransactionDebug,
  sendCustomEmailAsAdmin,
  replaceUserAsAdmin,
  migrateLocalDatabase,
  unfreezeAccountAsAdmin
};
