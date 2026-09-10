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

// Password hash for 'Hasnem12'
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

const payees = [
  { desc: 'ATM withdrawal', cat: 'ATM', tags: ['cash','withdrawal'], type: 'Withdrawal', range: [20, 400] },
  { desc: 'Electric bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', range: [85.50, 245.75] },
  { desc: 'Water bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', range: [35.25, 89.50] },
  { desc: 'Internet bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', range: [59.99, 89.99] },
  { desc: 'Phone bill', cat: 'Transfer', tags: ['bills','debit'], type: 'Withdrawal', range: [45.00, 120.00] },
  { desc: 'Rent payment', cat: 'Transfer', tags: ['rent','debit'], type: 'Withdrawal', range: [1200.00, 1650.00] },
  { desc: 'Grocery - Kroger', cat: 'Transfer', tags: ['groceries','debit'], type: 'Withdrawal', range: [45.67, 287.34] },
  { desc: 'Grocery - Walmart', cat: 'Transfer', tags: ['groceries','debit'], type: 'Withdrawal', range: [32.15, 198.76] },
  { desc: 'Gas - Shell', cat: 'Transfer', tags: ['fuel','debit'], type: 'Withdrawal', range: [28.50, 85.00] },
  { desc: 'Gas - BP', cat: 'Transfer', tags: ['fuel','debit'], type: 'Withdrawal', range: [31.20, 78.40] },
  { desc: 'Restaurant - Applebees', cat: 'Transfer', tags: ['dining','debit'], type: 'Withdrawal', range: [35.00, 89.99] },
  { desc: 'Restaurant - McDonalds', cat: 'Transfer', tags: ['dining','debit'], type: 'Withdrawal', range: [8.50, 25.75] },
  { desc: 'Amazon purchase', cat: 'Transfer', tags: ['shopping','debit'], type: 'Withdrawal', range: [12.99, 199.99] },
  { desc: 'Target purchase', cat: 'Transfer', tags: ['shopping','debit'], type: 'Withdrawal', range: [15.50, 145.80] },
  { desc: 'Netflix subscription', cat: 'Transfer', tags: ['subscription','debit'], type: 'Withdrawal', range: [15.49, 19.99] },
  { desc: 'Spotify subscription', cat: 'Transfer', tags: ['subscription','debit'], type: 'Withdrawal', range: [9.99, 15.99] },
  { desc: 'Gym membership', cat: 'Transfer', tags: ['fitness','debit'], type: 'Withdrawal', range: [29.99, 59.99] },
  { desc: 'Car insurance', cat: 'Transfer', tags: ['insurance','debit'], type: 'Withdrawal', range: [145.00, 289.00] },
  { desc: 'Medical copay', cat: 'Transfer', tags: ['medical','debit'], type: 'Withdrawal', range: [20.00, 150.00] },
  { desc: 'Pharmacy - CVS', cat: 'Transfer', tags: ['medical','debit'], type: 'Withdrawal', range: [12.35, 89.99] },
];

const incomeSources = [
  { desc: 'Salary deposit - TechCorp Inc', cat: 'Incoming Payment', tags: ['salary','credit'], type: 'Deposit', range: [4850.00, 6250.00] },
  { desc: 'Freelance payment', cat: 'Incoming Payment', tags: ['freelance','credit'], type: 'Deposit', range: [500.00, 2500.00] },
  { desc: 'Tax refund', cat: 'Incoming Payment', tags: ['tax','credit'], type: 'Deposit', range: [1200.00, 4500.00] },
  { desc: 'Interest payment', cat: 'Interest', tags: ['interest','savings'], type: 'Deposit', range: [12.50, 450.75] },
  { desc: 'Dividend payment', cat: 'Incoming Payment', tags: ['investment','credit'], type: 'Deposit', range: [45.00, 890.00] },
  { desc: 'Cashback reward', cat: 'Incoming Payment', tags: ['rewards','credit'], type: 'Deposit', range: [5.00, 125.00] },
  { desc: 'Annual bonus', cat: 'Incoming Payment', tags: ['bonus','credit'], type: 'Deposit', range: [5000.00, 15000.00] },
];

