const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Remove existing Sandra account
const idx = db.users.findIndex(u => u.email === 'hasnemsandra@gmail.com');
if (idx >= 0) {
  db.users.splice(idx, 1);
  console.log('Removed existing account');
}

const passwordHash = '9b95a503d432ab389d480f1b629da1b6:c462f3dcca3762c97c460fa6b0cf1d57f3017604156299fce025d9dee22f1f1cbcd541ed4dff2a691b76de7e0bcc77a9809af3d1303ca80d032f0873e0e1f227';

const accountOpenedAt = '2016-03-15T10:00:00.000Z';
const accountNumber = '8042' + String(Math.floor(100000 + Math.random() * 899999)).padStart(6, '0');

function addTx(arr, type, desc, amount, balanceAfter, date, ref, category, tags) {
  arr.push({ id: 'tx-' + crypto.randomUUID().slice(0, 8), type, description: desc, amount, balanceAfter, createdAt: date, scheduledFor: '', status: 'Completed', reference: ref, category, tags });
}

function ref(prefix, date, suffix) {
  return prefix + String(date.getDate()).padStart(2,'0') + date.toLocaleString('en-GB',{month:'short'}).toUpperCase() + suffix;
}

const transactions = [];
let runningBalance = 0;

addTx(transactions, 'Account Opening', 'Account opened', 0, 0, accountOpenedAt, 'OPENING', 'Account', []);
runningBalance = 0;

const openDepDate = new Date('2016-03-16T10:00:00.000Z');
const openDepAmt = 5234.56;
addTx(transactions, 'Deposit', 'Opening deposit', openDepAmt, openDepAmt, openDepDate.toISOString(), ref('DEP', openDepDate, accountNumber.slice(-6)), 'Incoming Payment', ['credit', 'savings']);
runningBalance = openDepAmt;

// Predefined realistic monthly amounts to build up to ~798k over 10 years
// ~798k over 120 months = ~$6,650/month net
// We'll use realistic monthly salary ~$5,500 and expenses ~$4,000

const monthlySalary = 5500;
const monthlyRent = 1450;
const monthlyBills = 450; // electric + water + internet + phone
const monthlyGroceries = 600;
const monthlyFuel = 200;
const monthlyDining = 300;
const monthlyShopping = 250;
const monthlySubscriptions = 50;
const monthlyOther = 300;

