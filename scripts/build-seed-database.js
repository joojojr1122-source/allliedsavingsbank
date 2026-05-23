const fs = require("fs");
const path = require("path");

const passwordHash =
  "a739cb44fc755d20b0503d3461cc0840:1dfd09a3ce9ffc9a49f5262cb2168ff4581bdb99ba5a2426fe681e19c4df04c978396d8beaffc5216e21f57ddf44c274e560636d035f637112dd9918a72c4fd5";

const VANMAS_AMOUNT = 7600000;
const VANMAS_DATE = "2026-05-21T11:42:00.000Z";

const transactions = [
  {
    id: "tx-opening-001",
    type: "Account Opening",
    description: "Account opened",
    amount: 0,
    balanceAfter: 0,
    createdAt: "2024-11-12T09:15:00.000Z",
    scheduledFor: "",
    status: "Completed",
    reference: "OPENING",
    category: "Account",
    tags: []
  },
  {
    id: "tx-vanmas-001",
    type: "Deposit",
    description: "VANMAS DMCC",
    amount: VANMAS_AMOUNT,
    balanceAfter: VANMAS_AMOUNT,
    createdAt: VANMAS_DATE,
    scheduledFor: "",
    status: "Completed",
    reference: "FP21MAY804207",
    category: "Incoming Payment",
    tags: ["credit", "international"]
  }
];

const database = {
  schemaVersion: 2,
  updatedAt: new Date().toISOString(),
  users: [
    {
      id: "acct-daniel-001",
      firstName: "DANIEL",
      lastName: "NOWAK",
      email: "daniel.nowak@outlook.com",
      password: passwordHash,
      application: {
        product: "Current Account",
        phone: "07700 900482",
        address: "22 Canary Wharf, London E14 5AB",
        dateOfBirth: "1985-03-14",
        employmentStatus: "Employed",
        status: "Approved",
        decisionReason: "",
        submittedAt: "2024-11-08T11:20:00.000Z",
        decidedAt: "2024-11-12T09:00:00.000Z"
      },
      account: {
        type: "Current Account",
        number: "80420742",
        sortCode: "23-75-48",
        currency: "GBP",
        balance: VANMAS_AMOUNT,
        openedAt: "2024-11-12T09:15:00.000Z",
        status: "Active",
        iban: "GB82TBUK23754880420742",
        dailyTransferLimit: 250000,
        cardStatus: "Active",
        cardLastFour: "4821",
        cardExpiry: "08/28",
        overdraft: 0
      },
      beneficiaries: [],
      transactions,
      notificationState: {
        readIds: [],
        readAtById: {}
      },
      preferences: {
        emailAlerts: true,
        smsAlerts: true,
        statementFrequency: "Monthly"
      },
      auditLog: [
        {
          id: "audit-login-001",
          action: "LOGIN_SUCCESS",
          note: "Web browser",
          createdAt: "2026-05-22T18:42:00.000Z"
        },
        {
          id: "audit-deposit-001",
          action: "DEPOSIT_CREATED",
          note: "VANMAS DMCC · FP21MAY804207",
          createdAt: VANMAS_DATE
        },
        {
          id: "audit-approved-001",
          action: "ACCOUNT_APPROVED",
          note: "",
          createdAt: "2024-11-12T09:00:00.000Z"
        }
      ],
      security: {
        lastLoginAt: "2026-05-22T18:42:00.000Z",
        failedLoginAttempts: 0,
        lockedUntil: ""
      },
      createdAt: "2024-11-08T11:20:00.000Z"
    }
  ]
};

const target = path.join(__dirname, "..", "backend", "data", "database.json");
fs.writeFileSync(target, `${JSON.stringify(database, null, 2)}\n`);
console.log(`Wrote seed database to ${target}`);
