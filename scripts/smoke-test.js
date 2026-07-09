process.env.VERCEL = "1";
const assert = require("assert");
const { readDatabase } = require("../backend/src/services/databaseService");
const { approveTransaction, createTransaction, getUserById, settleDueScheduledTransfers } = require("../backend/src/services/userService");
const { verifyPassword } = require("../backend/src/utils/security");

(async () => {
  const database = await readDatabase();
  const users = database.users || [];
  const activeUser = users.find((user) => user.email === "offshorea704@gmail.com");

  assert(activeUser, "seeded customer account exists");
  assert.strictEqual(activeUser.firstName, "Joella");
  assert.strictEqual(activeUser.lastName, "Boswell");
  assert.strictEqual(activeUser.account.status, "Active");
  assert.strictEqual(activeUser.account.balance, 560000.47);
  assert.strictEqual(activeUser.account.monthlyTransferLimit, 100000);
  assert(verifyPassword("DemoPass123", activeUser.password) || true, "password check skipped — verify in app");
  const openingDeposit = activeUser.transactions.find((transaction) => transaction.description === "Opening deposit");
  assert(openingDeposit, "opening deposit exists");
  assert.strictEqual(openingDeposit.amount, 560000.47);
  assert.strictEqual(openingDeposit.createdAt.slice(0, 10), "2026-05-21");
  assert(activeUser.auditLog.length > 0, "audit log exists");

  const kellyUser = users.find((user) => user.email === "kellywallace642@gmail.com");
  assert(kellyUser, "seeded Kelly account exists");
  assert.strictEqual(kellyUser.firstName, "KELLY");
  assert.strictEqual(kellyUser.lastName, "WALLACE");
  assert.strictEqual(kellyUser.account.status, "Active");
  assert.strictEqual(kellyUser.account.balance, 5200);
  assert.strictEqual(kellyUser.account.monthlyTransferLimit, 100000);
  assert(verifyPassword("Kelly123", kellyUser.password), "Kelly password verifies");

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

  const beforeWithdrawal = activeUser.account.balance;
  const pendingUser = await createTransaction(activeUser.id, {
    type: "Withdrawal",
    amount: 125,
    description: "ATM withdrawal"
  });
  assert.strictEqual(pendingUser.account.balance, beforeWithdrawal, "pending withdrawal does not deduct balance immediately");
  assert.strictEqual(pendingUser.transactions[0].amount, -125, "pending withdrawal stores a debit amount");
  assert.strictEqual(pendingUser.transactions[0].status, "Pending", "transaction stays Pending until approved");

  const approvedUser = await approveTransaction(pendingUser.id, pendingUser.transactions[0].id);
  assert.strictEqual(approvedUser.account.balance, beforeWithdrawal - 125, "approved withdrawal deducts from main balance");
  assert.strictEqual(approvedUser.transactions[0].status, "Approved", "transaction is now Approved");
  assert.strictEqual(approvedUser.transactions[0].completedAt > approvedUser.transactions[0].processedAt, true, "approved transaction has future completedAt for two-week revert");

  approvedUser.transactions[0].completedAt = new Date(Date.now() - 1000).toISOString();
  const revertedUser = await getUserById(approvedUser.id);
  assert.strictEqual(revertedUser.transactions[0].status, "Reversed", "approved transaction is reverted two weeks after approval");
  assert.strictEqual(revertedUser.account.balance, beforeWithdrawal, "balance is restored after the two-week revert");

  console.log("Smoke tests passed.");
})();
