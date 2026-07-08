const crypto = require("crypto");
const net = require("net");
const tls = require("tls");
const { readDatabase, writeDatabase } = require("./databaseService");

function buildApprovalEmail(user) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const subject = "Allied Savings account opening approved";
  const lines = [
    `Dear ${fullName},`,
    "",
    "We are pleased to confirm that your Allied Savings account opening application has been approved.",
    "",
    "Your account is now active for online banking.",
    "",
    `Account holder: ${fullName}`,
    `Account number: ${user.account.number}`,
    `Routing number: ${user.account.routingNumber}`,
    `Product: ${user.account.type}`,
    `Available balance: ${formatMoney(user.account.balance, user.account.currency)}`,
    "",
    "For your security, please keep your login details private and contact Allied Savings immediately if you do not recognize this account opening.",
    "",
    "Kind regards,",
    "Allied Savings Operations"
  ];

  return {
    subject,
    text: lines.join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.55">
        <p>Dear ${escapeHtml(fullName)},</p>
        <p>We are pleased to confirm that your Allied Savings account opening application has been approved.</p>
        <p>Your account is now active for online banking.</p>
<table style="border-collapse:collapse;margin:18px 0">
           ${emailRow("Account holder", fullName)}
           ${emailRow("Account number", user.account.number)}
           ${emailRow("Routing number", user.account.routingNumber)}
           ${emailRow("Product", user.account.type)}
           ${emailRow("Available balance", formatMoney(user.account.balance, user.account.currency))}
         </table>
        <p>For your security, please keep your login details private and contact Allied Savings immediately if you do not recognize this account opening.</p>
        <p>Kind regards,<br>Allied Savings Operations</p>
      </div>
    `.trim()
  };
}

function buildLoginVerificationEmail(user, code) {
  const fullName = `${user.firstName} ${user.lastName}`.trim() || "Customer";
  const subject = "Your Allied Savings sign-in verification code";
  const lines = [
    `Dear ${fullName},`,
    "",
    "Use the verification code below to complete your Allied Savings online banking sign-in.",
    "",
    `Verification code: ${code}`,
    "",
    "This code expires in 10 minutes. If you did not try to sign in, please change your password and contact Allied Savings support immediately.",
    "",
    "Kind regards,",
    "Allied Savings Security"
  ];

  return {
    subject,
    text: lines.join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.55">
        <p>Dear ${escapeHtml(fullName)},</p>
        <p>Use the verification code below to complete your Allied Savings online banking sign-in.</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:22px 0;color:#14345a">${escapeHtml(code)}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not try to sign in, please change your password and contact Allied Savings support immediately.</p>
        <p>Kind regards,<br>Allied Savings Security</p>
      </div>
    `.trim()
  };
}

