const tokenKey = "schoolBankToken";

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
const isDashboardPage = document.body.dataset.page === "dashboard";

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

  setText("#accountName", `${user.firstName} ${user.lastName}`);
  setText("#accountProduct", user.account.type);
  setText("#accountBalance", formatMoney(user.account.balance, user.account.currency));
  setText("#accountNumber", user.account.number);
  setText("#sortCode", user.account.sortCode);
  setText("#accountStatus", user.account.status || "Active");
  setText("#accountIban", user.account.iban || `GB82TBUK237548${user.account.number}`);
  setText("#accountProductDetail", user.account.type);
  setText("#accountEmail", user.email || "—");
  setText("#accountPhone", user.application?.phone || "—");

  const openedDate = user.account.openedAt
    ? new Date(user.account.openedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  setText("#accountOpened", openedDate);
  setText("#accountCurrency", user.account.currency || "GBP");
  setText("#accountAddress", user.application?.address || "-");
  setText("#cardStatus", user.account.cardStatus || "Active");
  setText("#dailyTransferLimit", formatMoney(user.account.dailyTransferLimit || 1000, user.account.currency));

  if (cardStatusSelect) cardStatusSelect.value = user.account.cardStatus || "Active";
  if (dailyTransferLimitInput) dailyTransferLimitInput.value = user.account.dailyTransferLimit || 1000;

  allTransactions = user.transactions || [];
  renderTransactions(allTransactions, user.account.currency);
  renderBeneficiaries(user.beneficiaries || []);
  currentUser = user;
  setStatus("");
}

function renderTransactions(transactions, currency) {
  if (!transactionList) return;
  if (!transactions.length) {
    transactionList.innerHTML = `<p class="form-note">No account activity yet.</p>`;
    return;
  }
  transactionList.innerHTML = transactions.map((transaction) => {
    const isPositive = transaction.amount >= 0;
    const amountClass = isPositive ? "is-positive" : "is-negative";
    const date = new Date(transaction.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const removable = transaction.type !== "Account Opening";
    const removeBtn = removable
      ? `<button class="tx-remove-btn" data-tx-delete="${escapeHtml(transaction.id)}" title="Remove transaction">&#128465;</button>`
      : "";
    return `
      <article class="transaction-item" data-tx-id="${escapeHtml(transaction.id)}">
        <div>
          <strong>${escapeHtml(transaction.type)}</strong>
          <span>${escapeHtml(transaction.description)}</span>
          <small>${date} &middot; ${escapeHtml(transaction.status)} &middot; ${escapeHtml(transaction.reference || "PENDING")}</small>
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
    input.required = isTransfer && !beneficiarySelect?.value;
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
  if (!window.confirm("Remove this transaction?")) return;
  btn.disabled = true;
  btn.textContent = "…";
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
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  if (e.key === "Escape" && !modalBackdrop.classList.contains("is-hidden")) closeModal();
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
      <label>New password<input name="newPassword" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Confirm new password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
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
    setModalStatus(statusEl, "Updating…");
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

function setModalStatus(el, msg) {
  if (el) el.textContent = msg;
}

if (settingsButton) settingsButton.addEventListener("click", showSettingsModal);
if (changePasswordButton) changePasswordButton.addEventListener("click", showChangePasswordModal);
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
    setStatus(error.message);
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
    showAllTransactionsBtn.textContent = "Loading…";
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

// ── Tab / auth / logout / restoreSession (unchanged) ───────────────────────

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
});

signupButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    showTab("signup");
  });
});

loginButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
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
    localStorage.setItem(tokenKey, data.token);
    signupForm.reset();
    window.location.assign("/dashboard.html");
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
    window.location.assign("/dashboard.html");
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
      window.location.assign("/#portal");
    } else {
      showTab("login");
      setStatus("You have been logged out.", true);
    }
  }
});

async function restoreSession() {
  if (!localStorage.getItem(tokenKey)) {
    if (isDashboardPage) window.location.assign("/#portal");
    return;
  }

  if (!isDashboardPage) {
    window.location.assign("/dashboard.html");
    return;
  }

  try {
    const data = await apiRequest("/api/account/me");
    showDashboard(data.user);
  } catch (error) {
    localStorage.removeItem(tokenKey);
    if (isDashboardPage) window.location.assign("/#portal");
  }
}

branchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedBranch = branchForm.querySelectorAll("select")[0]?.value || "—";
  branchResult.textContent = `${selectedBranch} selected. Branch details would open from TurkishBank UK in the live site.`;
});

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = newsletterForm.querySelector("input")?.value.trim() || "";
  newsletterResult.textContent = `Thank you. ${email} has been added to this local demo contact list.`;
  newsletterForm.reset();
});

transactionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Processing transaction…");
  try {
    const data = await apiRequest("/api/account/transactions", {
      method: "POST",
      body: JSON.stringify(formToJson(transactionForm))
    });
    transactionForm.reset();
    showDashboard(data.user);
    setStatus("Transaction completed.", true);
  } catch (error) {
    setStatus(error.message);
  }
});

// ── Slider ─────────────────────────────────────────────────────────────────

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
renderSlide();
restoreSession();
