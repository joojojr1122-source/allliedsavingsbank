const crypto = require("crypto");
const { readDatabase, writeDatabase } = require("./databaseService");
const { hashPassword, verifyPassword } = require("../utils/security");
const {
  buildApprovalEmail,
  buildLoginVerificationEmail,
  buildPendingTransactionEmail,
  getLatestApprovalEmail,
  queueApprovalEmail,
  queueLoginVerificationEmail,
  queueTransactionNotification
} = require("./emailService");

async function createUser(input) {
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const phone = cleanName(input.phone);
  const address = cleanName(input.address);
  const dateOfBirth = String(input.dateOfBirth || "").trim();
  const employmentStatus = cleanName(input.employmentStatus);
  const product = cleanName(input.product) || "Current Account";
  const agreeTerms = input.agreeTerms === "on" || input.agreeTerms === true;

  if (!firstName || !lastName || !email || !phone || !address || !dateOfBirth || !employmentStatus || !password) {
    throw statusError(400, "All account opening fields are required");
  }

  if (!email.includes("@") || !email.includes(".")) {
    throw statusError(400, "Enter a valid email address");
  }

  validatePassword(password);

  if (!agreeTerms) {
    throw statusError(400, "You must agree to the account terms");
  }

  const database = await readDatabase();
  const existingUser = database.users.find((user) => user.email === email);

  if (existingUser) {
    throw statusError(409, "An account already exists for this email");
  }

  const accountNumber = createAccountNumber(database.users.length);
  const user = {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    email,
    password: hashPassword(password),
    application: {
      product,
      phone,
      address,
      dateOfBirth,
      employmentStatus,
      status: "Pending Approval",
      decisionReason: "",
      submittedAt: new Date().toISOString()
    },
    account: {
      type: product,
      number: accountNumber,
      routingNumber: "026009593",
      currency: "USD",
      balance: 0,
      openedAt: "",
      status: "Pending Approval",
      dailyTransferLimit: 1000,
      monthlyTransferLimit: 100000,
      cardStatus: "Active",
      overdraft: 0
    },
    beneficiaries: [],
    transactions: [],
    auditLog: [
      {
        id: crypto.randomUUID(),
        action: "APPLICATION_SUBMITTED",
        createdAt: new Date().toISOString()
      }
    ],
    security: {
      lastLoginAt: "",
      failedLoginAttempts: 0,
      lockedUntil: ""
    },
    passwordReset: {
      token: "",
      expiresAt: "",
      requestedAt: ""
    },
    notificationState: {
      readIds: [],
      readAtById: {}
    },
    preferences: {
      emailAlerts: true,
      smsAlerts: false,
      statementFrequency: "Monthly"
    },
    createdAt: new Date().toISOString()
  };

  database.users.push(user);
  await writeDatabase(database);

  return user;
}

async function findUserByEmail(email) {
  const database = await readDatabase();
  const value = String(email || "").trim().toLowerCase();
  const user = database.users.find((item) => item.email === value);
  return ensureAccountShape(user);
}

async function findUserByLoginIdentifier(identifier) {
  const value = String(identifier || "").trim().toLowerCase();
  const accountNumber = value.replace(/\D/g, "");
  const database = await readDatabase();
  const user = database.users.find((item) => (
    item.email === value ||
    String(item.account?.number || "") === accountNumber
  ));
  return ensureAccountShape(user);
}

async function approvePendingAccount(email) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === String(email || "").trim().toLowerCase());

  if (!user) {
    throw statusError(404, "Application was not found");
  }

  ensureAccountShape(user);

  if (user.account.status === "Active") {
    return user;
  }

  const openedAt = new Date().toISOString();
  user.application.status = "Approved";
  user.application.decisionReason = "";
  user.application.decidedAt = openedAt;
  user.account.status = "Active";
  user.account.openedAt = openedAt;
  user.transactions = user.transactions || [];
  user.transactions.unshift({
    id: crypto.randomUUID(),
    type: "Account Opening",
    description: "Account opened after application approval",
    amount: 0,
    balanceAfter: 0,
    createdAt: openedAt,
    status: "Completed",
    reference: "OPENING"
  });
  appendAudit(user, "ACCOUNT_APPROVED");

  await writeDatabase(database);
  return user;
}

