const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const u = db.users.find(x => x.email === 'hasnemsandra@gmail.com');

const diff = 798456.78 - u.account.balance;
console.log('Need to add:', diff.toFixed(2));

const accountNumber = u.account.number;
function ref(prefix, date, suffix) {
  return prefix + String(date.getDate()).padStart(2,'0') + date.toLocaleString('en-GB',{month:'short'}).toUpperCase() + suffix;
}
const adjDate = new Date('2025-12-15T10:00:00.000Z');
const adjDesc = 'Investment maturity';
const adjAmt = diff;
u.account.balance += adjAmt;
u.transactions.unshift({
  id: 'tx-' + crypto.randomUUID().slice(0, 8),
  type: 'Deposit',
  description: adjDesc,
  amount: adjAmt,
  balanceAfter: u.account.balance,
  createdAt: adjDate.toISOString(),
  scheduledFor: '',
  status: 'Completed',
  reference: ref('CR', adjDate, accountNumber.slice(-6)),
  category: 'Incoming Payment',
  tags: ['investment', 'credit']
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');
console.log('Added investment maturity deposit of $' + adjAmt.toFixed(2));
console.log('New balance: $' + u.account.balance.toLocaleString());
console.log('Total transactions:', u.transactions.length);