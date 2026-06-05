const crypto = require("crypto");
const { readDatabase, writeDatabase } = require("./databaseService");

function buildApprovalEmail(user) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const subject = "TurkishBank UK account opening approved";
  const lines = [
    `Dear ${fullName},`,
    "",
    "We are pleased to confirm that your TurkishBank UK account opening application has been approved.",
    "",
    "Your account is now active for online banking.",
    "",
    `Account holder: ${fullName}`,
    `Account number: ${user.account.number}`,
    `Sort code: ${user.account.sortCode}`,
    `IBAN: ${user.account.iban}`,
    `Product: ${user.account.type}`,
    `Available balance: ${formatMoney(user.account.balance, user.account.currency)}`,
    "",
    "For your security, please keep your login details private and contact TurkishBank UK immediately if you do not recognise this account opening.",
    "",
    "Kind regards,",
    "TurkishBank UK Operations"
  ];

  return {
    subject,
    text: lines.join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.55">
        <p>Dear ${escapeHtml(fullName)},</p>
        <p>We are pleased to confirm that your TurkishBank UK account opening application has been approved.</p>
        <p>Your account is now active for online banking.</p>
        <table style="border-collapse:collapse;margin:18px 0">
          ${emailRow("Account holder", fullName)}
          ${emailRow("Account number", user.account.number)}
          ${emailRow("Sort code", user.account.sortCode)}
          ${emailRow("IBAN", user.account.iban)}
          ${emailRow("Product", user.account.type)}
          ${emailRow("Available balance", formatMoney(user.account.balance, user.account.currency))}
        </table>
        <p>For your security, please keep your login details private and contact TurkishBank UK immediately if you do not recognise this account opening.</p>
        <p>Kind regards,<br>TurkishBank UK Operations</p>
      </div>
    `.trim()
  };
}

async function queueApprovalEmail(email) {
  const database = await readDatabase();
  const user = (database.users || []).find((item) => item.email === String(email || "").trim().toLowerCase());

  if (!user) {
    throw statusError(404, "Account was not found");
  }

  if (user.account?.status !== "Active") {
    throw statusError(400, "Only active approved accounts can receive an approval email");
  }

  database.emailOutbox = database.emailOutbox || [];

  const message = buildApprovalEmail(user);
  const outboxEntry = {
    id: crypto.randomUUID(),
    type: "ACCOUNT_APPROVAL",
    status: "Queued",
    to: user.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    createdAt: new Date().toISOString(),
    sentAt: "",
    provider: process.env.SMTP_HOST ? "smtp" : "local-outbox"
  };

  database.emailOutbox.unshift(outboxEntry);
  user.auditLog = user.auditLog || [];
  user.auditLog.unshift({
    id: crypto.randomUUID(),
    action: "APPROVAL_EMAIL_QUEUED",
    note: outboxEntry.id,
    createdAt: outboxEntry.createdAt
  });
  user.notificationState = user.notificationState || { readIds: [], readAtById: {} };

  await writeDatabase(database);

  return outboxEntry;
}

function getLatestApprovalEmail(user, database) {
  return (database.emailOutbox || []).find((entry) => (
    entry.type === "ACCOUNT_APPROVAL" &&
    entry.to === user.email
  ));
}

function emailRow(label, value) {
  return `
    <tr>
      <th style="border:1px solid #ddd;background:#f7f7f7;text-align:left;padding:8px 10px">${escapeHtml(label)}</th>
      <td style="border:1px solid #ddd;padding:8px 10px">${escapeHtml(value)}</td>
    </tr>
  `;
}

function formatMoney(value, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  buildApprovalEmail,
  getLatestApprovalEmail,
  queueApprovalEmail
};