async function rejectPendingAccount(email, reason) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === String(email || "").trim().toLowerCase());

  if (!user) {
    throw statusError(404, "Application was not found");
  }

  ensureAccountShape(user);

  if (user.account.status === "Active") {
    throw statusError(400, "Active accounts cannot be rejected");
  }

  user.application.status = "Rejected";
  user.application.decisionReason = cleanName(reason) || "Application did not pass review checks.";
  user.application.decidedAt = new Date().toISOString();
  user.account.status = "Rejected";
  appendAudit(user, "APPLICATION_REJECTED", user.application.decisionReason);

  await writeDatabase(database);
  return user;
}

async function updateAccountStatusAsAdmin(email, status, note = "") {
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === String(email || "").trim().toLowerCase());

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  if (!["Active", "Frozen"].includes(status)) {
    throw statusError(400, "Choose Active or Frozen");
  }

  if (user.account.status === "Rejected" || user.account.status === "Pending Approval") {
    throw statusError(400, "Only approved accounts can be frozen or reactivated");
  }

  user.account.status = status;
  user.application.status = status === "Active" ? "Approved" : "Frozen";
  appendAudit(user, status === "Frozen" ? "ACCOUNT_FROZEN" : "ACCOUNT_REACTIVATED", cleanName(note));

  await writeDatabase(database);
  return user;
}

async function getUserById(id) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === id);

  if (!user) return null;

  ensureAccountShape(user);

  const settledScheduled = settleDueScheduledTransfers(user);
  const settledApproved = settleDueApprovedTransactions(user);

  if (settledScheduled || settledApproved) {
    await writeDatabase(database);
  }

  return user;
}

async function recordSuccessfulLogin(userId) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) return null;

  user.security = user.security || {};
  user.security.lastLoginAt = new Date().toISOString();
  user.security.failedLoginAttempts = 0;
  user.security.lockedUntil = "";
  appendAudit(user, "LOGIN_SUCCESS");

  await writeDatabase(database);
  return user;
}

async function recordFailedLogin(email) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === email);

  if (!user) return null;

  user.security = user.security || {};
  user.security.failedLoginAttempts = Number(user.security.failedLoginAttempts || 0) + 1;

  if (user.security.failedLoginAttempts >= 5) {
    user.security.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    appendAudit(user, "ACCOUNT_TEMPORARILY_LOCKED");
  } else {
    appendAudit(user, "LOGIN_FAILED");
  }

  await writeDatabase(database);
  return user;
}

function isUserLocked(user) {
  const lockedUntil = user?.security?.lockedUntil;
  return lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false;
}

function publicUser(user) {
  ensureAccountShape(user);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    application: {
      product: user.application?.product || user.account?.type || "Current Account",
      phone: user.application?.phone || "",
      address: user.application?.address || "",
      dateOfBirth: user.application?.dateOfBirth || "",
      employmentStatus: user.application?.employmentStatus || "",
      status: user.application?.status || "Pending Approval",
      decisionReason: user.application?.decisionReason || "",
      decidedAt: user.application?.decidedAt || "",
      submittedAt: user.application?.submittedAt || user.createdAt || ""
    },
    account: user.account,
    security: {
      lastLoginAt: user.security?.lastLoginAt || "",
      failedLoginAttempts: Number(user.security?.failedLoginAttempts || 0),
      lockedUntil: user.security?.lockedUntil || ""
    },
    preferences: {
      emailAlerts: user.preferences?.emailAlerts !== false,
      smsAlerts: Boolean(user.preferences?.smsAlerts),
      statementFrequency: user.preferences?.statementFrequency || "Monthly"
    },
    notifications: buildNotifications(user),
    beneficiaries: user.beneficiaries || [],
    transactions: user.transactions || [],
    auditLog: (user.auditLog || []).slice(0, 20),
    passwordReset: {
      token: "",
      expiresAt: "",
      requestedAt: ""
    }
  };
}

