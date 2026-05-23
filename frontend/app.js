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
const auditList = document.querySelector("#auditList");
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
  {
    title: "Internet Banking",
    image: "https://www.turkishbank.co.uk/wp-content/uploads/2025/07/slider-en-1.jpg"
  },
  {
    title: "Deposit Product",
    image: "https://www.turkishbank.co.uk/wp-content/uploads/2025/07/slider-en-1.jpg"
  },
  {
    title: "Debit Cards",
    image: "https://www.turkishbank.co.uk/wp-content/uploads/2025/07/slider-en-1.jpg"
  }
];
let slideIndex = 0;
let allTransactions = [];
let currentUser = null;
let latestAdminSummary = null;
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

  setText("#accountName", user.firstName);
  setText("#accountProduct", user.account.type);
  setText("#accountBalance", formatMoney(user.account.balance, user.account.currency));
  setText("#accountNumber", user.account.number);
  setText("#sortCode", user.account.sortCode);
  setText("#accountStatus", user.account.status || "Active");
  setText("#accountIban", user.account.iban || `GB82TBUK237548${user.account.number}`);
  setText("#accountProductDetail", user.account.type);
  setText("#accountEmail", user.email || "-");
  setText("#accountPhone", user.application?.phone || "-");

  const openedDate = user.account.openedAt
    ? new Date(user.account.openedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";
  setText("#accountOpened", openedDate);
  setText("#accountCurrency", user.account.currency || "GBP");
  setText("#accountAddress", user.application?.address || "-");
  setText("#cardStatus", user.account.cardStatus || "Active");
  setText("#dailyTransferLimit", formatMoney(user.account.dailyTransferLimit || 1000, user.account.currency));
  setText("#cardPreviewName", user.firstName);
  setText("#cardPreviewNumber", `**** **** **** ${String(user.account.number).slice(-4)}`);
  setText("#savedPayeesCount", String((user.beneficiaries || []).length));
  setText("#pendingPayments", String((user.transactions || []).filter((t) => t.status === "Pending").length));
  setText("#lastLoginAt", user.security?.lastLoginAt ? new Date(user.security.lastLoginAt).toLocaleString("en-GB") : "First access");
  setText("#failedAttemptsBadge", `${Number(user.security?.failedLoginAttempts || 0)} failed attempts`);
  setText("#securitySummary", user.security?.lastLoginAt ? "Recent sign-in recorded. Keep your password private." : "Your first online banking session is active.");
  renderAuditList(user.auditLog || []);

  if (cardStatusSelect) cardStatusSelect.value = user.account.cardStatus || "Active";
  if (dailyTransferLimitInput) dailyTransferLimitInput.value = user.account.dailyTransferLimit || 1000;

  allTransactions = user.transactions || [];
  renderTransactions(allTransactions, user.account.currency);
  renderBeneficiaries(user.beneficiaries || []);
  currentUser = user;
  setStatus("");
  loadPersistenceStatus();
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
        <span>${new Date(entry.createdAt).toLocaleString("en-GB")}${entry.note ? ` - ${escapeHtml(entry.note)}` : ""}</span>
      </article>
    `).join("")}
  `;
}

async function loadPersistenceStatus() {
  try {
    const data = await apiRequest("/api/admin/persistence", { auth: false });
    setText("#storageMode", data.database.persistent ? "Persistent" : "Session");
  } catch (error) {
    setText("#storageMode", "Unavailable");
  }
}

function buildDashboardUrl() {
  return "/dashboard.html";
}