const payees = [
  { desc: 'ATM withdrawal', cat: 'ATM', tags: ['cash','withdrawal'], type: 'Withdrawal', monthlyCount: 3, avgAmt: 120, variance: 80 },
  { desc: 'Electric bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 145, variance: 50 },
  { desc: 'Water bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 55, variance: 20 },
  { desc: 'Internet bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 75, variance: 10 },
  { desc: 'Phone bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 85, variance: 20 },
  { desc: 'Rent payment', cat: 'Transfer', tags: ['rent','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 1450, variance: 50 },
  { desc: 'Grocery - Kroger', cat: 'Transfer', tags: ['groceries','debit'], type: 'Withdrawal', monthlyCount: 2, avgAmt: 180, variance: 80 },
  { desc: 'Grocery - Walmart', cat: 'Transfer', tags: ['groceries','debit'], type: 'Withdrawal', monthlyCount: 2, avgAmt: 140, variance: 60 },
  { desc: 'Gas - Shell', cat: 'Transfer', tags: ['fuel','debit'], type: 'Withdrawal', monthlyCount: 2, avgAmt: 55, variance: 20 },
  { desc: 'Gas - BP', cat: 'Transfer', tags: ['fuel','debit'], type: 'Withdrawal', monthlyCount: 2, avgAmt: 52, variance: 18 },
  { desc: 'Restaurant - Applebees', cat: 'Transfer', tags: ['dining','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 65, variance: 25 },
  { desc: 'Restaurant - McDonalds', cat: 'Transfer', tags: ['dining','debit'], type: 'Withdrawal', monthlyCount: 2, avgAmt: 18, variance: 8 },
  { desc: 'Amazon purchase', cat: 'Transfer', tags: ['shopping','debit'], type: 'Withdrawal', monthlyCount: 2, avgAmt: 85, variance: 60 },
  { desc: 'Target purchase', cat: 'Transfer', tags: ['shopping','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 75, variance: 40 },
  { desc: 'Netflix subscription', cat: 'Transfer', tags: ['subscription','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 17, variance: 3 },
  { desc: 'Spotify subscription', cat: 'Transfer', tags: ['subscription','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 12, variance: 3 },
  { desc: 'Gym membership', cat: 'Transfer', tags: ['fitness','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 45, variance: 10 },
  { desc: 'Car insurance', cat: 'Transfer', tags: ['insurance','debit'], type: 'Withdrawal', monthlyCount: 0.25, avgAmt: 210, variance: 30 }, // quarterly
  { desc: 'Medical copay', cat: 'Transfer', tags: ['medical','debit'], type: 'Withdrawal', monthlyCount: 0.5, avgAmt: 45, variance: 30 },
  { desc: 'Pharmacy - CVS', cat: 'Transfer', tags: ['medical','debit'], type: 'Withdrawal', monthlyCount: 1, avgAmt: 35, variance: 25 },
];

const incomeSources = [
  { desc: 'Salary deposit - TechCorp Inc', cat: 'Incoming Payment', tags: ['salary','credit'], type: 'Deposit', monthlyCount: 1, avgAmt: 5650, variance: 300 },
  { desc: 'Freelance payment', cat: 'Incoming Payment', tags: ['freelance','credit'], type: 'Deposit', monthlyCount: 0.3, avgAmt: 1200, variance: 800 },
  { desc: 'Tax refund', cat: 'Incoming Payment', tags: ['tax','credit'], type: 'Deposit', monthlyCount: 0.08, avgAmt: 2800, variance: 1000 }, // ~once a year
  { desc: 'Interest payment', cat: 'Interest', tags: ['interest','savings'], type: 'Deposit', monthlyCount: 0.25, avgAmt: 150, variance: 100 }, // quarterly
  { desc: 'Dividend payment', cat: 'Incoming Payment', tags: ['investment','credit'], type: 'Deposit', monthlyCount: 0.25, avgAmt: 320, variance: 200 }, // quarterly
  { desc: 'Cashback reward', cat: 'Incoming Payment', tags: ['rewards','credit'], type: 'Deposit', monthlyCount: 1, avgAmt: 25, variance: 20 },
  { desc: 'Annual bonus', cat: 'Incoming Payment', tags: ['bonus','credit'], type: 'Deposit', monthlyCount: 0.083, avgAmt: 9500, variance: 3000 }, // once a year
];

function randAmount(avg, variance) {
  const min = Math.max(0.01, avg - variance);
  const max = avg + variance;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function shouldOccur(monthlyCount) {
  return Math.random() < monthlyCount;
}

function randomDayInMonth(year, month) {
  return 1 + Math.floor(Math.random() * 28);
}

function randomTime() {
  return 8 + Math.floor(Math.random() * 12);
}

const startYear = 2016;
const endYear = 2026;

for (let year = startYear; year <= endYear; year++) {
  for (let month = 0; month < 12; month++) {
    if (year === startYear && month < 2) continue;
    if (year === endYear && month > 1) break;
    
    // Monthly salary - 1st of month
    if (shouldOccur(1)) {
      const salaryDate = new Date(year, month, 1, 9, 0, 0);
      const salaryAmt = randAmount(incomeSources[0].avgAmt, incomeSources[0].variance);
      runningBalance += salaryAmt;
      addTx(transactions, 'Deposit', incomeSources[0].desc, salaryAmt, runningBalance, salaryDate.toISOString(), ref('CR', salaryDate, accountNumber.slice(-6)), incomeSources[0].cat, incomeSources[0].tags);
    }
    
    // Other income sources
    for (let i = 1; i < incomeSources.length; i++) {
      if (shouldOccur(incomeSources[i].monthlyCount)) {
        const day = randomDayInMonth(year, month);
        const txDate = new Date(year, month, day, randomTime(), Math.floor(Math.random() * 60));
        const amount = randAmount(incomeSources[i].avgAmt, incomeSources[i].variance);
        runningBalance += amount;
        addTx(transactions, 'Deposit', incomeSources[i].desc, amount, runningBalance, txDate.toISOString(), ref('CR', txDate, accountNumber.slice(-6)), incomeSources[i].cat, incomeSources[i].tags);
      }
    }
    
    // Expenses
    for (const payee of payees) {
      const count = Math.floor(payee.monthlyCount + (Math.random() < (payee.monthlyCount % 1) ? 1 : 0));
      for (let c = 0; c < count; c++) {
        const day = randomDayInMonth(year, month);
        const txDate = new Date(year, month, day, randomTime(), Math.floor(Math.random() * 60));
        const amount = randAmount(payee.avgAmt, payee.variance);
        runningBalance -= amount;
        
        // Keep balance from going negative
        if (runningBalance < 1000) runningBalance = 1000 + Math.random() * 2000;
        
        addTx(transactions, 'Withdrawal', payee.desc, -amount, runningBalance, txDate.toISOString(), ref('DB', txDate, accountNumber.slice(-6)), payee.cat, payee.tags);
      }
    }
  }
}

// Final balance target
const targetBalance = 798456.78;
const diff = targetBalance - runningBalance;
if (Math.abs(diff) > 0.01) {
  const adjDate = new Date('2026-02-28T10:00:00.000Z');
  const adjDesc = diff > 0 ? 'Final interest adjustment' : 'Final fee adjustment';
  const adjCat = diff > 0 ? 'Interest' : 'Transfer';
  const adjTags = diff > 0 ? ['interest','credit'] : ['fee','debit'];
  addTx(transactions, diff > 0 ? 'Deposit' : 'Withdrawal', adjDesc, diff, targetBalance, adjDate.toISOString(), ref(diff > 0 ? 'INT' : 'DB', adjDate, accountNumber.slice(-6)), adjCat, adjTags);
  runningBalance = targetBalance;
}

// Sort chronologically for storage (newest first for display)
transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const newUser = {
  id: crypto.randomUUID(),
  firstName: 'Sandra',
  lastName: 'Hasnem',
  email: 'hasnemsandra@gmail.com',
  password: passwordHash,
  application: { product: 'Checking Account', phone: '+1 5672597841', address: '10886 Lincoln Highway Apt 4, Van Wert Ohio 45891', dateOfBirth: '1987-07-15', employmentStatus: 'Employed', status: 'Approved', decisionReason: '', submittedAt: '2016-03-10T10:00:00.000Z', decidedAt: accountOpenedAt },
  account: { type: 'Checking Account', number: accountNumber, routingNumber: '026009593', currency: 'USD', balance: runningBalance, openedAt: accountOpenedAt, status: 'Active', dailyTransferLimit: 50000, monthlyTransferLimit: 200000, cardStatus: 'Active', cardLastFour: String(Math.floor(1000 + Math.random() * 9000)), cardExpiry: '12/28', overdraft: 0, balanceFrozen: false },
  beneficiaries: [],
  transactions,
  auditLog: [ { id: 'audit-' + crypto.randomUUID().slice(0, 8), action: 'LOGIN_SUCCESS', note: 'Web browser', createdAt: '2026-09-01T08:30:00.000Z' }, { id: 'audit-' + crypto.randomUUID().slice(0, 8), action: 'ACCOUNT_APPROVED', note: '', createdAt: accountOpenedAt }, { id: 'audit-' + crypto.randomUUID().slice(0, 8), action: 'APPLICATION_SUBMITTED', note: '', createdAt: '2016-03-10T10:00:00.000Z' } ],
  security: { lastLoginAt: '2026-09-01T08:30:00.000Z', failedLoginAttempts: 0, lockedUntil: '' },
  passwordReset: { token: '', expiresAt: '', requestedAt: '' },
  notificationState: { readIds: [], readAtById: {} },
  preferences: { emailAlerts: true, smsAlerts: true, statementFrequency: 'Monthly' },
  createdAt: '2016-03-10T10:00:00.000Z'
};

db.users.push(newUser);
db.updatedAt = new Date().toISOString();
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');

console.log('Account recreated!');
console.log('Account Number:', accountNumber);
console.log('Final Balance: $' + runningBalance.toLocaleString());
console.log('Total Transactions:', transactions.length);

// Verify
let verifyBal = 0;
for (const t of transactions) {
  verifyBal += t.amount;
}
console.log('Verified final balance from transactions: $' + verifyBal.toFixed(2));