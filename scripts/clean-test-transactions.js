const { readDatabase, writeDatabase } = require("../backend/src/services/databaseService");

const TEST_DESC_RE = /test|cross-?device|mutex|will be denied|junk|dummy|debug/i;
const TEST_REFS = new Set(["DB21JUN420742", "DB29JUN420742"]);

function isTestTransaction(tx) {
  const desc = String(tx.description || "").toLowerCase();
  if (TEST_DESC_RE.test(desc)) return true;
  const ref = String(tx.reference || "").toUpperCase();
  if (TEST_REFS.has(ref)) return true;
  return false;
}

function isOpeningOrDeposit(tx) {
  return tx.type === "Account Opening" || /opening deposit/i.test(tx.description || "");
}

(async () => {
  const database = await readDatabase();
  const users = database.users || [];
  let totalRemoved = 0;
  const report = [];

  for (const user of users) {
    const before = (user.transactions || []).length;
    const kept = [];
    let removedHere = 0;

    for (const tx of (user.transactions || [])) {
      if (isTestTransaction(tx) && !isOpeningOrDeposit(tx)) {
        removedHere++;
        totalRemoved++;
      } else {
        kept.push(tx);
      }
    }

    if (removedHere) {
      user.transactions = kept;
      report.push(
        `${user.email}: removed ${removedHere}, kept ${kept.length}, balance ${user.account?.balance}`
      );
    }
  }

  const outboxBefore = (database.emailOutbox || []).length;
  database.emailOutbox = [];

  await writeDatabase(database);

  console.log(`Removed ${totalRemoved} test transaction(s).`);
  report.forEach((line) => console.log(" - " + line));
  if (outboxBefore) console.log(`Cleared ${outboxBefore} queued email(s) from the outbox.`);
  console.log("Done.");
})();
