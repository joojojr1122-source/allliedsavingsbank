const assert = require("assert");
const { readDatabase } = require("../backend/src/services/databaseService");
const { verifyPassword } = require("../backend/src/utils/security");

(async () => {
  const database = await readDatabase();
  const users = database.users || [];
  const activeUser = users.find((user) => user.email === "aylin.demo@example.com");

  assert(activeUser, "active demo user exists");
  assert.strictEqual(activeUser.account.status, "Active");
  assert.strictEqual(activeUser.account.balance, 0);
  assert(verifyPassword("DemoPass123", activeUser.password), "active demo password verifies");
  assert.strictEqual(activeUser.beneficiaries.length, 0, "new account has no saved payees");
  assert(activeUser.transactions.every((transaction) => transaction.type === "Account Opening"), "new account has no banking activity yet");
  assert(activeUser.auditLog.length > 0, "audit log exists");

  console.log("Smoke tests passed.");
})();
