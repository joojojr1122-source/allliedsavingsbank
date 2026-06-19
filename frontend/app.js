const tokenKey = "bankPortalToken";

const signupForm = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");
const dashboard = document.querySelector("#dashboard");
const statusMessage = document.querySelector("#statusMessage");
const tabs = document.querySelectorAll("[data-tab]");
const signupButtons = document.querySelectorAll("[data-show-signup], [data-open-auth]");
const loginButtons = document.querySelectorAll("[data-show-login]");
const logoutButton = document.querySelector("#logoutButton");
const portal = document.querySelector("#portal");
const branchForm = document.querySelector("#branchForm");
const newsletterForm = document.querySelector("#newsletterForm");
const branchResult = document.querySelector("#branchResult");
const newsletterResult = document.querySelector("#newsletterResult");
const transactionForm = document.querySelector("#transactionForm");
const transactionList = document.querySelector("#transactionList");
const txTypeSelect = document.querySelector("#txType");
const hero = document.querySelector(".hero");
const heroTitle = document.querySelector(".hero h1");
const sliderDots = document.querySelectorAll(".slider-dots span");
const sliderButtons = document.querySelectorAll(".slider-arrow");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalPanel = document.querySelector("#modalPanel");
const txFilterType = document.querySelector("#txFilterType");
const txFilterDesc = document.querySelector("#txFilterDesc");
const showAllTransactionsBtn = document.querySelector("#showAllTransactionsBtn");
const settingsButton = document.querySelector("#settingsButton");
const changePasswordButton = document.querySelector("#changePasswordButton");
const quickActionButtons = document.querySelectorAll("[data-quick-action]");
const mobileMenuToggle = document.querySelector("#mobileMenuToggle");
const header = document.querySelector(".site-header");
const transferFields = document.querySelector("#transferFields");
const beneficiaryForm = document.querySelector("#beneficiaryForm");
const beneficiaryList = document.querySelector("#beneficiaryList");
const beneficiarySelect = document.querySelector("#beneficiarySelect");
const controlsForm = document.querySelector("#controlsForm");
const cardStatusSelect = document.querySelector("#cardStatusSelect");
const dailyTransferLimitInput = document.querySelector("#dailyTransferLimitInput");
const downloadStatementBtn = document.querySelector("#downloadStatementBtn");
const loadingStatus = document.querySelector("#loadingStatus");
const confirmationPanel = document.querySelector("#confirmationPanel");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminLoginPanel = document.querySelector("#adminLoginPanel");
const adminDashboard = document.querySelector("#adminDashboard");
const adminStatus = document.querySelector("#adminStatus");
const adminMetrics = document.querySelector("#adminMetrics");
const adminUsers = document.querySelector("#adminUsers");
const adminTransactions = document.querySelector("#adminTransactions");
const adminRefreshButton = document.querySelector("#adminRefreshButton");
const adminSearch = document.querySelector("#adminSearch");
const adminStatusFilter = document.querySelector("#adminStatusFilter");
const auditList = document.querySelector("#auditList");
const notificationList = document.querySelector("#notificationList");
const notificationCount = document.querySelector("#notificationCount");
const passwordToggles = document.querySelectorAll("[data-toggle-password]");
const signupStepPanels = document.querySelectorAll("[data-step-panel]");
const signupStepLabels = document.querySelectorAll(".step-indicator span");
const stepBackButton = document.querySelector("#stepBackButton");
const stepNextButton = document.querySelector("#stepNextButton");
const submitApplicationButton = document.querySelector("#submitApplicationButton");
const signupReview = document.querySelector("#signupReview");
const passwordStrengthText = document.querySelector("#passwordStrengthText");
const passwordStrengthBar = document.querySelector("#passwordStrengthBar");

const slides = [
  { title: "Allied Savings", image: "/assets/slider-cards.png", link: "/signup.html" },
  { title: "Online Banking", image: "/assets/slider-cards.png", link: "/login.html" },
  { title: "Personal Savings", image: "/assets/slider-cards.png", link: "/signup.html" }
];
let sensitiveDetailsVisible = false;
let slideIndex = 0;
let allTransactions = [];
let currentUser = null;
let latestAdminSummary = null;
let sessionTimeoutWarningShown = false;
let lastUserActivityAt = Date.now();
const isDashboardPage = document.body.dataset.page === "dashboard";
const isLoadingPage = document.body.dataset.page === "loading";
const isConfirmationPage = document.body.dataset.page === "confirmation";
const isAuthPage = document.body.dataset.page === "auth";
const isHomePage = document.body.dataset.page === "home";
const isAdminPage = document.body.dataset.page === "admin";
let signupStep = 0;

function setStatus(message, isSuccess = false) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-success", isSuccess);
}

