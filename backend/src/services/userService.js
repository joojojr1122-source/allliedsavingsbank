const crypto = require("crypto");
const { readDatabase, writeDatabase } = require("./databaseService");
const { hashPassword, verifyPassword } = require("../utils/security");

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
      sortCode: "23-75-48",
      currency: "GBP",
      balance: 0,
      openedAt: "",
      status: "Pending Approval",
      iban: createIban(database.users.length, accountNumber),
      dailyTransferLimit: 1000,
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
  const user = database.users.find((item) => item.email === email);
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
  return ensureAccountShape(user);
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
    auditLog: (user.auditLog || []).slice(0, 20)
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
    const usedToday = getTodaysTransferTotal(user.transactions || []);

    if (usedToday + amount > transferLimit) {
      throw statusError(400, `Daily transfers are limited to ${formatLimit(transferLimit)}. You have ${formatLimit(Math.max(transferLimit - usedToday, 0))} remaining today`);
    }
  }

  const isScheduledTransfer = type === "Transfer" && scheduledFor && scheduledFor > new Date().toISOString().slice(0, 10);
  const signedAmount = type === "Deposit" ? amount : -amount;
  const nextBalance = Number((user.account.balance + signedAmount).toFixed(2));

  if (!isScheduledTransfer && nextBalance < 0) {
    throw statusError(400, "Insufficient available balance");
  }

  if (!isScheduledTransfer) {
    user.account.balance = nextBalance;
  }
  user.transactions = user.transactions || [];
  user.transactions.unshift({
    id: crypto.randomUUID(),
    type,
    description,
    amount: Number(signedAmount.toFixed(2)),
    balanceAfter: isScheduledTransfer ? user.account.balance : nextBalance,
    createdAt: new Date().toISOString(),
    scheduledFor: isScheduledTransfer ? scheduledFor : "",
    status: isScheduledTransfer ? "Pending" : "Completed",
    reference: createReference(type),
    beneficiary
  });
  appendAudit(user, isScheduledTransfer ? "SCHEDULED_TRANSFER_CREATED" : type === "Transfer" ? "TRANSFER_CREATED" : `${type.toUpperCase()}_CREATED`);

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
    sortCode: cleanName(input.recipientSortCode)
  };

  if (!beneficiary.name || !/^\d{8}$/.test(beneficiary.accountNumber || "") || !/^\d{2}-?\d{2}-?\d{2}$/.test(beneficiary.sortCode || "")) {
    throw statusError(400, "Enter a recipient name, 8 digit account number, and sort code");
  }

  return {
    id: saved ? saved.id : null,
    name: beneficiary.name,
    accountNumber: beneficiary.accountNumber,
    sortCode: formatSortCode(beneficiary.sortCode)
  };
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function createAccountNumber(offset) {
  return String(80420000 + offset + Math.floor(Math.random() * 899)).padStart(8, "0");
}

function createIban(offset, accountNumber) {
  return `GB${String(82 + offset).padStart(2, "0")}TBUK237548${accountNumber}`;
}

function createReference(type) {
  return `${type.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

function formatSortCode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

function formatLimit(value) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
}

function getTodaysTransferTotal(transactions) {
  const today = new Date().toISOString().slice(0, 10);

  return transactions
    .filter((transaction) => transaction.type === "Transfer")
    .filter((transaction) => String(transaction.createdAt || "").slice(0, 10) === today)
    .reduce((total, transaction) => total + Math.abs(Number(transaction.amount || 0)), 0);
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
  user.account.currency = user.account.currency || "GBP";
  user.account.iban = user.account.iban || `GB82TBUK237548${user.account.number}`;
  user.account.dailyTransferLimit = user.account.dailyTransferLimit || 1000;
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

function buildNotifications(user) {
  const notifications = [];

  if (user.application?.status === "Pending Approval") {
    notifications.push({
      type: "Application",
      title: "Application awaiting review",
      message: "Your application is with the back office team. Online banking unlocks after approval.",
      createdAt: user.application.submittedAt || user.createdAt || new Date().toISOString()
    });
  }

  if (user.application?.status === "Approved") {
    notifications.push({
      type: "Application",
      title: "Application approved",
      message: "Your account is active and ready for payments, payees, statements, and account controls.",
      createdAt: user.application.decidedAt || user.account.openedAt || user.createdAt || new Date().toISOString()
    });
  }

  if (user.application?.status === "Rejected") {
    notifications.push({
      type: "Application",
      title: "Application decision available",
      message: user.application.decisionReason || "Your application could not be approved. Please contact support.",
      createdAt: user.application.decidedAt || user.createdAt || new Date().toISOString()
    });
  }

  if (user.account?.status === "Frozen") {
    notifications.push({
      type: "Security",
      title: "Account temporarily frozen",
      message: "Payments are paused while back office review is in progress.",
      createdAt: new Date().toISOString()
    });
  }

  const pendingPayments = (user.transactions || []).filter((transaction) => transaction.status === "Pending").length;
  if (pendingPayments) {
    notifications.push({
      type: "Payments",
      title: `${pendingPayments} scheduled payment${pendingPayments === 1 ? "" : "s"}`,
      message: "Scheduled payments can be cancelled from Recent Activity before processing.",
      createdAt: new Date().toISOString()
    });
  }

  if (user.security?.lastLoginAt) {
    notifications.push({
      type: "Security",
      title: "Recent login recorded",
      message: `Last successful login: ${new Date(user.security.lastLoginAt).toLocaleString("en-GB")}.`,
      createdAt: user.security.lastLoginAt
    });
  }

  return notifications.slice(0, 6);
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
  const sortCode = formatSortCode(input.sortCode);
  const nickname = cleanName(input.nickname) || name;

  if (!name || !/^\d{8}$/.test(accountNumber) || !/^\d{2}-\d{2}-\d{2}$/.test(sortCode)) {
    throw statusError(400, "Enter a payee name, 8 digit account number, and sort code");
  }

  const duplicate = user.beneficiaries.find((item) => item.accountNumber === accountNumber && item.sortCode === sortCode);

  if (duplicate) {
    throw statusError(409, "This payee already exists");
  }

  user.beneficiaries.unshift({
    id: crypto.randomUUID(),
    name,
    nickname,
    accountNumber,
    sortCode,
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

  if (!["Active", "Frozen"].includes(cardStatus)) {
    throw statusError(400, "Choose a valid card status");
  }

  if (!Number.isFinite(dailyTransferLimit) || dailyTransferLimit < 50 || dailyTransferLimit > 5000) {
    throw statusError(400, "Daily transfer limit must be between £50 and £5,000");
  }

  user.account.cardStatus = cardStatus;
  user.account.dailyTransferLimit = Number(dailyTransferLimit.toFixed(2));
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
  createBeneficiary,
  deleteBeneficiary,
  findUserByEmail,
  findUserByLoginIdentifier,
  getUserById,
  isUserLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  updateUserProfile,
  updateAccountControls,
  changePassword,
  publicUser
};