async function createTransaction(userId, input) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  if (user.account.status !== "Active") {
    throw statusError(403, "This account is not active");
  }

  const type = cleanName(input.type);
  const description = cleanName(input.description) || type;
  const amount = Number(input.amount);
  const beneficiaryId = cleanName(input.beneficiaryId);
  const scheduledFor = String(input.scheduledFor || "").trim();
  const category = cleanName(input.category) || (type === "Transfer" ? "Transfer" : type);
  const tags = cleanTags(input.tags);
  const repeatFrequency = normalizeRepeatFrequency(input.repeatFrequency);

  if (!["Deposit", "Withdrawal", "Transfer"].includes(type)) {
    throw statusError(400, "Choose a valid transaction type");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw statusError(400, "Enter an amount greater than 0");
  }

  let beneficiary = null;

  if (type === "Transfer") {
    beneficiary = getTransferBeneficiary(user, input, beneficiaryId);

    const transferLimit = Number(user.account.dailyTransferLimit || 1000);
    const monthlyTransferLimit = Number(user.account.monthlyTransferLimit || 100000);
    const usedToday = getTodaysTransferTotal(user.transactions || []);
    const usedThisMonth = getThisMonthsTransferTotal(user.transactions || []);

    if (usedToday + amount > transferLimit) {
      throw statusError(400, `Daily transfers are limited to ${formatLimit(transferLimit)}. You have ${formatLimit(Math.max(transferLimit - usedToday, 0))} remaining today`);
    }

    if (usedThisMonth + amount > monthlyTransferLimit) {
      throw statusError(400, `Monthly transfers are limited to ${formatLimit(monthlyTransferLimit)}. You have ${formatLimit(Math.max(monthlyTransferLimit - usedThisMonth, 0))} remaining this month`);
    }
  }

  const signedAmount = type === "Deposit" ? amount : -amount;
  const nextBalance = Number((user.account.balance + signedAmount).toFixed(2));

  if (nextBalance < 0) {
    throw statusError(400, "Insufficient available balance");
  }

  user.transactions = user.transactions || [];
  user.transactions.unshift({
    id: crypto.randomUUID(),
    userId: user.id,
    type,
    description,
    category,
    tags,
    amount: Number(signedAmount.toFixed(2)),
    balanceAfter: user.account.balance,
    createdAt: new Date().toISOString(),
    scheduledFor: type === "Transfer" ? scheduledFor : "",
    status: "Pending",
    reference: createReference(type, user.account.number),
    beneficiary,
    repeatFrequency: type === "Transfer" ? repeatFrequency : "Once",
    processedAt: "",
    lastEditedAt: ""
  });
  appendAudit(user, type === "Transfer" ? "TRANSFER_CREATED" : `${type.toUpperCase()}_CREATED`);

  const pendingTransaction = user.transactions[0];
  if (pendingTransaction && pendingTransaction.status === "Pending") {
    queueTransactionNotification(pendingTransaction, user).catch((error) => {
      console.error("Failed to queue transaction notification:", error);
    });
  }

  await writeDatabase(database);
  return user;
}

async function approveTransaction(userId, transactionId) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  const txIndex = user.transactions.findIndex((t) => t.id === transactionId);

  if (txIndex === -1) {
    throw statusError(404, "Transaction not found");
  }

  const tx = user.transactions[txIndex];

  if (tx.status !== "Pending") {
    throw statusError(400, "Only pending transactions can be approved");
  }

  const amount = Number(tx.amount || 0);
  const nextBalance = Number((user.account.balance + amount).toFixed(2));

  if (nextBalance < 0) {
    throw statusError(400, "Insufficient available balance");
  }

  tx.status = "Approved";
  tx.processedAt = new Date().toISOString();
  tx.completedAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  tx.balanceAfter = nextBalance;
  user.account.balance = nextBalance;

  appendAudit(user, "TRANSACTION_APPROVED", tx.reference || tx.id);
  await writeDatabase(database);
  return user;
}

