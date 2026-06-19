const fs = require("fs");
const path = require("path");

const passwordHash =
  "a739cb44fc755d20b0503d3461cc0840:1dfd09a3ce9ffc9a49f5262cb2168ff4581bdb99ba5a2426fe681e19c4df04c978396d8beaffc5216e21f57ddf44c274e560636d035f637112dd9918a72c4fd5";

const OPENING_DEPOSIT_AMOUNT = 7600;
const OPENING_DEPOSIT_DATE = "2026-05-21T11:42:00.000Z";

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
    id: "tx-opening-deposit-001",
    type: "Deposit",
    description: "Opening deposit",
    amount: OPENING_DEPOSIT_AMOUNT,
    balanceAfter: OPENING_DEPOSIT_AMOUNT,
    createdAt: OPENING_DEPOSIT_DATE,
    scheduledFor: "",
    status: "Completed",
    reference: "DEP21MAY804207",
    category: "Incoming Payment",
    tags: ["credit", "demo"]
  }
];

const database = {
  schemaVersion: 3,
  updatedAt: new Date().toISOString(),
  users: [
    {
      id: "acct-daniel-001",
      firstName: "ALEX",
      lastName: "MORGAN",
      email: "demo.customer@example.com",
      password: passwordHash,
      application: {
        product: "Checking Account",
        phone: "555-0102",
        address: "100 Demo Avenue, New York, NY 10001",
        dateOfBirth: "1985-03-14",
        employmentStatus: "Employed",
        status: "Approved",
        decisionReason: "",
        submittedAt: "2024-11-08T11:20:00.000Z",
        decidedAt: "2024-11-12T09:00:00.000Z"
      },
      account: {
        type: "Checking Account",
        number: "80420742",
        sortCode: "026009593",
        currency: "USD",
        balance: OPENING_DEPOSIT_AMOUNT,
        openedAt: "2024-11-12T09:15:00.000Z",
        status: "Active",
        iban: "ASAVUS33000080420742",
        dailyTransferLimit: 2500,
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
          note: "Opening deposit - DEP21MAY804207",
          createdAt: OPENING_DEPOSIT_DATE
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
