const fs = require("fs");
const path = require("path");

const offshorePasswordHash =
  "8690c99f8d4566674bc3eacfa9e93807:e2dfde65a733134ea603f7e5ad38c976204372dca136a68d710cd00b037a080c1d99b53258fb32cc143c03491eee6d23b8216c139771b8b957dee8d114507643";
const kellyPasswordHash =
  "31c59e0c9636abca7dd3fbfc9e185c08:9672566b643950ce0df324d792d03ad0538f1f4aa15aa41eddb26fd7f37c5a03539803b78105063932b7c8ac9f1f8d80a3c93393bd10db83dd3a9ab1ec300f0e";

const OPENING_DEPOSIT_AMOUNT = 7600;
const KELLY_OPENING_DEPOSIT_AMOUNT = 5200;
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
    tags: ["credit", "savings"]
  }
];

const database = {
  schemaVersion: 5,
  updatedAt: new Date().toISOString(),
  users: [
    {
      id: "acct-offshore-001",
      firstName: "OFFSHORE",
      lastName: "A704",
      email: "offshorea704@gmail.com",
      password: offshorePasswordHash,
      application: {
        product: "Checking Account",
        phone: "555-0102",
        address: "425 Market Street, Dallas, TX 75202",
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
    },
    {
      id: "acct-kelly-001",
      firstName: "KELLY",
      lastName: "WALLACE",
      email: "kellywallace642@gmail.com",
      password: kellyPasswordHash,
      application: {
        product: "Checking Account",
        phone: "555-0164",
        address: "1200 Commerce Street, Dallas, TX 75202",
        dateOfBirth: "1988-07-19",
        employmentStatus: "Employed",
        status: "Approved",
        decisionReason: "",
        submittedAt: "2026-06-12T10:00:00.000Z",
        decidedAt: "2026-06-12T11:30:00.000Z"
      },
      account: {
        type: "Checking Account",
        number: "80421642",
        sortCode: "026009593",
        currency: "USD",
        balance: KELLY_OPENING_DEPOSIT_AMOUNT,
        openedAt: "2026-06-12T11:45:00.000Z",
        status: "Active",
        iban: "ASAVUS33000180421642",
        dailyTransferLimit: 2500,
        cardStatus: "Active",
        cardLastFour: "1642",
        cardExpiry: "10/29",
        overdraft: 0
      },
      beneficiaries: [],
      transactions: [
        {
          id: "tx-kelly-opening-001",
          type: "Account Opening",
          description: "Account opened",
          amount: 0,
          balanceAfter: 0,
          createdAt: "2026-06-12T11:45:00.000Z",
          scheduledFor: "",
          status: "Completed",
          reference: "OPENING",
          category: "Account",
          tags: []
        },
        {
          id: "tx-kelly-opening-deposit-001",
          type: "Deposit",
          description: "Opening deposit",
          amount: KELLY_OPENING_DEPOSIT_AMOUNT,
          balanceAfter: KELLY_OPENING_DEPOSIT_AMOUNT,
          createdAt: "2026-06-12T12:10:00.000Z",
          scheduledFor: "",
          status: "Completed",
          reference: "DEP12JUN804216",
          category: "Incoming Payment",
          tags: ["credit", "checking"]
        }
      ],
      notificationState: {
        readIds: [],
        readAtById: {}
      },
      preferences: {
        emailAlerts: true,
        smsAlerts: false,
        statementFrequency: "Monthly"
      },
      auditLog: [
        {
          id: "audit-kelly-deposit-001",
          action: "DEPOSIT_CREATED",
          note: "Opening deposit - DEP12JUN804216",
          createdAt: "2026-06-12T12:10:00.000Z"
        },
        {
          id: "audit-kelly-approved-001",
          action: "ACCOUNT_APPROVED",
          note: "",
          createdAt: "2026-06-12T11:30:00.000Z"
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
      createdAt: "2026-06-12T10:00:00.000Z"
    }
  ]
};

const target = path.join(__dirname, "..", "backend", "data", "database.json");
fs.writeFileSync(target, `${JSON.stringify(database, null, 2)}\n`);
console.log(`Wrote seed database to ${target}`);