async function denyTransaction(userId, transactionId) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  const txIndex = user.transactions.findIndex((t) => t.id === transactionId);

  if (txIndex === -1) {
    throw statusError(404, "Transaction not found");
  }

  const tx = user.transactions[txIndex];

  if (tx.status !== "Pending") {
    throw statusError(400, "Only pending transactions can be denied");
  }

  tx.status = "Denied";
  tx.processedAt = new Date().toISOString();
  tx.balanceAfter = user.account.balance;

  appendAudit(user, "TRANSACTION_DENIED", tx.reference || tx.id);
  await writeDatabase(database);
  return user;
}

async function updateScheduledTransaction(userId, transactionId, input) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  const transaction = (user.transactions || []).find((item) => item.id === transactionId);

  if (!transaction) {
    throw statusError(404, "Transaction not found");
  }

  if (transaction.type !== "Transfer" || transaction.status !== "Pending") {
    throw statusError(400, "Only pending scheduled transfers can be edited");
  }

  const amount = Number(input.amount ?? Math.abs(Number(transaction.amount || 0)));
  const description = cleanName(input.description || transaction.description);
  const scheduledFor = String(input.scheduledFor || transaction.scheduledFor || "").trim();
  const beneficiaryId = cleanName(input.beneficiaryId || transaction.beneficiary?.id || "");
  const category = cleanName(input.category || transaction.category || "Transfer");
  const tags = cleanTags(input.tags || transaction.tags || []);
  const repeatFrequency = normalizeRepeatFrequency(input.repeatFrequency || transaction.repeatFrequency || "Once");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw statusError(400, "Enter an amount greater than 0");
  }

  const beneficiary = getTransferBeneficiary(user, {
    recipientName: input.recipientName || transaction.beneficiary?.name || "",
    recipientAccountNumber: input.recipientAccountNumber || transaction.beneficiary?.accountNumber || "",
    recipientRoutingNumber: input.recipientRoutingNumber || transaction.beneficiary?.routingNumber || ""
  }, beneficiaryId);

  transaction.amount = Number((-amount).toFixed(2));
  transaction.description = description || transaction.description;
  transaction.category = category;
  transaction.tags = tags;
  transaction.scheduledFor = scheduledFor;
  transaction.repeatFrequency = repeatFrequency;
  transaction.beneficiary = beneficiary;
  transaction.lastEditedAt = new Date().toISOString();

  appendAudit(user, "SCHEDULED_TRANSFER_UPDATED", transaction.reference || "");

  await writeDatabase(database);
  return user;
}

function getTransferBeneficiary(user, input, beneficiaryId) {
  const saved = beneficiaryId
    ? (user.beneficiaries || []).find((item) => item.id === beneficiaryId)
    : null;

  const beneficiary = saved || {
    name: cleanName(input.recipientName),
    accountNumber: cleanName(input.recipientAccountNumber),
    routingNumber: cleanName(input.recipientRoutingNumber)
  };

  if (!beneficiary.name || !/^\d{8,12}$/.test(beneficiary.accountNumber || "") || !/^\d{9}$/.test(beneficiary.routingNumber || "")) {
    throw statusError(400, "Enter a recipient name, 8-12 digit account number, and 9 digit routing number");
  }

  return {
    id: saved ? saved.id : null,
    name: beneficiary.name,
    accountNumber: beneficiary.accountNumber,
    routingNumber: beneficiary.routingNumber
  };
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cleanTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => cleanName(tag)).filter(Boolean))].slice(0, 5);
  }

  return String(value || "")
    .split(",")
    .map((tag) => cleanName(tag))
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeRepeatFrequency(value) {
  const frequency = cleanName(value || "Once");
  return ["Once", "Weekly", "Monthly"].includes(frequency) ? frequency : "Once";
}

function createAccountNumber(offset) {
  return String(80420000 + offset + Math.floor(Math.random() * 899)).padStart(8, "0");
}

