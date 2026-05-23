const assert = require("assert");
const { readDatabase } = require("../backend/src/services/databaseService");
const { settleDueScheduledTransfers } = require("../backend/src/services/userService");
const { verifyPassword } = require("../backend/src/utils/security");

(async () => {
  const database = await readDatabase();
  const users = database.users || [];
  const activeUser = users.find((user) => user.email === "a.demir@outlook.com");

  assert(activeUser, "seeded customer account exists");
  assert.strictEqual(activeUser.account.status, "Active");
  assert.strictEqual(activeUser.account.balance, 3247.63);
  assert(verifyPassword("DemoPass123", activeUser.password), "seeded customer password verifies");
  assert(activeUser.beneficiaries.length >= 2, "seeded account has saved payees");
  assert(activeUser.transactions.some((transaction) => transaction.type === "Transfer"), "seeded account has transfer history");
  assert(activeUser.auditLog.length > 0, "audit log exists");

  const scheduledUser = {
    account: { status: "Active", balance: 100, number: "12345678" },
    application: {},
    transactions: [
      {
        id: "due-ok",
        type: "Transfer",
        amount: -25,
        balanceAfter: 100,
        scheduledFor: "2026-05-22",
        status: "Pending",
        reference: "SCH-OK"
      },
      {
        id: "due-fail",
        type: "Transfer",
        amount: -200,
        balanceAfter: 75,
        scheduledFor: "2026-05-22",
        status: "Pending",
        reference: "SCH-FAIL"
      }
    ],
    auditLog: []
  };

  assert(settleDueScheduledTransfers(scheduledUser, new Date("2026-05-23T09:00:00.000Z")), "due scheduled transfers settle");
  assert.strictEqual(scheduledUser.account.balance, 75, "successful scheduled transfer updates balance");
  assert.strictEqual(scheduledUser.transactions[0].status, "Completed");
  assert.strictEqual(scheduledUser.transactions[1].status, "Failed");
  assert.strictEqual(scheduledUser.transactions[1].balanceAfter, 75);

  console.log("Smoke tests passed.");
})();