function goToLoading(message, next = buildDashboardUrl()) {
  sessionStorage.setItem("bankLoadingMessage", message);
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
        <button class="primary-button modal-close-action" type="button">Done</button>
      </div>
    </div>
  `);
  modalPanel?.querySelector(".modal-close")?.addEventListener("click", closeModal);
  modalPanel?.querySelector(".modal-close-action")?.addEventListener("click", closeModal);
}

function showTransactionReceipt(user) {
  const transaction = user.transactions?.[0];

  if (!transaction) return;

  openReceiptModal({
    title: `${transaction.type} Confirmation`,
    status: transaction.status === "Pending" ? "Payment scheduled and awaiting processing." : "Transaction completed successfully.",
    rows: [
      { label: "Reference", value: transaction.reference || "Completed" },
      { label: "Amount", value: formatMoney(Math.abs(transaction.amount), user.account.currency) },
      { label: "Balance After", value: formatMoney(transaction.balanceAfter, user.account.currency) },
      ...(transaction.scheduledFor ? [{ label: "Scheduled For", value: new Date(transaction.scheduledFor).toLocaleDateString("en-GB") }] : []),
      { label: "Date", value: new Date(transaction.createdAt).toLocaleString("en-GB") }
    ]
  });
}

function renderTransactions(transactions, currency) {
  if (!transactionList) return;
  const visibleTransactions = transactions.filter((transaction) => transaction.type !== "Account Opening");
  if (!visibleTransactions.length) {
    transactionList.innerHTML = `<p class="form-note">No account activity yet.</p>`;
    return;
  }
  transactionList.innerHTML = visibleTransactions.map((transaction) => {
    const isPositive = transaction.amount >= 0;
    const amountClass = isPositive ? "is-positive" : "is-negative";
    const date = new Date(transaction.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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
          ${transaction.scheduledFor ? `<small>Scheduled for ${new Date(transaction.scheduledFor).toLocaleDateString("en-GB")}</small>` : ""}
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
    beneficiaryList.innerHTML = `<p class="form-note">No saved payees yet.</p>`;
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

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP" }).format(value);
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

function formatAuditAction(action) {
  return String(action || "Activity")
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
    setStatus("Your account has been opened. Login with the password you created.", true);
    sessionStorage.removeItem("pendingLoginEmail");
  }
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
  const users = searchTerm
    ? data.users.filter((user) => [user.name, user.email, user.accountNumber, user.status].join(" ").toLowerCase().includes(searchTerm))
    : data.users;

  adminMetrics.innerHTML = [
    ["Accounts", data.totals.accounts],
    ["Pending", data.totals.pending || 0],
    ["Active", data.totals.active || 0],
    ["Frozen", data.totals.frozen || 0],
    ["Total Balance", formatMoney(data.totals.balance, "GBP")],
    ["Transactions", data.totals.transactions],
    ["Storage", data.database.persistent ? "Persistent" : "Session"]
  ].map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");

  adminUsers.innerHTML = users.map((user) => `
    <article class="admin-row">
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.email)} &middot; ${escapeHtml(user.accountNumber || "Pending account")} &middot; ${escapeHtml(user.status)}</span>
        <span>Application: ${escapeHtml(user.applicationStatus || "Not started")}${user.decisionReason ? ` &middot; ${escapeHtml(user.decisionReason)}` : ""}</span>
        <div class="audit-mini">
          ${(user.auditLog || []).slice(0, 3).map((entry) => `<small>${escapeHtml(formatAuditAction(entry.action))} &middot; ${new Date(entry.createdAt).toLocaleDateString("en-GB")}</small>`).join("")}
        </div>
      </div>
      <div class="admin-row-actions">
        <span>${formatMoney(user.balance, "GBP")}</span>
        ${user.status === "Pending Approval" ? `<button class="primary-button admin-action-btn" data-admin-action="approve" data-email="${escapeHtml(user.email)}" type="button">Approve</button>` : ""}
        ${user.status === "Pending Approval" ? `<button class="text-button admin-action-btn" data-admin-action="reject" data-email="${escapeHtml(user.email)}" type="button">Reject</button>` : ""}
        ${user.status === "Active" ? `<button class="text-button admin-action-btn" data-admin-action="freeze" data-email="${escapeHtml(user.email)}" type="button">Freeze</button>` : ""}
        ${user.status === "Frozen" ? `<button class="primary-button admin-action-btn" data-admin-action="reactivate" data-email="${escapeHtml(user.email)}" type="button">Reactivate</button>` : ""}
      </div>
    </article>
  `).join("") || `<p class="form-note">No accounts yet.</p>`;

  adminTransactions.innerHTML = data.recentTransactions.map((transaction) => `
    <article class="admin-row">
      <div>
        <strong>${escapeHtml(transaction.type)}</strong>
        <span>${escapeHtml(transaction.reference || "PENDING")} &middot; ${escapeHtml(transaction.description || "")}</span>
      </div>
      <div>${formatMoney(transaction.amount, "GBP")}</div>
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
    goToLoading("Verifying credentials and preparing your dashboard...");
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
    window.setTimeout(() => {
      sessionStorage.removeItem("bankLoadingMessage");
      window.location.assign(next);
    }, 1200);
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
      <h1>Waiting for admin approval</h1>
      <p class="form-note">Your application has been received. An administrator must approve it before online banking access is available.</p>
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
        <a class="text-button receipt-link" href="/admin.html">Admin Console</a>
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
      const decided = app.decidedAt ? ` Reviewed ${new Date(app.decidedAt).toLocaleString("en-GB")}.` : "";
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
  branchResult.textContent = `${selectedBranch} selected. Branch details would open from TurkishBank UK in the live site.`;
});

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = newsletterForm.querySelector("input")?.value.trim() || "";
  newsletterResult.textContent = `Thank you. ${email} has been added to the contact list.`;
  newsletterForm.reset();
});

transactionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Processing transaction...");
  try {
    const data = await apiRequest("/api/account/transactions", {
      method: "POST",
      body: JSON.stringify(formToJson(transactionForm))
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
  if (!hero || !heroTitle) return;
  const slide = slides[slideIndex];
  hero.style.backgroundImage = `linear-gradient(90deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0)), url("${slide.image}")`;
  heroTitle.textContent = slide.title;
  sliderDots.forEach((dot, index) => dot.classList.toggle("is-active", index === slideIndex));
}

sliderButtons.forEach((button) => {
  button.addEventListener("click", () => {
    slideIndex = (slideIndex + (button.classList.contains("slider-arrow--right") ? 1 : -1) + slides.length) % slides.length;
    renderSlide();
  });
});

sliderDots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    slideIndex = index;
    renderSlide();
  });
});

updateTransferFields();
showSignupStep(0);
renderSlide();
hydrateLoginPage();
restoreSession();