function createReference(type, accountNumber = "") {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  const suffix = String(accountNumber || "").slice(-6) || now.toISOString().slice(11, 17).replace(/:/g, "");

  if (type === "Transfer") {
    return `FP${day}${month}${suffix}`;
  }

  if (type === "Deposit") {
    return `CR${day}${month}${suffix}`;
  }

  if (type === "Withdrawal") {
    return `DB${day}${month}${suffix}`;
  }

  return `${type.slice(0, 3).toUpperCase()}-${suffix}`;
}

function formatLimit(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function getTodaysTransferTotal(transactions) {
  const today = new Date().toISOString().slice(0, 10);

  return transactions
    .filter((transaction) => transaction.type === "Transfer")
    .filter((transaction) => !["Failed", "Cancelled"].includes(transaction.status))
    .filter((transaction) => String(transaction.createdAt || "").slice(0, 10) === today)
    .reduce((total, transaction) => total + Math.abs(Number(transaction.amount || 0)), 0);
}

function getThisMonthsTransferTotal(transactions) {
  const month = new Date().toISOString().slice(0, 7);

  return transactions
    .filter((transaction) => transaction.type === "Transfer")
    .filter((transaction) => !["Failed", "Cancelled"].includes(transaction.status))
    .filter((transaction) => String(transaction.createdAt || "").slice(0, 7) === month)
    .reduce((total, transaction) => total + Math.abs(Number(transaction.amount || 0)), 0);
}

function settleDueScheduledTransfers(user, now = new Date()) {
  ensureAccountShape(user);

  if (user.account.status !== "Active") {
    return false;
  }

  const today = now.toISOString().slice(0, 10);
  let changed = false;

  (user.transactions || [])
    .filter((transaction) => (
      transaction.type === "Transfer" &&
      transaction.status === "Pending" &&
      transaction.scheduledFor &&
      transaction.scheduledFor <= today
    ))
    .forEach((transaction) => {
      const amount = Number(transaction.amount || 0);
      const nextBalance = Number((Number(user.account.balance || 0) + amount).toFixed(2));

      transaction.processedAt = now.toISOString();

      if (nextBalance < 0) {
        transaction.status = "Failed";
        transaction.balanceAfter = Number(user.account.balance || 0);
        appendAudit(user, "SCHEDULED_TRANSFER_FAILED", transaction.reference || "");
      } else {
        user.account.balance = nextBalance;
        transaction.status = "Completed";
        transaction.balanceAfter = nextBalance;
        appendAudit(user, "SCHEDULED_TRANSFER_COMPLETED", transaction.reference || "");

        if (shouldRepeatTransfer(transaction)) {
          user.transactions.unshift(buildRecurringTransfer(transaction, now));
        }
      }

      changed = true;
    });

  return changed;
}

function settleDueApprovedTransactions(user, now = new Date()) {
  ensureAccountShape(user);

  const today = now.toISOString();
  let changed = false;

  (user.transactions || [])
    .filter((transaction) => (
      transaction.status === "Approved" &&
      transaction.completedAt &&
      transaction.completedAt <= today
    ))
    .forEach((transaction) => {
      const amount = Number(transaction.amount || 0);
      user.account.balance = Number((user.account.balance - amount).toFixed(2));
      transaction.status = "Reversed";
      transaction.balanceAfter = user.account.balance;
      appendAudit(user, "TRANSACTION_REVERSED", transaction.reference || transaction.id);
      changed = true;
    });

  return changed;
}

function buildRecurringTransfer(transaction, now) {
  return {
    id: crypto.randomUUID(),
    type: "Transfer",
    description: transaction.description,
    category: transaction.category || "Transfer",
    tags: transaction.tags || [],
    amount: Number(transaction.amount || 0),
    balanceAfter: Number(transaction.balanceAfter || 0),
    createdAt: now.toISOString(),
    scheduledFor: getNextScheduledDate(transaction.scheduledFor, transaction.repeatFrequency),
    status: "Pending",
    reference: createReference("Transfer", user.account.number),
    beneficiary: transaction.beneficiary || null,
    repeatFrequency: transaction.repeatFrequency || "Once",
    processedAt: "",
    lastEditedAt: ""
  };
}

function shouldRepeatTransfer(transaction) {
  return ["Weekly", "Monthly"].includes(transaction.repeatFrequency);
}

function getNextScheduledDate(dateValue, repeatFrequency) {
  const baseDate = dateValue ? new Date(`${dateValue}T00:00:00.000Z`) : new Date();
  if (repeatFrequency === "Weekly") {
    baseDate.setDate(baseDate.getDate() + 7);
  } else if (repeatFrequency === "Monthly") {
    baseDate.setMonth(baseDate.getMonth() + 1);
  }
  return baseDate.toISOString().slice(0, 10);
}

function appendAudit(user, action, note = "") {
  user.auditLog = user.auditLog || [];
  user.auditLog.unshift({
    id: crypto.randomUUID(),
    action,
    note,
    createdAt: new Date().toISOString()
  });
  user.auditLog = user.auditLog.slice(0, 100);
}

function ensureAccountShape(user) {
  if (!user) {
    return user;
  }

  user.account.status = user.account.status || "Pending Approval";
  user.account.currency = user.account.currency || "USD";
  user.account.dailyTransferLimit = user.account.dailyTransferLimit || 1000;
  user.account.monthlyTransferLimit = user.account.monthlyTransferLimit || 100000;
  user.account.cardStatus = user.account.cardStatus || "Active";
  user.account.overdraft = Number(user.account.overdraft || 0);
  user.beneficiaries = user.beneficiaries || [];
  user.auditLog = user.auditLog || [];
  user.application = user.application || {};
  user.application.status = user.application.status || (user.account.status === "Active" ? "Approved" : user.account.status);
  user.application.decisionReason = user.application.decisionReason || "";
  user.security = user.security || {
    lastLoginAt: "",
    failedLoginAttempts: 0,
    lockedUntil: ""
  };
  user.passwordReset = user.passwordReset || {
    token: "",
    expiresAt: "",
    requestedAt: ""
  };
  user.notificationState = user.notificationState || {
    readIds: [],
    readAtById: {}
  };
  user.preferences = user.preferences || {
    emailAlerts: true,
    smsAlerts: false,
    statementFrequency: "Monthly"
  };
  user.transactions = user.transactions || (user.account.status === "Active" ? [
    {
      id: crypto.randomUUID(),
      type: "Account Opening",
      description: "Account opened through online application",
      amount: 0,
      balanceAfter: user.account.balance || 0,
      createdAt: user.account.openedAt || user.createdAt || new Date().toISOString(),
      status: "Completed",
      reference: "OPENING"
    }
  ] : []);

  return user;
}

async function updateUserProfile(userId, input) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  const firstName = String(input.firstName || "").trim();
  const lastName = String(input.lastName || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").trim();
  const address = String(input.address || "").trim();
  const product = String(input.product || "").trim() || user.account.type;
  const statementFrequency = cleanName(input.statementFrequency || user.preferences?.statementFrequency || "Monthly");

  if (!firstName || !lastName || !email || !phone || !address) {
    throw statusError(400, "First name, last name, email, phone, and address are required");
  }

  if (!email.includes("@") || !email.includes(".")) {
    throw statusError(400, "Enter a valid email address");
  }

  const emailOwner = database.users.find((item) => item.email === email && item.id !== userId);

  if (emailOwner) {
    throw statusError(409, "Another account already uses this email");
  }

  user.firstName = cleanName(firstName);
  user.lastName = cleanName(lastName);
  user.email = email;
  user.application.product = cleanName(product);
  user.account.type = cleanName(product);
  user.application.phone = cleanName(phone);
  user.application.address = cleanName(address);
  user.preferences = user.preferences || {};
  user.preferences.emailAlerts = input.emailAlerts === "on" || input.emailAlerts === true;
  user.preferences.smsAlerts = input.smsAlerts === "on" || input.smsAlerts === true;
  user.preferences.statementFrequency = ["Monthly", "Quarterly", "Annually"].includes(statementFrequency)
    ? statementFrequency
    : "Monthly";
  appendAudit(user, "PROFILE_UPDATED");

  await writeDatabase(database);
  return user;
}

async function requestPasswordReset(email) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === String(email || "").trim().toLowerCase());

  if (!user) {
    return null;
  }

  ensureAccountShape(user);
  const token = crypto.randomBytes(24).toString("hex");
  user.passwordReset = {
    token,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    requestedAt: new Date().toISOString()
  };
  appendAudit(user, "PASSWORD_RESET_REQUESTED");
  await writeDatabase(database);
  return token;
}

