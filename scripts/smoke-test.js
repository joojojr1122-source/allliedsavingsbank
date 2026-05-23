const assert = require("assert");
const { readDatabase } = require("../backend/src/services/databaseService");
const { settleDueScheduledTransfers } = require("../backend/src/services/userService");
const { verifyPassword } = require("../backend/src/utils/security");

(async () => {
  const database = await readDatabase();
  const users = database.users || [];
  const activeUser = users.find((user) => user.email === "daniel.nowak@outlook.com");

  assert(activeUser, "seeded customer account exists");
  assert.strictEqual(activeUser.firstName, "DANIEL");
  assert.strictEqual(activeUser.lastName, "NOWAK");
  assert.strictEqual(activeUser.account.status, "Active");
  assert.strictEqual(activeUser.account.balance, 7600000);
  assert(verifyPassword("Nowak@4142", activeUser.password), "seeded customer password verifies");
  const vanmasPayment = activeUser.transactions.find((transaction) => transaction.description === "VANMAS DMCC");
  assert(vanmasPayment, "Vanmas DMCC payment exists");
  assert.strictEqual(vanmasPayment.amount, 7600000);
  assert.strictEqual(vanmasPayment.createdAt.slice(0, 10), "2026-05-21");
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