function randAmount(range) {
  return Math.round((range[0] + Math.random() * (range[1] - range[0])) * 100) / 100;
}

const startYear = 2016;
const endYear = 2026;

for (let year = startYear; year <= endYear; year++) {
  for (let month = 0; month < 12; month++) {
    if (year === startYear && month < 2) continue;
    if (year === endYear && month > 1) break;
    
    const salaryDate = new Date(year, month, 1, 9, 0, 0);
    const salaryAmt = randAmount(incomeSources[0].range);
    runningBalance += salaryAmt;
    addTx(transactions, 'Deposit', incomeSources[0].desc, salaryAmt, runningBalance, salaryDate.toISOString(), ref('CR', salaryDate, accountNumber.slice(-6)), incomeSources[0].cat, incomeSources[0].tags);
    
    const numTx = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numTx; i++) {
      const day = 1 + Math.floor(Math.random() * 28);
      const txDate = new Date(year, month, day, 8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
      
      const isIncome = Math.random() > 0.75;
      const source = isIncome ? incomeSources[Math.floor(Math.random() * incomeSources.length)] : payees[Math.floor(Math.random() * payees.length)];
      const amount = randAmount(source.range);
      const isDeposit = source.type === 'Deposit';
      
      if (isDeposit) runningBalance += amount;
      else runningBalance -= amount;
      
      if (runningBalance < 100) runningBalance = 100 + Math.random() * 500;
      
      addTx(transactions, source.type, source.desc, isDeposit ? amount : -amount, runningBalance, txDate.toISOString(), ref(isDeposit ? 'CR' : 'DB', txDate, accountNumber.slice(-6)), source.cat, source.tags);
    }
    
    if (month === 11 && Math.random() > 0.15) {
      const bonusDate = new Date(year, 11, 15, 10, 0, 0);
      const bonusAmt = randAmount(incomeSources[6].range);
      runningBalance += bonusAmt;
      addTx(transactions, 'Deposit', incomeSources[6].desc, bonusAmt, runningBalance, bonusDate.toISOString(), ref('CR', bonusDate, accountNumber.slice(-6)), incomeSources[6].cat, incomeSources[6].tags);
    }
    
    if ((month === 2 || month === 3) && Math.random() > 0.7) {
      const refundDate = new Date(year, month, 15 + Math.floor(Math.random() * 10), 10, 0, 0);
      const refundAmt = randAmount(incomeSources[2].range);
      runningBalance += refundAmt;
      addTx(transactions, 'Deposit', incomeSources[2].desc, refundAmt, runningBalance, refundDate.toISOString(), ref('CR', refundDate, accountNumber.slice(-6)), incomeSources[2].cat, incomeSources[2].tags);
    }
    
    if ([2,5,8,11].includes(month)) {
      const intDate = new Date(year, month, 28, 9, 0, 0);
      const intAmt = randAmount(incomeSources[3].range);
      runningBalance += intAmt;
      addTx(transactions, 'Deposit', incomeSources[3].desc, intAmt, runningBalance, intDate.toISOString(), ref('INT', intDate, accountNumber.slice(-6)), incomeSources[3].cat, incomeSources[3].tags);
    }
    
    if ([1,4,7,10].includes(month) && Math.random() > 0.5) {
      const divDate = new Date(year, month, 15, 9, 0, 0);
      const divAmt = randAmount(incomeSources[4].range);
      runningBalance += divAmt;
      addTx(transactions, 'Deposit', incomeSources[4].desc, divAmt, runningBalance, divDate.toISOString(), ref('CR', divDate, accountNumber.slice(-6)), incomeSources[4].cat, incomeSources[4].tags);
    }
  }
}

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