async function resetPassword(email, token, newPassword) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.email === String(email || "").trim().toLowerCase());

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  if (!user.passwordReset?.token || user.passwordReset.token !== token) {
    throw statusError(400, "Password reset link is invalid");
  }

  if (!user.passwordReset.expiresAt || new Date(user.passwordReset.expiresAt).getTime() < Date.now()) {
    throw statusError(400, "Password reset link has expired");
  }

  validatePassword(String(newPassword || ""), "New password");
  user.password = hashPassword(String(newPassword || ""));
  user.passwordReset = {
    token: "",
    expiresAt: "",
    requestedAt: ""
  };
  appendAudit(user, "PASSWORD_RESET_COMPLETED");
  await writeDatabase(database);
  return user;
}

async function markNotificationsRead(userId, notificationIds) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);
  const ids = Array.isArray(notificationIds) ? notificationIds : [];
  user.notificationState.readIds = [...new Set([...(user.notificationState.readIds || []), ...ids])];
  user.notificationState.readAtById = user.notificationState.readAtById || {};
  ids.forEach((id) => {
    user.notificationState.readAtById[id] = new Date().toISOString();
  });
  appendAudit(user, "NOTIFICATIONS_MARKED_READ");
  await writeDatabase(database);
  return user;
}

function buildNotifications(user) {
  const notifications = [];
  const readIds = new Set(user.notificationState?.readIds || []);

  if (user.application?.status === "Pending Approval") {
    notifications.push({
      id: `application-pending-${user.id}`,
      type: "Application",
      title: "Application awaiting review",
      message: "Your application is with the back office team. Online banking unlocks after approval.",
      createdAt: user.application.submittedAt || user.createdAt || new Date().toISOString()
    });
  }

  if (user.application?.status === "Approved") {
    notifications.push({
      id: `application-approved-${user.id}`,
      type: "Application",
      title: "Application approved",
      message: "Your account is active and ready for payments, payees, statements, and account controls.",
      createdAt: user.application.decidedAt || user.account.openedAt || user.createdAt || new Date().toISOString()
    });
  }

  if (user.application?.status === "Rejected") {
    notifications.push({
      id: `application-rejected-${user.id}`,
      type: "Application",
      title: "Application decision available",
      message: user.application.decisionReason || "Your application could not be approved. Please contact support.",
      createdAt: user.application.decidedAt || user.createdAt || new Date().toISOString()
    });
  }

  if (user.account?.status === "Frozen") {
    notifications.push({
      id: `account-frozen-${user.id}`,
      type: "Security",
      title: "Account temporarily frozen",
      message: "Payments are paused while back office review is in progress.",
      createdAt: new Date().toISOString()
    });
  }

  const pendingPayments = (user.transactions || []).filter((transaction) => transaction.status === "Pending").length;
  if (pendingPayments) {
    notifications.push({
      id: `pending-payments-${user.id}-${pendingPayments}`,
      type: "Payments",
      title: `${pendingPayments} scheduled payment${pendingPayments === 1 ? "" : "s"}`,
      message: "Scheduled payments can be cancelled from Recent Activity before processing.",
      createdAt: new Date().toISOString()
    });
  }

  if (user.security?.lastLoginAt) {
    notifications.push({
      id: `recent-login-${user.security.lastLoginAt}`,
      type: "Security",
      title: "Recent login recorded",
      message: `Last successful login: ${new Date(user.security.lastLoginAt).toLocaleString("en-GB")}.`,
      createdAt: user.security.lastLoginAt
    });
  }

  return notifications.slice(0, 6).map((notification) => ({
    ...notification,
    readAt: readIds.has(notification.id) ? user.notificationState?.readAtById?.[notification.id] || notification.createdAt : "",
    isRead: readIds.has(notification.id)
  }));
}