function buildPendingTransactionEmail(transaction, customer) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const subject = `Pending transaction approval needed - ${customer.firstName} ${customer.lastName}`;
  const amount = formatMoney(Math.abs(Number(transaction.amount || 0)), "USD");
  const type = transaction.type || "Transaction";
  const reference = transaction.reference || transaction.id;

  const lines = [
    `Dear Admin,`,
    "",
    "A new transaction requires your approval.",
    "",
    `Customer: ${fullName}`,
    `Email: ${customer.email}`,
    `Account: ${customer.account?.number || "N/A"}`,
    `Type: ${type}`,
    `Description: ${transaction.description || "No description"}`,
    `Amount: ${amount}`,
    `Reference: ${reference}`,
    `Created: ${new Date(transaction.createdAt).toLocaleString("en-US")}`,
    "",
    "Please log in to the admin panel to review and approve or deny this transaction.",
    "",
    "Kind regards,",
    "Allied Savings Operations"
  ];

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.55">
      <p>Dear Admin,</p>
      <p>A new transaction requires your approval.</p>
      <table style="border-collapse:collapse;margin:18px 0">
        ${emailRow("Customer", fullName)}
        ${emailRow("Email", customer.email)}
        ${emailRow("Account", customer.account?.number || "N/A")}
        ${emailRow("Type", type)}
        ${emailRow("Description", transaction.description || "No description")}
        ${emailRow("Amount", amount)}
        ${emailRow("Reference", reference)}
        ${emailRow("Created", new Date(transaction.createdAt).toLocaleString("en-US"))}
      </table>
      <p>Please log in to the admin panel to review and approve or deny this transaction.</p>
      <p>Kind regards,<br>Allied Savings Operations</p>
    </div>
  `.trim();

  return { subject, text: lines.join("\n"), html };
}

async function queueTransactionNotification(transaction, customer) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM || process.env.SMTP_FROM;

  if (!adminEmail) {
    return null;
  }

  const database = await readDatabase();
  const message = buildPendingTransactionEmail(transaction, customer);
  const emailProvider = getEmailProvider();
  const outboxEntry = {
    id: crypto.randomUUID(),
    type: "PENDING_TRANSACTION",
    status: "Queued",
    to: adminEmail,
    subject: message.subject,
    text: message.text,
    html: message.html,
    createdAt: new Date().toISOString(),
    sentAt: "",
    provider: emailProvider || "local-outbox",
    error: ""
  };

  database.emailOutbox = database.emailOutbox || [];
  database.emailOutbox.unshift(outboxEntry);
  await writeDatabase(database);

  if (emailProvider) {
    try {
      await sendEmail({
        to: outboxEntry.to,
        subject: outboxEntry.subject,
        text: outboxEntry.text,
        html: outboxEntry.html
      });

      outboxEntry.status = "Sent";
      outboxEntry.sentAt = new Date().toISOString();
      await writeDatabase(database);
    } catch (error) {
      outboxEntry.status = "Failed";
      outboxEntry.error = error.message || "Email delivery failed";
      await writeDatabase(database);
      console.error("Email delivery failed:", outboxEntry.error);
    }
  }

  return outboxEntry;
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
  const emailProvider = getEmailProvider();
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
    provider: emailProvider || "local-outbox",
    error: ""
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

  if (emailProvider) {
    try {
      await sendEmail({
        to: outboxEntry.to,
        subject: outboxEntry.subject,
        text: outboxEntry.text,
        html: outboxEntry.html
      });

      outboxEntry.status = "Sent";
      outboxEntry.sentAt = new Date().toISOString();
      await writeDatabase(database);
    } catch (error) {
      outboxEntry.status = "Failed";
      outboxEntry.error = error.message || "Email delivery failed";
      await writeDatabase(database);
      console.error("Email delivery failed:", outboxEntry.error);
    }
  }

  return outboxEntry;
}

async function queueLoginVerificationEmail(user, code) {
  const database = await readDatabase();
  const storedUser = (database.users || []).find((item) => item.id === user.id);

  if (!storedUser) {
    throw statusError(404, "Account was not found");
  }

  database.emailOutbox = database.emailOutbox || [];

  const message = buildLoginVerificationEmail(storedUser, code);
  const emailProvider = getEmailProvider();
  const outboxEntry = {
    id: crypto.randomUUID(),
    type: "LOGIN_VERIFICATION",
    status: "Queued",
    to: storedUser.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    createdAt: new Date().toISOString(),
    sentAt: "",
    provider: emailProvider || "local-outbox",
    error: ""
  };

  database.emailOutbox.unshift(outboxEntry);
  storedUser.auditLog = storedUser.auditLog || [];
  storedUser.auditLog.unshift({
    id: crypto.randomUUID(),
    action: "LOGIN_VERIFICATION_QUEUED",
    note: outboxEntry.id,
    createdAt: outboxEntry.createdAt
  });

  await writeDatabase(database);

  if (emailProvider) {
    try {
      await sendEmail({
        to: outboxEntry.to,
        subject: outboxEntry.subject,
        text: outboxEntry.text,
        html: outboxEntry.html
      });

      outboxEntry.status = "Sent";
      outboxEntry.sentAt = new Date().toISOString();
      await writeDatabase(database);
    } catch (error) {
      outboxEntry.status = "Failed";
      outboxEntry.error = error.message || "Email delivery failed";
      await writeDatabase(database);
      console.error("Email delivery failed:", outboxEntry.error);
    }
  }

  return outboxEntry;
}

async function queueCustomEmail({ to, subject, text, html, from }) {
  if (!to || !subject || !text) {
    throw statusError(400, "Missing required email fields: to, subject, and text are required");
  }

  const database = await readDatabase();
  const emailProvider = getEmailProvider();
  const outboxEntry = {
    id: crypto.randomUUID(),
    type: "CUSTOM_ADMIN_EMAIL",
    status: "Queued",
    to: String(to).trim(),
    subject: String(subject).trim(),
    text: String(text),
    html: String(html || ""),
    from: from ? String(from).trim() : "",
    createdAt: new Date().toISOString(),
    sentAt: "",
    provider: emailProvider || "local-outbox",
    error: ""
  };

  database.emailOutbox = database.emailOutbox || [];
  database.emailOutbox.unshift(outboxEntry);
  await writeDatabase(database);

  if (emailProvider) {
    try {
      await sendEmail({
        to: outboxEntry.to,
        subject: outboxEntry.subject,
        text: outboxEntry.text,
        html: outboxEntry.html || undefined,
        from: outboxEntry.from || undefined
      });

      outboxEntry.status = "Sent";
      outboxEntry.sentAt = new Date().toISOString();
      await writeDatabase(database);
    } catch (error) {
      outboxEntry.status = "Failed";
      outboxEntry.error = error.message || "Email delivery failed";
      await writeDatabase(database);
      console.error("Email delivery failed:", outboxEntry.error);
    }
  }

  return outboxEntry;
}

function hasSmtpConfig() {
  return Boolean(getEmailProvider());
}

function getEmailProvider() {
  if (process.env.DISABLE_SMTP === "true") {
    return "";
  }
  if (process.env.RESEND_API_KEY) {
    return "resend";
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return "smtp";
  }
  return "";
}

async function sendEmail(message) {
  if (process.env.RESEND_API_KEY) {
    return sendResendMail(message);
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return sendSmtpMail(message);
  }
  throw new Error("Email delivery is not configured");
}

async function sendResendMail(message) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = message.from || process.env.RESEND_FROM || process.env.SMTP_FROM || "";
  const fromName = message.fromName || process.env.RESEND_FROM_NAME || process.env.SMTP_FROM_NAME || "Allied Savings Operations";

  if (!from) {
    throw new Error("Email 'from' address is not configured. Set RESEND_FROM to a verified Resend sender.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${fromName} <${from}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

async function sendSmtpMail(message) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || username;
  const fromName = process.env.SMTP_FROM_NAME || "Allied Savings Operations";
  const client = await createSmtpClient({ host, port, secure });

  try {
    await client.expect([220]);
    await client.command(`EHLO ${getSmtpClientName()}`, [250]);

    if (!secure) {
      await client.command("STARTTLS", [220]);
      await client.upgradeToTls(host);
      await client.command(`EHLO ${getSmtpClientName()}`, [250]);
    }

    await client.command("AUTH LOGIN", [334]);
    await client.command(Buffer.from(username).toString("base64"), [334]);
    await client.command(Buffer.from(password).toString("base64"), [235]);
    await client.command(`MAIL FROM:<${from}>`, [250]);
    await client.command(`RCPT TO:<${message.to}>`, [250, 251]);
    await client.command("DATA", [354]);
    await client.command(buildMimeMessage({ ...message, from, fromName }), [250], true);
    await client.command("QUIT", [221]);
  } finally {
    client.close();
  }
}

function createSmtpClient({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 15000);
    const client = buildLineClient(socket);

    socket.setTimeout(timeoutMs);
    if (secure) {
      socket.once("secureConnect", () => resolve(client));
    } else {
      socket.once("connect", () => resolve(client));
    }
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timed out"));
    });
  });
}

function buildLineClient(initialSocket) {
  let buffer = "";
  let socket = initialSocket;
  const waiters = [];

  attachSocketListeners(socket);

  function attachSocketListeners(activeSocket) {
    activeSocket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      drainResponses();
    });

    activeSocket.on("error", (error) => {
      rejectWaiters(error);
    });
  }

  function rejectWaiters(error) {
    while (waiters.length) waiters.shift().reject(error);
  }

  function drainResponses() {
    while (waiters.length) {
      const response = readCompleteResponse();
      if (!response) return;
      waiters.shift().resolve(response);
    }
  }

  function readCompleteResponse() {
    const lines = buffer.split(/\r?\n/);
    const completeIndex = lines.findIndex((line) => /^\d{3} /.test(line));

    if (completeIndex === -1) return null;

    const responseLines = lines.slice(0, completeIndex + 1);
    buffer = lines.slice(completeIndex + 1).join("\n");
    return responseLines.join("\n");
  }

  async function expect(allowedCodes) {
    const response = await new Promise((resolve, reject) => {
      waiters.push({ resolve, reject });
      drainResponses();
    });
    const code = Number(response.slice(0, 3));

    if (!allowedCodes.includes(code)) {
      throw new Error(`SMTP server responded ${code}: ${response}`);
    }

    return response;
  }

  return {
    close() {
      socket.end();
    },
    async command(value, allowedCodes, raw = false) {
      socket.write(raw ? value : `${value}\r\n`);
      return expect(allowedCodes);
    },
    expect,
    async upgradeToTls(host) {
      socket.removeAllListeners("data");
      socket.removeAllListeners("error");

      await new Promise((resolve, reject) => {
        const tlsSocket = tls.connect({ socket, servername: host }, () => {
          socket = tlsSocket;
          attachSocketListeners(socket);
          resolve();
        });

        tlsSocket.once("error", (error) => {
          rejectWaiters(error);
          reject(error);
        });
      });
    }
  };
}

function buildMimeMessage({ from, fromName, to, subject, text, html }) {
  const boundary = `bank-portal-${crypto.randomUUID()}`;

  return [
    `From: ${formatAddress(fromName, from)}`,
    `To: ${formatAddress("", to)}`,
    `Subject: ${escapeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeMessageBody(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeMessageBody(html),
    `--${boundary}--`,
    ".",
    ""
  ].join("\r\n");
}

function formatAddress(name, email) {
  return name ? `"${escapeHeader(name)}" <${email}>` : `<${email}>`;
}

function normalizeMessageBody(value) {
  return String(value || "").replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function escapeHeader(value) {
  return String(value || "").replace(/[\r\n"]/g, "");
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function getSmtpClientName() {
  return process.env.SMTP_CLIENT_NAME || "localhost";
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

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value || 0));
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
  buildLoginVerificationEmail,
  buildPendingTransactionEmail,
  getLatestApprovalEmail,
  queueApprovalEmail,
  queueLoginVerificationEmail,
  queueTransactionNotification,
  queueCustomEmail
};