function showTab(name) {
  if (!portal || !signupForm || !loginForm || !dashboard) return;
  portal.classList.add("is-open");
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
  signupForm.classList.toggle("is-hidden", name !== "signup");
  loginForm.classList.toggle("is-hidden", name !== "login");
  dashboard.classList.add("is-hidden");
  setStatus("");
  document.querySelector("#portal").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showDashboard(user) {
  portal?.classList.add("is-open");
  signupForm?.classList.add("is-hidden");
  loginForm?.classList.add("is-hidden");
  dashboard?.classList.remove("is-hidden");
  tabs.forEach((tab) => tab.classList.remove("is-active"));

  setText("#accountName", `${user.firstName} ${user.lastName}`.trim());
  setText("#accountProduct", user.account.type);
  const availableBalance = getAvailableBalance(user);
  const pendingIncoming = getPendingIncomingTotal(user);
  setText("#accountBalance", formatMoney(availableBalance, user.account.currency));
  setText("#ledgerBalance", formatMoney(user.account.balance, user.account.currency));
  setText("#pendingIncomingAmount", formatMoney(pendingIncoming, user.account.currency));
  setText("#accountNumber", sensitiveDetailsVisible ? user.account.number : maskAccountNumber(user.account.number));
  setText("#sortCode", sensitiveDetailsVisible ? user.account.sortCode : maskSortCode(user.account.sortCode));
  setText("#accountStatus", user.account.status || "Active");
  const iban = user.account.iban || "ASAVUS33XXX";
  setText("#accountIban", formatIbanDisplay(iban, sensitiveDetailsVisible));
  setText("#accountProductDetail", user.account.type);
  setText("#accountEmail", user.email || "-");
  setText("#accountPhone", user.application?.phone || "-");

  const openedDate = user.account.openedAt
    ? new Date(user.account.openedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "-";
  setText("#accountOpened", openedDate);
  setText("#accountCurrency", user.account.currency || "USD");
  setText("#accountAddress", user.application?.address || "-");
  const cardLastFour = user.account.cardLastFour || String(user.account.number).slice(-4);
  setText("#cardStatus", `${user.account.cardStatus || "Active"} - Exp ${user.account.cardExpiry || "-"}`);
  setText("#dailyTransferLimitMetric", formatMoney(user.account.dailyTransferLimit || 1000, user.account.currency));
  setText("#cardPreviewName", `${user.firstName} ${user.lastName}`.trim().toUpperCase());
  setText("#savedPayeesCount", String((user.beneficiaries || []).length));
  setText("#cardPreviewNumber", `**** **** **** ${cardLastFour}`);
  setText("#pendingPayments", String((user.transactions || []).filter((t) => t.status === "Pending").length));
  setText("#failedAttemptsBadge", `${Number(user.security?.failedLoginAttempts || 0)} failed attempts`);
  setText("#lastLoginAt", user.security?.lastLoginAt ? new Date(user.security.lastLoginAt).toLocaleString("en-US") : "-");
  setText("#securitySummary", user.security?.lastLoginAt ? "Recent sign-in recorded. Keep your password private." : "Your first online banking session is active.");
  setText("#accountStatusBanner", buildAccountStatusMessage(user));
  renderAuditList(user.auditLog || []);
  renderNotifications(user.notifications || []);

  if (cardStatusSelect) cardStatusSelect.value = user.account.cardStatus || "Active";
  if (dailyTransferLimitInput) dailyTransferLimitInput.value = user.account.dailyTransferLimit || 1000;

  allTransactions = user.transactions || [];
  renderTransactions(allTransactions, user.account.currency);
  renderBeneficiaries(user.beneficiaries || []);
  currentUser = user;
  setStatus("");
  updateSensitiveToggleButtons();
  bindSortCodeInputs();
}

function buildAccountStatusMessage(user) {
  if (user.account.status === "Frozen") return "Account frozen. Payments and transfers are paused until back-office review is complete.";
  if (user.account.status === "Pending Approval") return "Application submitted. Online banking activates after admin approval.";
  if (user.account.status === "Rejected") return user.application?.decisionReason || "Application rejected. Please contact support for details.";
  const pending = (user.transactions || []).filter((transaction) => transaction.status === "Pending").length;
  return pending ? `${pending} scheduled payment${pending === 1 ? "" : "s"} awaiting processing.` : "Account active and ready for online banking.";
}

function renderNotifications(entries) {
  if (!notificationList) return;
  if (notificationCount) notificationCount.textContent = String(entries.length);

  if (!entries.length) {
    notificationList.innerHTML = emptyState("No new notifications", "Payment, security, and service updates will appear here when there is something you need to review.");
    return;
  }

  notificationList.innerHTML = entries.map((entry) => `
    <article class="notification-item">
      <span>${escapeHtml(entry.type || "Update")}</span>
      <strong>${escapeHtml(entry.title || "Account update")}</strong>
      <p>${escapeHtml(entry.message || "")}</p>
      <small>${entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-US") : "Just now"}</small>
    </article>
  `).join("");
}

function renderAuditList(entries) {
  if (!auditList) return;

  if (!entries.length) {
    auditList.innerHTML = `<p class="form-note">No security events recorded yet.</p>`;
    return;
  }

  auditList.innerHTML = `
    <h4>Recent security activity</h4>
    ${entries.slice(0, 4).map((entry) => `
      <article>
        <strong>${escapeHtml(formatAuditAction(entry.action))}</strong>
        <span>${new Date(entry.createdAt).toLocaleString("en-US")}${entry.note ? ` - ${escapeHtml(entry.note)}` : ""}</span>
      </article>
    `).join("")}
  `;
}

function buildDashboardUrl() {
  return "/dashboard.html";
}

const loadingMessages = [
  "Checking your sign-in details...",
  "Preparing your accounts...",
  "Loading payments and statements...",
  "Applying security checks..."
];

function goToLoading(message, next = buildDashboardUrl()) {
  const copy = message || loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  sessionStorage.setItem("bankLoadingMessage", copy);
  window.location.assign(`/loading.html?next=${encodeURIComponent(next)}`);
}

function openReceiptModal(receipt) {
  openModal(`
    <div class="modal-header">
      <h2>${escapeHtml(receipt.title)}</h2>
      <button class="modal-close" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="receipt-modal">
      <p class="receipt-status">${escapeHtml(receipt.status)}</p>
      <dl class="receipt-details">
        ${receipt.rows.map((row) => `
          <div>
            <dt>${escapeHtml(row.label)}</dt>
            <dd>${escapeHtml(row.value)}</dd>
          </div>
        `).join("")}
      </dl>
      <div class="modal-actions">
        <button class="text-button print-receipt-action" type="button">Print Receipt</button>
        <button class="primary-button modal-close-action" type="button">Done</button>
      </div>
    </div>
  `);
  modalPanel?.querySelector(".modal-close")?.addEventListener("click", closeModal);
  modalPanel?.querySelector(".modal-close-action")?.addEventListener("click", closeModal);
  modalPanel?.querySelector(".print-receipt-action")?.addEventListener("click", () => window.print());
}

function showTransactionReceipt(user) {
  const transaction = user.transactions?.[0];

  if (!transaction) return;

  openReceiptModal({
    title: `${transaction.type} Confirmation`,
    status: transaction.status === "Pending"
      ? "Payment scheduled. Funds will leave your account on the date shown."
      : transaction.type === "Transfer"
        ? "Payment sent. Faster Payments usually arrive within 2 hours."
        : "Transaction completed successfully.",
    rows: [
      { label: "Reference", value: transaction.reference || "Completed" },
      { label: "Amount", value: formatMoney(Math.abs(transaction.amount), user.account.currency) },
      { label: "Balance After", value: formatMoney(transaction.balanceAfter, user.account.currency) },
      ...(transaction.scheduledFor ? [{ label: "Scheduled For", value: new Date(transaction.scheduledFor).toLocaleDateString("en-US") }] : []),
      { label: "Date", value: new Date(transaction.createdAt).toLocaleString("en-US") }
    ]
  });
}

function confirmTransferSubmission(payload) {
  if (!currentUser || payload.type !== "Transfer") return Promise.resolve(true);

  const amount = Number(payload.amount || 0);
  const savedPayee = payload.beneficiaryId
    ? (currentUser.beneficiaries || []).find((item) => item.id === payload.beneficiaryId)
    : null;
  const recipient = savedPayee || {
    name: payload.recipientName || "New recipient",
    accountNumber: payload.recipientAccountNumber || "",
    sortCode: payload.recipientSortCode || ""
  };
  const transferLimit = Number(currentUser.account.dailyTransferLimit || 1000);
  const usedToday = getTodaysTransferTotal(allTransactions);
  const remaining = Math.max(transferLimit - usedToday - amount, 0);
  const scheduled = payload.scheduledFor
    ? new Date(payload.scheduledFor).toLocaleDateString("en-US")
    : "Today";

  return new Promise((resolve) => {
    openModal(`
      <div class="modal-header">
        <h2>Review Transfer</h2>
        <button class="modal-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="receipt-modal">
        <p class="receipt-status">Review the payment below. Payment fee: ${escapeHtml(formatMoney(0, currentUser.account.currency))}. Funds usually arrive within 2 hours for Faster Payments.</p>
        <dl class="receipt-details">
          <div><dt>Amount</dt><dd>${escapeHtml(formatMoney(amount, currentUser.account.currency))}</dd></div>
          <div><dt>Recipient</dt><dd>${escapeHtml(recipient.name)}</dd></div>
          <div><dt>Account</dt><dd>${escapeHtml(`${recipient.sortCode || ""} ${recipient.accountNumber || ""}`.trim())}</dd></div>
          <div><dt>Reference</dt><dd>${escapeHtml((payload.description || "Transfer").slice(0, 18))}</dd></div>
          <div><dt>Payment Date</dt><dd>${escapeHtml(scheduled)}</dd></div>
          <div><dt>Remaining Daily Limit</dt><dd>${escapeHtml(formatMoney(remaining, currentUser.account.currency))}</dd></div>
        </dl>
        <div class="modal-actions">
          <button class="primary-button confirm-transfer-btn" type="button">Confirm Transfer</button>
          <button class="text-button modal-secondary" type="button">Edit Details</button>
        </div>
      </div>
    `);

    const finish = (value) => {
      closeModal();
      resolve(value);
    };
    modalPanel.querySelector(".modal-close")?.addEventListener("click", () => finish(false));
    modalPanel.querySelector(".modal-secondary")?.addEventListener("click", () => finish(false));
    modalPanel.querySelector(".confirm-transfer-btn")?.addEventListener("click", () => finish(true));
  });
}

function getTodaysTransferTotal(transactions) {
  const today = new Date().toISOString().slice(0, 10);
  return (transactions || [])
    .filter((transaction) => transaction.type === "Transfer")
    .filter((transaction) => String(transaction.createdAt || "").slice(0, 10) === today)
    .reduce((total, transaction) => total + Math.abs(Number(transaction.amount || 0)), 0);
}

function renderTransactions(transactions, currency) {
  if (!transactionList) return;
  const visibleTransactions = transactions.filter((transaction) => transaction.type !== "Account Opening");
  if (!visibleTransactions.length) {
    transactionList.innerHTML = emptyState("No payments in the last 90 days", "Deposits, transfers, card payments, and scheduled payments will appear here.", "Make a payment", "deposit");
    return;
  }
  transactionList.innerHTML = visibleTransactions.map((transaction) => {
    const isPositive = transaction.amount >= 0;
    const amountClass = isPositive ? "is-positive" : "is-negative";
    const date = new Date(transaction.createdAt).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    const removeTitle = transaction.status === "Pending" ? "Cancel payment" : "Reverse transaction";
    const removeBtn = `<button class="tx-remove-btn" data-tx-delete="${escapeHtml(transaction.id)}" title="${removeTitle}">&#128465;</button>`;
    return `
      <article class="transaction-item" data-tx-id="${escapeHtml(transaction.id)}">
        <div>
          <strong>${escapeHtml(transaction.type)}</strong>
          <span>${escapeHtml(transaction.description)}</span>
          <small>${date} &middot; ${escapeHtml(transaction.status)} &middot; ${escapeHtml(transaction.reference || "PENDING")}</small>
          ${transaction.scheduledFor ? `<small>Scheduled for ${new Date(transaction.scheduledFor).toLocaleDateString("en-US")}</small>` : ""}
          ${transaction.beneficiary ? `<small>To ${escapeHtml(transaction.beneficiary.name)} &middot; ${escapeHtml(transaction.beneficiary.sortCode)} ${escapeHtml(transaction.beneficiary.accountNumber)}</small>` : ""}
        </div>
        <div class="tx-item-right">
          <span class="transaction-amount ${amountClass}">${formatMoney(transaction.amount, currency)}</span>
          ${removeBtn}
        </div>
      </article>
    `;
  }).join("");
}

function renderBeneficiaries(beneficiaries) {
  if (!beneficiaryList || !beneficiarySelect) return;

  beneficiarySelect.innerHTML = '<option value="">Use new recipient details</option>';

  beneficiaries.forEach((beneficiary) => {
    const option = document.createElement("option");
    option.value = beneficiary.id;
    option.textContent = `${beneficiary.nickname || beneficiary.name} (${beneficiary.sortCode})`;
    beneficiarySelect.append(option);
  });

  if (!beneficiaries.length) {
    beneficiaryList.innerHTML = emptyState("No saved payees", "Save trusted recipients to make transfers faster and easier.", "Add Payee", "payee");
    return;
  }

  beneficiaryList.innerHTML = beneficiaries.map((beneficiary) => `
    <article class="payee-item">
      <div>
        <strong>${escapeHtml(beneficiary.nickname || beneficiary.name)}</strong>
        <span>${escapeHtml(beneficiary.name)} &middot; ${escapeHtml(beneficiary.sortCode)} ${escapeHtml(beneficiary.accountNumber)}</span>
      </div>
      <button class="tx-remove-btn" type="button" data-beneficiary-delete="${escapeHtml(beneficiary.id)}">Remove</button>
    </article>
  `).join("");
}

function emptyState(title, message, actionLabel = "", action = "") {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
      ${actionLabel ? `<button class="text-button empty-state-action" type="button" data-empty-action="${escapeHtml(action)}">${escapeHtml(actionLabel)}</button>` : ""}
    </div>
  `;
}

function updateTransferFields() {
  if (!transferFields || !txTypeSelect) return;
  const isTransfer = txTypeSelect.value === "Transfer";
  transferFields.classList.toggle("is-hidden", !isTransfer);
  transferFields.querySelectorAll("input").forEach((input) => {
    input.required = isTransfer && input.name !== "scheduledFor" && !beneficiarySelect?.value;
  });
}

function applyTransactionFilter() {
  if (!currentUser) return;
  const typeVal = txFilterType ? txFilterType.value : "";
  const descVal = txFilterDesc ? txFilterDesc.value.trim().toLowerCase() : "";

  let filtered = allTransactions;
  if (typeVal) {
    filtered = filtered.filter((t) => t.type === typeVal);
  }
  if (descVal) {
    filtered = filtered.filter((t) => t.description.toLowerCase().includes(descVal));
  }
  renderTransactions(filtered, currentUser.account.currency);
}

async function deleteTransaction(transactionId) {
  try {
    await apiRequest(`/api/account/transaction/${encodeURIComponent(transactionId)}`, { method: "DELETE" });
    if (currentUser) {
      const data = await apiRequest("/api/account/me");
      showDashboard(data.user);
    }
    setStatus("Transaction removed.", true);
  } catch (err) {
    setStatus(err.message);
  }
}

transactionList?.addEventListener("click", async (e) => {
  const emptyAction = e.target.closest("[data-empty-action]");
  if (emptyAction) {
    handleEmptyStateAction(emptyAction.dataset.emptyAction);
    return;
  }

  const btn = e.target.closest("[data-tx-delete]");
  if (!btn) return;
  const txId = btn.dataset.txDelete;
  if (!txId) return;
  const transaction = allTransactions.find((item) => item.id === txId);
  const prompt = transaction?.status === "Pending" ? "Cancel this scheduled payment?" : "Reverse this transaction?";
  if (!window.confirm(prompt)) return;
  btn.disabled = true;
  btn.textContent = "...";
  await deleteTransaction(txId);
});

function handleEmptyStateAction(action) {
  if (action === "deposit" && txTypeSelect) {
    txTypeSelect.value = "Deposit";
    txTypeSelect.dispatchEvent(new Event("change"));
    transactionForm?.scrollIntoView({ behavior: "smooth", block: "center" });
    transactionForm?.querySelector('input[name="amount"]')?.focus();
  }

  if (action === "payee") {
    beneficiaryForm?.scrollIntoView({ behavior: "smooth", block: "center" });
    beneficiaryForm?.querySelector("input")?.focus();
  }
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
}

function maskAccountNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "**** ****";
  return `**** **** ${digits.slice(-4)}`;
}

function maskSortCode(value) {
  const formatted = String(value || "").trim();
  if (!formatted) return "*** *** ***";
  const parts = formatted.split("-");
  if (parts.length === 3) {
    return `*** *** ${parts[2]}`;
  }
  return "*** *** ***";
}

function formatIbanDisplay(iban, revealed) {
  const compact = String(iban || "").replace(/\s/g, "").toUpperCase();
  if (!compact) return "-";
  if (!revealed) {
    return `${compact.slice(0, 4)} **** **** ${compact.slice(-4)}`;
  }
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

function getAvailableBalance(user) {
  const balance = Number(user.account.balance || 0);
  const reserved = (user.transactions || [])
    .filter((transaction) => transaction.status === "Pending" && Number(transaction.amount) < 0)
    .reduce((total, transaction) => total + Math.abs(Number(transaction.amount || 0)), 0);
  return Number((balance - reserved).toFixed(2));
}

function getPendingIncomingTotal(user) {
  return Number((user.transactions || [])
    .filter((transaction) => transaction.status === "Pending" && Number(transaction.amount) > 0)
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)
    .toFixed(2));
}

function updateSensitiveToggleButtons() {
  document.querySelectorAll("[data-sensitive-toggle]").forEach((button) => {
    button.textContent = sensitiveDetailsVisible ? "Hide" : "Show";
    button.setAttribute("aria-pressed", sensitiveDetailsVisible ? "true" : "false");
  });
}

function bindSortCodeInputs() {
  document.querySelectorAll('input[name="sortCode"], input[name="recipientSortCode"]').forEach((input) => {
    if (input.dataset.sortBound === "true") return;
    input.dataset.sortBound = "true";
    input.addEventListener("blur", () => {
      const digits = input.value.replace(/\D/g, "").slice(0, 6);
      if (digits.length === 6) {
        input.value = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
      }
    });
  });
}

function bindSensitiveDetailControls() {
  document.querySelectorAll("[data-sensitive-toggle]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      sensitiveDetailsVisible = !sensitiveDetailsVisible;
      if (currentUser) showDashboard(currentUser);
    });
  });

  const copyButton = document.querySelector("#copyIbanButton");
  if (copyButton && copyButton.dataset.bound !== "true") {
    copyButton.dataset.bound = "true";
    copyButton.addEventListener("click", async () => {
      if (!currentUser) return;
      const iban = currentUser.account.iban || `ASAVUS330000${currentUser.account.number}`;
      try {
        await navigator.clipboard.writeText(iban.replace(/\s/g, ""));
        setStatus("IBAN copied to clipboard.", true);
      } catch (error) {
        setStatus("Unable to copy IBAN on this device.");
      }
    });
  }
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(tokenKey);
  const { auth = true, ...fetchOptions } = options;
  const response = await fetch(path, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function formToJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const auditActionLabels = {
  LOGIN_SUCCESS: "Successful sign-in",
  LOGIN_FAILED: "Unsuccessful sign-in attempt",
  TRANSFER_CREATED: "Faster Payment sent",
  SCHEDULED_TRANSFER_CREATED: "Payment scheduled",
  SCHEDULED_TRANSFER_COMPLETED: "Scheduled payment completed",
  SCHEDULED_TRANSFER_FAILED: "Scheduled payment failed",
  SCHEDULED_TRANSFER_UPDATED: "Scheduled payment updated",
  CARD_USED: "Card activity",
  DEPOSIT_CREATED: "Incoming payment received",
  ACCOUNT_APPROVED: "Account approved",
  APPLICATION_SUBMITTED: "Application submitted",
  ACCOUNT_FROZEN: "Account frozen",
  ACCOUNT_REACTIVATED: "Account reactivated"
};

function formatAuditAction(action) {
  return auditActionLabels[action] || String(action || "Activity")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function openModal(contentHtml) {
  if (!modalPanel || !modalBackdrop) return;
  modalPanel.innerHTML = contentHtml;
  modalBackdrop.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.add("is-hidden");
  document.body.style.overflow = "";
}

modalBackdrop?.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBackdrop && !modalBackdrop.classList.contains("is-hidden")) closeModal();
});

function showSettingsModal() {
  if (!currentUser) return;
  const u = currentUser;
  openModal(`
    <div class="modal-header">
      <h2>Personal Details</h2>
      <button class="modal-close" type="button" aria-label="Close">&times;</button>
    </div>
    <form id="settingsForm">
      <label>First name<input name="firstName" value="${escapeHtml(u.firstName)}" required></label>
      <label>Last name<input name="lastName" value="${escapeHtml(u.lastName)}" required></label>
      <label>Email<input name="email" type="email" value="${escapeHtml(u.email)}" required></label>
      <label>Phone<input name="phone" type="tel" value="${escapeHtml(u.application?.phone || "")}" required></label>
      <label>Address<input name="address" value="${escapeHtml(u.application?.address || "")}" required></label>
      <label>Product
        <select name="product">
          <option value="Current Account" ${u.account.type === "Current Account" ? "selected" : ""}>Current Account</option>
          <option value="Basic Savings Account" ${u.account.type === "Basic Savings Account" ? "selected" : ""}>Basic Savings Account</option>
          <option value="Easy Access Deposit Account" ${u.account.type === "Easy Access Deposit Account" ? "selected" : ""}>Easy Access Deposit Account</option>
        </select>
      </label>
      <div class="modal-check-grid">
        <label class="modal-check"><input name="emailAlerts" type="checkbox" ${u.preferences?.emailAlerts !== false ? "checked" : ""}> Email alerts</label>
        <label class="modal-check"><input name="smsAlerts" type="checkbox" ${u.preferences?.smsAlerts ? "checked" : ""}> SMS alerts</label>
      </div>
      <label>Statement frequency
        <select name="statementFrequency">
          <option ${u.preferences?.statementFrequency === "Monthly" ? "selected" : ""}>Monthly</option>
          <option ${u.preferences?.statementFrequency === "Quarterly" ? "selected" : ""}>Quarterly</option>
          <option ${u.preferences?.statementFrequency === "Annually" ? "selected" : ""}>Annually</option>
        </select>
      </label>
      <div class="modal-actions">
        <button class="primary-button" type="submit">Save Changes</button>
        <button class="text-button modal-secondary" type="button">Cancel</button>
      </div>
      <p class="modal-status" id="settingsStatus"></p>
    </form>
  `);
  const form = modalPanel.querySelector("#settingsForm");
  const statusEl = modalPanel.querySelector("#settingsStatus");
  const closeBtn = modalPanel.querySelector(".modal-close");
  const cancelBtn = modalPanel.querySelector(".modal-secondary");

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setModalStatus(statusEl, "Saving...");
    try {
      const data = await apiRequest("/api/account/me", {
        method: "PATCH",
        body: JSON.stringify(formToJson(form))
      });
      showDashboard(data.user);
      closeModal();
      setStatus("Details updated.", true);
    } catch (err) {
      setModalStatus(statusEl, err.message);
    }
  });
}

function showChangePasswordModal() {
  if (!currentUser) return;
  openModal(`
    <div class="modal-header">
      <h2>Change Password</h2>
      <button class="modal-close" type="button" aria-label="Close">&times;</button>
    </div>
    <form id="passwordForm">
      <label>Current password<input name="currentPassword" type="password" autocomplete="current-password" required></label>
      <label>New password<input name="newPassword" type="password" autocomplete="new-password" minlength="10" required></label>
      <label>Confirm new password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="10" required></label>
      <div class="modal-actions">
        <button class="primary-button" type="submit">Update Password</button>
        <button class="text-button modal-secondary" type="button">Cancel</button>
      </div>
      <p class="modal-status" id="passwordStatus"></p>
    </form>
  `);
  const form = modalPanel.querySelector("#passwordForm");
  const statusEl = modalPanel.querySelector("#passwordStatus");
  const closeBtn = modalPanel.querySelector(".modal-close");
  const cancelBtn = modalPanel.querySelector(".modal-secondary");

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form).entries());
    if (body.newPassword !== body.confirmPassword) {
      setModalStatus(statusEl, "New passwords do not match.");
      return;
    }
    setModalStatus(statusEl, "Updating...");
    try {
      await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: body.currentPassword,
          newPassword: body.newPassword
        })
      });
      closeModal();
      setStatus("Password changed successfully.", true);
    } catch (err) {
      setModalStatus(statusEl, err.message);
    }
  });
}

function hydrateLoginPage() {
  if (!loginForm) return;

  const pendingEmail = sessionStorage.getItem("pendingLoginEmail");

  if (pendingEmail) {
    const emailInput = loginForm.querySelector('input[name="email"]');
    if (emailInput) emailInput.value = pendingEmail;
    setStatus("Your account has been opened. Sign in with the password you created.", true);
    sessionStorage.removeItem("pendingLoginEmail");
  }

  document.querySelector("#forgotDetailsLink")?.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(`
      <div class="modal-header">
        <h2>Forgotten your details?</h2>
        <button class="modal-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="receipt-modal">
        <p class="receipt-status">If you cannot sign in, contact our customer service team on 020 7403 5656. For security, we cannot reset passwords online in this channel.</p>
        <div class="modal-actions">
          <button class="primary-button modal-close-action" type="button">Close</button>
        </div>
      </div>
    `);
    modalPanel?.querySelector(".modal-close")?.addEventListener("click", closeModal);
    modalPanel?.querySelector(".modal-close-action")?.addEventListener("click", closeModal);
  });
}

function startSessionWatch() {
  if (!isDashboardPage) return;
  ["click", "keydown", "mousemove", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      lastUserActivityAt = Date.now();
      sessionTimeoutWarningShown = false;
    }, { passive: true });
  });

  window.setInterval(() => {
    if (!localStorage.getItem(tokenKey)) return;
    const idleMs = Date.now() - lastUserActivityAt;

    if (idleMs > 12 * 60 * 1000) {
      localStorage.removeItem(tokenKey);
      window.location.assign("/login.html");
      return;
    }

    if (idleMs > 9 * 60 * 1000 && !sessionTimeoutWarningShown) {
      sessionTimeoutWarningShown = true;
      openModal(`
        <div class="modal-header">
          <h2>Session Timeout</h2>
          <button class="modal-close" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="receipt-modal">
          <p class="receipt-status">You will be signed out in about 3 minutes due to inactivity. Select continue to stay signed in.</p>
          <div class="modal-actions">
            <button class="primary-button continue-session-btn" type="button">Continue Session</button>
            <button class="text-button end-session-btn" type="button">Logout</button>
          </div>
        </div>
      `);
      modalPanel.querySelector(".modal-close")?.addEventListener("click", closeModal);
      modalPanel.querySelector(".continue-session-btn")?.addEventListener("click", () => {
        lastUserActivityAt = Date.now();
        sessionTimeoutWarningShown = false;
        closeModal();
      });
      modalPanel.querySelector(".end-session-btn")?.addEventListener("click", () => logoutButton?.click());
    }
  }, 30000);
}

function setModalStatus(el, msg) {
  if (el) el.textContent = msg;
}

function updatePasswordStrength(password) {
  if (!passwordStrengthText || !passwordStrengthBar) return;

  const checks = [
    password.length >= 10,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  passwordStrengthText.textContent = `${labels[Math.max(score - 1, 0)]} password`;
  passwordStrengthBar.style.width = `${Math.max(score, 1) * 20}%`;
  passwordStrengthBar.dataset.score = String(score);
}

function showSignupStep(index) {
  if (!signupStepPanels.length) return;

  signupStep = Math.max(0, Math.min(index, signupStepPanels.length - 1));
  signupStepPanels.forEach((panel, panelIndex) => panel.classList.toggle("is-active", panelIndex === signupStep));
  signupStepLabels.forEach((label, labelIndex) => label.classList.toggle("is-active", labelIndex <= signupStep));

  if (stepBackButton) stepBackButton.disabled = signupStep === 0;
  stepNextButton?.classList.toggle("is-hidden", signupStep === signupStepPanels.length - 1);
  submitApplicationButton?.classList.toggle("is-hidden", signupStep !== signupStepPanels.length - 1);

  if (signupStep === signupStepPanels.length - 1) {
    renderSignupReview();
  }
}

function currentStepIsValid() {
  const panel = signupStepPanels[signupStep];
  if (!panel) return true;

  const fields = [...panel.querySelectorAll("input, select")];
  return fields.every((field) => field.reportValidity());
}

function renderSignupReview() {
  if (!signupReview || !signupForm) return;

  const data = formToJson(signupForm);
  signupReview.innerHTML = `
    <dl class="receipt-details">
      <div><dt>Name</dt><dd>${escapeHtml(`${data.firstName || ""} ${data.lastName || ""}`.trim() || "Not provided")}</dd></div>
      <div><dt>Product</dt><dd>${escapeHtml(data.product || "Current Account")}</dd></div>
      <div><dt>Email</dt><dd>${escapeHtml(data.email || "Not provided")}</dd></div>
      <div><dt>Phone</dt><dd>${escapeHtml(data.phone || "Not provided")}</dd></div>
      <div><dt>Employment</dt><dd>${escapeHtml(data.employmentStatus || "Not provided")}</dd></div>
      <div><dt>Address</dt><dd>${escapeHtml(data.address || "Not provided")}</dd></div>
    </dl>
  `;
}

async function loadAdminSummary(password) {
  if (!adminMetrics || !adminUsers || !adminTransactions) return;

  latestAdminSummary = await apiRequest("/api/admin/summary", {
    auth: false,
    headers: { "X-Admin-Password": password }
  });
  renderAdminSummary();
}

function renderAdminSummary() {
  if (!latestAdminSummary || !adminMetrics || !adminUsers || !adminTransactions) return;

  const data = latestAdminSummary;
  const searchTerm = (adminSearch?.value || "").trim().toLowerCase();
  const statusTerm = adminStatusFilter?.value || "";
  const users = data.users
    .filter((user) => !statusTerm || user.status === statusTerm)
    .filter((user) => !searchTerm || [
      user.name,
      user.email,
      user.accountNumber,
      user.status,
      user.applicationStatus,
      user.product
    ].join(" ").toLowerCase().includes(searchTerm));

  adminMetrics.innerHTML = [
    ["Accounts", data.totals.accounts],
    ["Pending", data.totals.pending || 0],
    ["Active", data.totals.active || 0],
    ["Frozen", data.totals.frozen || 0],
    ["Rejected", data.totals.rejected || 0],
    ["Total Balance", formatMoney(data.totals.balance, "USD")],
    ["Transactions", data.totals.transactions],
    ["Storage", data.database.persistent ? "Persistent" : "Session"]
  ].map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");

  adminUsers.innerHTML = users.map((user) => `
    <article class="admin-row">
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.email)} &middot; ${escapeHtml(user.accountNumber || "Pending account")} &middot; ${escapeHtml(user.status)}</span>
        <span>Application: ${escapeHtml(user.applicationStatus || "Not started")}${user.decisionReason ? ` &middot; ${escapeHtml(user.decisionReason)}` : ""}</span>
        <span>${escapeHtml(user.product || "Checking Account")} &middot; Last login ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-US") : "not yet"}</span>
        <span>Approval email: ${user.approvalEmailStatus ? `${escapeHtml(user.approvalEmailStatus)} &middot; ${new Date(user.approvalEmailAt).toLocaleString("en-US")}` : "Not queued"}</span>
        <div class="audit-mini">
          ${(user.auditLog || []).slice(0, 3).map((entry) => `<small>${escapeHtml(formatAuditAction(entry.action))} &middot; ${new Date(entry.createdAt).toLocaleDateString("en-US")}</small>`).join("")}
        </div>
      </div>
      <div class="admin-row-actions">
        <span>${formatMoney(user.balance, "USD")}</span>
        ${user.status === "Pending Approval" ? `<button class="primary-button admin-action-btn" data-admin-action="approve" data-email="${escapeHtml(user.email)}" type="button">Approve</button>` : ""}
        ${user.status === "Pending Approval" ? `<button class="text-button admin-action-btn" data-admin-action="reject" data-email="${escapeHtml(user.email)}" type="button">Reject</button>` : ""}
        ${user.status === "Active" ? `<button class="primary-button admin-action-btn" data-admin-action="approval-email" data-email="${escapeHtml(user.email)}" type="button">Send Approval Email</button>` : ""}
        ${user.status === "Active" ? `<button class="text-button admin-action-btn" data-admin-action="freeze" data-email="${escapeHtml(user.email)}" type="button">Freeze</button>` : ""}
        ${user.status === "Frozen" ? `<button class="primary-button admin-action-btn" data-admin-action="reactivate" data-email="${escapeHtml(user.email)}" type="button">Reactivate</button>` : ""}
      </div>
    </article>
  `).join("") || emptyState("No matching accounts", "Try changing the status filter or search term.");

  adminTransactions.innerHTML = data.recentTransactions.map((transaction) => `
    <article class="admin-row">
      <div>
        <strong>${escapeHtml(transaction.type)}</strong>
        <span>${escapeHtml(transaction.reference || "PENDING")} &middot; ${escapeHtml(transaction.description || "")}</span>
      </div>
      <div>${formatMoney(transaction.amount, "USD")}</div>
    </article>
  `).join("") || `<p class="form-note">No transactions yet.</p>`;
}

if (settingsButton) settingsButton.addEventListener("click", showSettingsModal);
if (changePasswordButton) changePasswordButton.addEventListener("click", showChangePasswordModal);
passwordToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.closest(".password-field")?.querySelector("input");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    button.textContent = input.type === "password" ? "Show" : "Hide";
  });
});
signupForm?.querySelector('input[name="password"]')?.addEventListener("input", (event) => {
  updatePasswordStrength(event.target.value);
});
stepBackButton?.addEventListener("click", () => showSignupStep(signupStep - 1));
stepNextButton?.addEventListener("click", () => {
  if (!currentStepIsValid()) return;
  showSignupStep(signupStep + 1);
});
adminLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = formToJson(adminLoginForm).adminPassword;
  if (adminStatus) adminStatus.textContent = "Loading admin console...";
  try {
    sessionStorage.setItem("adminPassword", password);
    await loadAdminSummary(password);
    adminLoginPanel?.classList.add("is-hidden");
    adminDashboard?.classList.remove("is-hidden");
    if (adminStatus) adminStatus.textContent = "";
  } catch (error) {
    sessionStorage.removeItem("adminPassword");
    if (adminStatus) adminStatus.textContent = error.message;
  }
});
adminRefreshButton?.addEventListener("click", async () => {
  const password = sessionStorage.getItem("adminPassword");
  if (!password) return;
  await loadAdminSummary(password);
});

adminSearch?.addEventListener("input", renderAdminSummary);
adminStatusFilter?.addEventListener("change", renderAdminSummary);

adminUsers?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-admin-action]");
  if (!button) return;

  const password = sessionStorage.getItem("adminPassword");
  const email = button.dataset.email;
  const action = button.dataset.adminAction;

  if (!password || !email || !action) return;

  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = "Working...";

  try {
    if (action === "approve") {
      await apiRequest(`/api/admin/approve-account/${encodeURIComponent(email)}`, {
        auth: false,
        method: "POST",
        headers: { "X-Admin-Password": password }
      });
    }

    if (action === "approval-email") {
      const data = await apiRequest(`/api/admin/send-approval-email/${encodeURIComponent(email)}`, {
        auth: false,
        method: "POST",
        headers: { "X-Admin-Password": password }
      });
      if (adminStatus) {
        adminStatus.textContent = `Approval email queued for ${data.message.to}.`;
      }
    }

    if (action === "reject") {
      const reason = window.prompt("Reason for rejection", "Identity checks could not be completed.");
      if (reason === null) {
        button.disabled = false;
        button.textContent = originalLabel;
        return;
      }
      await apiRequest(`/api/admin/reject-account/${encodeURIComponent(email)}`, {
        auth: false,
        method: "POST",
        headers: { "X-Admin-Password": password },
        body: JSON.stringify({ reason })
      });
    }

    if (action === "freeze" || action === "reactivate") {
      await apiRequest(`/api/admin/account-status/${encodeURIComponent(email)}`, {
        auth: false,
        method: "PATCH",
        headers: { "X-Admin-Password": password },
        body: JSON.stringify({
          status: action === "freeze" ? "Frozen" : "Active",
          note: action === "freeze" ? "Manual back-office security hold." : "Back-office review completed."
        })
      });
    }

    await loadAdminSummary(password);
  } catch (error) {
    button.disabled = false;
    button.textContent = originalLabel;
    if (adminStatus) adminStatus.textContent = error.message;
  }
});
if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-menu-open");
    mobileMenuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (txTypeSelect) txTypeSelect.addEventListener("change", updateTransferFields);
if (beneficiarySelect) beneficiarySelect.addEventListener("change", updateTransferFields);
if (txFilterType) txFilterType.addEventListener("change", applyTransactionFilter);
if (txFilterDesc) {
  txFilterDesc.addEventListener("input", () => { applyTransactionFilter(); });
}

if (controlsForm) {
  controlsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Saving account controls...");
    try {
      const data = await apiRequest("/api/account/controls", {
        method: "PATCH",
        body: JSON.stringify(formToJson(controlsForm))
      });
      showDashboard(data.user);
      setStatus("Account controls updated.", true);
    } catch (error) {
      setStatus(error.message);
    }
  });
}

if (beneficiaryForm) {
  beneficiaryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Adding payee...");
    try {
      const data = await apiRequest("/api/account/beneficiaries", {
        method: "POST",
        body: JSON.stringify(formToJson(beneficiaryForm))
      });
      beneficiaryForm.reset();
      showDashboard(data.user);
      setStatus("Payee added.", true);
    } catch (error) {
      setStatus(error.message);
    }
  });
}

beneficiaryList?.addEventListener("click", async (event) => {
  const emptyAction = event.target.closest("[data-empty-action]");
  if (emptyAction) {
    handleEmptyStateAction(emptyAction.dataset.emptyAction);
    return;
  }

  const button = event.target.closest("[data-beneficiary-delete]");
  if (!button) return;
  setStatus("Removing payee...");
  try {
    const data = await apiRequest(`/api/account/beneficiaries/${encodeURIComponent(button.dataset.beneficiaryDelete)}`, {
      method: "DELETE"
    });
    showDashboard(data.user);
    setStatus("Payee removed.", true);
  } catch (error) {
    setStatus(error.message.includes("approved") ? "Your application is still waiting for admin approval." : error.message);
  }
});

if (downloadStatementBtn) {
  downloadStatementBtn.addEventListener("click", () => {
    if (!currentUser) return;
    const rows = [
      ["Date", "Type", "Description", "Reference", "Amount", "Balance After", "Status"],
      ...allTransactions.map((transaction) => [
        transaction.createdAt,
        transaction.type,
        transaction.description,
        transaction.reference || "",
        transaction.amount,
        transaction.balanceAfter,
        transaction.status
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentUser.account.number}-statement.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

if (showAllTransactionsBtn) {
  showAllTransactionsBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    showAllTransactionsBtn.disabled = true;
    showAllTransactionsBtn.textContent = "Loading...";
    try {
      const data = await apiRequest(
        `/api/account/transactions?limit=500&type=${encodeURIComponent(txFilterType?.value || "")}`
      );
      allTransactions = data.transactions || [];
      renderTransactions(allTransactions, currentUser.account.currency);
      setStatus(`${allTransactions.length} transactions loaded.`, true);
    } catch (err) {
      setStatus(err.message);
    }
    showAllTransactionsBtn.disabled = false;
    showAllTransactionsBtn.innerHTML = '<span class="qa-icon">&#128196;</span> Full History';
  });
}

quickActionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.quickAction;
    if (!action || action === "all-history") return;
    if (txTypeSelect) txTypeSelect.value = btn.dataset.quickAction === "deposit" ? "Deposit" : btn.dataset.quickAction === "withdrawal" ? "Withdrawal" : "Transfer";
    if (txTypeSelect) {
      txTypeSelect.dispatchEvent(new Event("change"));
    }
    document.querySelector("#portal")?.scrollIntoView({ behavior: "smooth", block: "start" });
    transactionForm?.querySelector('input[name="amount"]')?.focus();
  });
});

// -- Tab / auth / logout / restoreSession (unchanged) -----------------------

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
});

signupButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    if (isHomePage || !signupForm) {
      window.location.assign("/signup.html");
      return;
    }
    showTab("signup");
  });
});

loginButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    if (isHomePage || !loginForm) {
      window.location.assign("/login.html");
      return;
    }
    showTab("login");
  });
});

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Opening your account...");
  try {
    const data = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(formToJson(signupForm))
    });
    localStorage.removeItem(tokenKey);
    sessionStorage.setItem("accountConfirmation", JSON.stringify({
      name: `${data.user.firstName} ${data.user.lastName}`,
      email: data.user.email,
      accountNumber: data.user.account.number,
      sortCode: data.user.account.sortCode,
      product: data.user.account.type
    }));
    signupForm.reset();
    window.location.assign("/confirmation.html");
  } catch (error) {
    setStatus(error.message);
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Signing in...");
  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(formToJson(loginForm))
    });
    localStorage.setItem(tokenKey, data.token);
    loginForm.reset();
    goToLoading();
  } catch (error) {
    setStatus(error.message);
  }
});

logoutButton?.addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem(tokenKey);
    if (isDashboardPage) {
      window.location.assign("/login.html");
    } else {
      showTab("login");
      setStatus("You have been logged out.", true);
    }
  }
});

async function restoreSession() {
  if (isConfirmationPage) {
    renderConfirmationPage();
    return;
  }

  if (!localStorage.getItem(tokenKey)) {
    if (isDashboardPage || isLoadingPage) window.location.assign("/login.html");
    return;
  }

  if (isLoadingPage) {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || buildDashboardUrl();
    if (loadingStatus) {
      loadingStatus.textContent = sessionStorage.getItem("bankLoadingMessage") || "Verifying credentials...";
    }

    try {
      await apiRequest("/api/account/me");
      window.setTimeout(() => {
        sessionStorage.removeItem("bankLoadingMessage");
        window.location.assign(next);
      }, 1200);
    } catch (error) {
      localStorage.removeItem(tokenKey);
      window.location.assign("/login.html");
    }
    return;
  }

  if (isAdminPage) {
    const password = sessionStorage.getItem("adminPassword");
    if (password) {
      try {
        await loadAdminSummary(password);
        adminLoginPanel?.classList.add("is-hidden");
        adminDashboard?.classList.remove("is-hidden");
      } catch (error) {
        sessionStorage.removeItem("adminPassword");
      }
    }
    return;
  }

  if (isAuthPage || isHomePage) {
    return;
  }

  try {
    const data = await apiRequest("/api/account/me");
    showDashboard(data.user);
  } catch (error) {
    localStorage.removeItem(tokenKey);
    if (isDashboardPage || isLoadingPage) window.location.assign("/login.html");
  }
}

function renderConfirmationPage() {
  if (!confirmationPanel) return;

  const raw = sessionStorage.getItem("accountConfirmation");
  const details = raw ? JSON.parse(raw) : null;

  confirmationPanel.innerHTML = `
    <div class="receipt-card">
      <p class="eyebrow">Application Submitted</p>
      <h1>Application received</h1>
      <p class="form-note">Your application has been received and is being reviewed. We will email you when online banking access is available.</p>
      <dl class="receipt-details">
        <div>
          <dt>Applicant</dt>
          <dd>${escapeHtml(details?.name || "Account Holder")}</dd>
        </div>
        <div>
          <dt>Product</dt>
          <dd>${escapeHtml(details?.product || "Current Account")}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>${escapeHtml(details?.email || "Use your application email")}</dd>
        </div>
        <div>
          <dt>Account Number</dt>
          <dd>${escapeHtml(details?.accountNumber || "Available in dashboard")}</dd>
        </div>
        <div>
          <dt>Sort Code</dt>
          <dd>${escapeHtml(details?.sortCode || "Available in dashboard")}</dd>
        </div>
      </dl>
      <form class="status-check-form" id="applicationStatusForm">
        <label>
          Check application status
          <input name="email" type="email" value="${escapeHtml(details?.email || "")}" placeholder="Email used for application" required>
        </label>
        <button class="primary-button" type="submit">Check Status</button>
      </form>
      <p class="status-check-result" id="applicationStatusResult"></p>
      <div class="modal-actions">
        <a class="primary-button receipt-link" href="/login.html">Go to Login</a>
      </div>
    </div>
  `;

  const statusForm = confirmationPanel.querySelector("#applicationStatusForm");
  const statusResult = confirmationPanel.querySelector("#applicationStatusResult");

  statusForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = formToJson(statusForm).email;
    statusResult.textContent = "Checking...";
    try {
      const data = await apiRequest(`/api/auth/application-status?email=${encodeURIComponent(email)}`, { auth: false });
      const app = data.application;
      const decided = app.decidedAt ? ` Reviewed ${new Date(app.decidedAt).toLocaleString("en-US")}.` : "";
      const reason = app.decisionReason ? ` ${app.decisionReason}` : "";
      statusResult.textContent = `${app.name} - ${app.product}: ${app.status}.${decided}${reason}`;
    } catch (error) {
      statusResult.textContent = error.message;
    }
  });
}

branchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedBranch = branchForm.querySelectorAll("select")[0]?.value || "-";
  branchResult.textContent = `${selectedBranch} selected. Branch details would open from Allied Savings in the live site.`;
});

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = newsletterForm.querySelector("input")?.value.trim() || "";
  newsletterResult.textContent = `Thank you. ${email} has been added to the contact list.`;
  newsletterForm.reset();
});

transactionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = formToJson(transactionForm);
  const confirmed = await confirmTransferSubmission(payload);
  if (!confirmed) {
    setStatus("Transfer details ready to edit.");
    return;
  }

  setStatus(payload.type === "Transfer" ? "Sending transfer..." : "Processing transaction...");
  try {
    const data = await apiRequest("/api/account/transactions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    transactionForm.reset();
    showDashboard(data.user);
    const latestTransaction = data.user.transactions?.[0];
    setStatus(latestTransaction?.status === "Pending" ? "Payment scheduled." : "Transaction completed.", true);
    showTransactionReceipt(data.user);
  } catch (error) {
    setStatus(error.message);
  }
});

// -- Slider -----------------------------------------------------------------

function renderSlide() {
  if (!hero) return;
  const slide = slides[slideIndex];
  hero.style.backgroundImage = `url("${slide.image}")`;
  hero.style.backgroundPosition = "center center";
  hero.style.backgroundSize = "cover";
  hero.style.backgroundRepeat = "no-repeat";
  hero.style.cursor = slide.link ? "pointer" : "default";
  hero.dataset.slideLink = slide.link || "";
  if (heroTitle && slide.title) {
    heroTitle.textContent = slide.title;
  }
  document.querySelectorAll(".slider-dots span").forEach((dot, index) => {
    dot.classList.toggle("is-active", index === slideIndex);
  });
}

function initHomeSlider() {
  if (!isHomePage || !hero) return;

  const dotsContainer = document.querySelector(".slider-dots");
  if (dotsContainer && !dotsContainer.childElementCount) {
    dotsContainer.innerHTML = slides.map((_, index) => `<span data-slide-index="${index}"></span>`).join("");
    dotsContainer.querySelectorAll("span").forEach((dot) => {
      dot.addEventListener("click", () => {
        slideIndex = Number(dot.dataset.slideIndex || 0);
        renderSlide();
      });
    });
  }

  hero.addEventListener("click", () => {
    const link = hero.dataset.slideLink;
    if (link) window.location.assign(link);
  });

  window.setInterval(() => {
    slideIndex = (slideIndex + 1) % slides.length;
    renderSlide();
  }, 7000);
}

sliderButtons.forEach((button) => {
  button.addEventListener("click", () => {
    slideIndex = (slideIndex + (button.classList.contains("slider-arrow--right") ? 1 : -1) + slides.length) % slides.length;
    renderSlide();
  });
});

if (!isHomePage) {
  sliderDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      slideIndex = index;
      renderSlide();
    });
  });
}

updateTransferFields();
showSignupStep(0);
renderSlide();
initHomeSlider();
hydrateLoginPage();
bindSensitiveDetailControls();
bindSortCodeInputs();
startSessionWatch();
restoreSession();