async function createBeneficiary(userId, input) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  const name = cleanName(input.name);
  const accountNumber = cleanName(input.accountNumber);
  const routingNumber = cleanName(input.routingNumber);
  const nickname = cleanName(input.nickname) || name;

  if (!name || !/^\d{8,12}$/.test(accountNumber) || !/^\d{9}$/.test(routingNumber)) {
    throw statusError(400, "Enter a payee name, 8-12 digit account number, and 9 digit routing number");
  }

  const duplicate = user.beneficiaries.find((item) => item.accountNumber === accountNumber && item.routingNumber === routingNumber);

  if (duplicate) {
    throw statusError(409, "This payee already exists");
  }

  user.beneficiaries.unshift({
    id: crypto.randomUUID(),
    name,
    nickname,
    accountNumber,
    routingNumber,
    createdAt: new Date().toISOString()
  });
  appendAudit(user, "PAYEE_CREATED");

  await writeDatabase(database);
  return user;
}

async function deleteBeneficiary(userId, beneficiaryId) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  const index = user.beneficiaries.findIndex((item) => item.id === beneficiaryId);

  if (index === -1) {
    throw statusError(404, "Payee not found");
  }

  user.beneficiaries.splice(index, 1);
  appendAudit(user, "PAYEE_DELETED");

  await writeDatabase(database);
  return user;
}

