const crypto = require("crypto");
const { sendJson, readJsonBody } = require("../utils/http");
const { readDatabase, writeDatabase } = require("../services/databaseService");
const {
  createBeneficiary,
  createTransaction,
  deleteBeneficiary: removeBeneficiary,
  getUserById,
  publicUser,
  updateAccountControls: saveAccountControls,
  updateUserProfile
} = require("../services/userService");
const { getUserIdFromRequest } = require("../services/sessionService");

async function getCurrentAccount(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  const user = await getUserById(userId);

  if (!user) {
    sendJson(res, 401, { error: "Session is no longer valid" });
    return;
  }

  sendJson(res, 200, { user: publicUser(user) });
}

async function postTransaction(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const user = await createTransaction(userId, body);
    sendJson(res, 201, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Transaction failed" });
  }
}

async function listTransactions(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    sendJson(res, 401, { error: "Session is no longer valid" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const typeFilter = url.searchParams.get("type") || "";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

  let transactions = user.transactions || [];

  if (typeFilter) {
    transactions = transactions.filter((t) => t.type === typeFilter);
  }

  sendJson(res, 200, {
    transactions: transactions.slice(0, limit),
    currency: user.account.currency
  });
}

async function deleteTransaction(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  const transactionId = req.transactionId;

  if (!transactionId) {
    sendJson(res, 400, { error: "Transaction ID is required" });
    return;
  }

  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    sendJson(res, 401, { error: "Session is no longer valid" });
    return;
  }

  const txIndex = user.transactions.findIndex((t) => t.id === transactionId);

  if (txIndex === -1) {
    sendJson(res, 404, { error: "Transaction not found" });
    return;
  }

  const tx = user.transactions[txIndex];

  if (tx.type === "Account Opening") {
    sendJson(res, 400, { error: "Cannot remove the account-opening entry" });
    return;
  }

  user.account.balance = Number((user.account.balance - tx.amount).toFixed(2));
  user.transactions.splice(txIndex, 1);

  user.transactions.unshift({
    id: crypto.randomUUID(),
    type: "Reversal",
    description: `Reversed: ${tx.description}`,
    amount: -tx.amount,
    balanceAfter: user.account.balance,
    createdAt: new Date().toISOString(),
    status: "Completed"
  });

  await writeDatabase(database);
  sendJson(res, 200, { user: publicUser(user) });
}

async function updateProfile(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const user = await updateUserProfile(userId, body);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Profile update failed" });
  }
}

async function addBeneficiary(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const user = await createBeneficiary(userId, body);
    sendJson(res, 201, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Payee creation failed" });
  }
}

async function deleteBeneficiary(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  try {
    const user = await removeBeneficiary(userId, req.beneficiaryId);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Payee deletion failed" });
  }
}

async function updateAccountControls(req, res) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    sendJson(res, 401, { error: "You need to login first" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const user = await saveAccountControls(userId, body);
    sendJson(res, 200, { user: publicUser(user) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Account controls update failed" });
  }
}

module.exports = {
  addBeneficiary,
  deleteBeneficiary,
  getCurrentAccount,
  postTransaction,
  listTransactions,
  deleteTransaction,
  updateAccountControls,
  updateProfile
};