async function updateAccountControls(userId, input) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  ensureAccountShape(user);

  const cardStatus = cleanName(input.cardStatus || user.account.cardStatus);
  const dailyTransferLimit = Number(input.dailyTransferLimit || user.account.dailyTransferLimit);
  const monthlyTransferLimit = Number(input.monthlyTransferLimit || user.account.monthlyTransferLimit);

  if (!["Active", "Frozen"].includes(cardStatus)) {
    throw statusError(400, "Choose a valid card status");
  }

  if (!Number.isFinite(dailyTransferLimit) || dailyTransferLimit < 50 || dailyTransferLimit > 5000) {
    throw statusError(400, "Daily transfer limit must be between USD 50 and USD 5,000");
  }

  if (!Number.isFinite(monthlyTransferLimit) || monthlyTransferLimit < dailyTransferLimit || monthlyTransferLimit > 100000) {
    throw statusError(400, "Monthly transfer limit must be between the daily limit and USD 100,000");
  }

  user.account.cardStatus = cardStatus;
  user.account.dailyTransferLimit = Number(dailyTransferLimit.toFixed(2));
  user.account.monthlyTransferLimit = Number(monthlyTransferLimit.toFixed(2));
  appendAudit(user, "ACCOUNT_CONTROLS_UPDATED");

  await writeDatabase(database);
  return user;
}

async function changePassword(userId, currentPassword, newPassword) {
  const database = await readDatabase();
  const user = database.users.find((item) => item.id === userId);

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  if (!verifyPassword(currentPassword, user.password)) {
    throw statusError(401, "Current password is incorrect");
  }

  validatePassword(newPassword, "New password");

  user.password = hashPassword(newPassword);
  appendAudit(user, "PASSWORD_CHANGED");
  await writeDatabase(database);
}

function validatePassword(password, label = "Password") {
  if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw statusError(400, `${label} must be at least 10 characters and include uppercase, lowercase, and a number`);
  }
}

function statusError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  approvePendingAccount,
  rejectPendingAccount,
  updateAccountStatusAsAdmin,
  createUser,
  createTransaction,
  approveTransaction,
  denyTransaction,
  updateScheduledTransaction,
  settleDueScheduledTransfers,
  createBeneficiary,
  deleteBeneficiary,
  findUserByEmail,
  findUserByLoginIdentifier,
  getUserById,
  isUserLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  updateUserProfile,
  requestPasswordReset,
  resetPassword,
  markNotificationsRead,
  updateAccountControls,
  changePassword,
  publicUser
};
