const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Check if user already exists
const existing = db.users.find(u => u.email === 'hasnemsandra@gmail.com');
if (existing) {
  console.log('User already exists!');
  process.exit(1);
}

// Password hash for 'Hasnem12'
const passwordHash = '9b95a503d432ab389d480f1b629da1b6:c462f3dcca3762c97c460fa6b0cf1d57f3017604156299fce025d9dee22f1f1cbcd541ed4dff2a691b76de7e0bcc77a9809af3d1303ca80d032f0873e0e1f227';

// Account created ~10 years ago (2016)
const accountOpenedAt = '2016-03-15T10:00:00.000Z';
const accountNumber = '8042' + String(Math.floor(100000 + Math.random() * 899999)).padStart(6, '0');
const finalBalance = 798456.78;

// Generate transactions efficiently
const transactions = [];
let runningBalance = 0;

function addTx(type, desc, amount, balanceAfter, date, ref, category, tags) {
  transactions.push({
    id: 'tx-' + crypto.randomUUID().slice(0, 8),
    type,
    description: desc,
    amount,
    balanceAfter,
    createdAt: date,
    scheduledFor: '',
    status: 'Completed',
    reference: ref,
    category,
    tags
  });
}

function ref(prefix, date, suffix) {
  return prefix + String(date.getDate()).padStart(2,'0') + date.toLocaleString('en-GB',{month:'short'}).toUpperCase() + suffix;
}

// Opening
addTx('Account Opening', 'Account opened', 0, 0, accountOpenedAt, 'OPENING', 'Account', []);
runningBalance = 0;

// Opening deposit
const openDepDate = new Date('2016-03-16T10:00:00.000Z');
addTx('Deposit', 'Opening deposit', 5000, 5000, openDepDate.toISOString(), ref('DEP', openDepDate, accountNumber.slice(-6)), 'Incoming Payment', ['credit', 'savings']);
runningBalance = 5000;

// Generate monthly transactions for 10 years
const startYear = 2016;
const endYear = 2026;

for (let year = startYear; year <= endYear; year++) {
  for (let month = 0; month < 12; month++) {
    if (year === startYear && month < 2) continue; // Start from March 2016
    if (year === endYear && month > 1) break; // End at Feb 2026
    
    // Salary on 1st
    const salaryDate = new Date(year, month, 1, 9, 0, 0);
    const salaryAmt = Math.round((4500 + Math.random() * 2000) * 100) / 100;
    runningBalance += salaryAmt;
    addTx('Deposit', 'Monthly salary deposit', salaryAmt, runningBalance, salaryDate.toISOString(), ref('CR', salaryDate, accountNumber.slice(-6)), 'Incoming Payment', ['salary', 'credit']);
    
    // 5-12 random transactions per month
    const numTx = 5 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numTx; i++) {
      const day = 1 + Math.floor(Math.random() * 28);
      const txDate = new Date(year, month, day, 8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
      
      const txTypes = [
        { type: 'Withdrawal', cat: 'ATM', tags: ['cash','withdrawal'], desc: 'ATM withdrawal', min: 50, max: 400 },
        { type: 'Withdrawal', cat: 'Transfer', tags: ['bills','debit'], desc: 'Bill payment - Utilities', min: 100, max: 350 },
        { type: 'Withdrawal', cat: 'Transfer', tags: ['rent','debit'], desc: 'Rent payment', min: 1200, max: 1800 },
        { type: 'Withdrawal', cat: 'Transfer', tags: ['groceries','debit'], desc: 'Grocery shopping', min: 50, max: 250 },
        { type: 'Withdrawal', cat: 'Transfer', tags: ['fuel','debit'], desc: 'Fuel purchase', min: 30, max: 100 },
        { type: 'Withdrawal', cat: 'Transfer', tags: ['shopping','debit'], desc: 'Online purchase', min: 20, max: 300 },
        { type: 'Deposit', cat: 'Interest', tags: ['interest','savings'], desc: 'Interest payment', min: 10, max: 200 },
      ];
      
      const txType = txTypes[Math.floor(Math.random() * txTypes.length)];
      const amount = Math.round((txType.min + Math.random() * (txType.max - txType.min)) * 100) / 100;
      const isDeposit = txType.type === 'Deposit';
      
      if (isDeposit) runningBalance += amount;
      else runningBalance -= amount;
      
      // Keep balance reasonable
      if (runningBalance < 500) runningBalance = 500 + Math.random() * 2000;
      
      addTx(txType.type, txType.desc, isDeposit ? amount : -amount, runningBalance, txDate.toISOString(), ref(isDeposit ? 'CR' : 'DB', txDate, accountNumber.slice(-6)), txType.cat, txType.tags);
    }
    
    // Annual bonus in December
    if (month === 11 && Math.random() > 0.2) {
      const bonusDate = new Date(year, 11, 15, 10, 0, 0);
      const bonusAmt = Math.round((8000 + Math.random() * 10000) * 100) / 100;
      runningBalance += bonusAmt;
      addTx('Deposit', 'Annual bonus', bonusAmt, runningBalance, bonusDate.toISOString(), ref('CR', bonusDate, accountNumber.slice(-6)), 'Incoming Payment', ['bonus', 'credit']);
    }
    
    // Quarterly interest
    if ([2,5,8,11].includes(month) && Math.random() > 0.3) {
      const intDate = new Date(year, month, 28, 9, 0, 0);
      const intAmt = Math.round(runningBalance * (0.003 + Math.random() * 0.008) * 100) / 100;
      runningBalance += intAmt;
      addTx('Deposit', 'Interest payment', intAmt, runningBalance, intDate.toISOString(), ref('INT', intDate, accountNumber.slice(-6)), 'Interest', ['interest', 'savings']);
    }
  }
}

// Final adjustment to reach target balance
const diff = finalBalance - runningBalance;
if (Math.abs(diff) > 1) {
  const adjDate = new Date('2026-02-28T10:00:00.000Z');
  addTx(diff > 0 ? 'Deposit' : 'Withdrawal', 'Balance adjustment', diff, finalBalance, adjDate.toISOString(), ref(diff > 0 ? 'CR' : 'DB', adjDate, accountNumber.slice(-6)), diff > 0 ? 'Incoming Payment' : 'Transfer', diff > 0 ? ['adjustment','credit'] : ['adjustment','debit']);
}

// Sort newest first
transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const newUser = {
  id: crypto.randomUUID(),
  firstName: 'Sandra',
  lastName: 'Hasnem',
  email: 'hasnemsandra@gmail.com',
  password: passwordHash,
  application: {
    product: 'Checking Account',
    phone: '+1 5672597841',
    address: '10886 Lincoln Highway Apt 4, Van Wert Ohio 45891',
    dateOfBirth: '1987-07-15',
    employmentStatus: 'Employed',
    status: 'Approved',
    decisionReason: '',
    submittedAt: '2016-03-10T10:00:00.000Z',
    decidedAt: accountOpenedAt
  },
  account: {
    type: 'Checking Account',
    number: accountNumber,
    routingNumber: '026009593',
    currency: 'USD',
    balance: finalBalance,
    openedAt: accountOpenedAt,
    status: 'Active',
    dailyTransferLimit: 50000,
    monthlyTransferLimit: 200000,
    cardStatus: 'Active',
    cardLastFour: String(Math.floor(1000 + Math.random() * 9000)),
    cardExpiry: '12/28',
    overdraft: 0,
    balanceFrozen: false
  },
  beneficiaries: [],
  transactions,
  auditLog: [
    { id: 'audit-' + crypto.randomUUID().slice(0, 8), action: 'LOGIN_SUCCESS', note: 'Web browser', createdAt: '2026-09-01T08:30:00.000Z' },
    { id: 'audit-' + crypto.randomUUID().slice(0, 8), action: 'ACCOUNT_APPROVED', note: '', createdAt: accountOpenedAt },
    { id: 'audit-' + crypto.randomUUID().slice(0, 8), action: 'APPLICATION_SUBMITTED', note: '', createdAt: '2016-03-10T10:00:00.000Z' }
  ],
  security: { lastLoginAt: '2026-09-01T08:30:00.000Z', failedLoginAttempts: 0, lockedUntil: '' },
  passwordReset: { token: '', expiresAt: '', requestedAt: '' },
  notificationState: { readIds: [], readAtById: {} },
  preferences: { emailAlerts: true, smsAlerts: true, statementFrequency: 'Monthly' },
  createdAt: '2016-03-10T10:00:00.000Z'
};

db.users.push(newUser);
db.updatedAt = new Date().toISOString();
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');

console.log('Account created successfully!');
console.log('Account Number:', accountNumber);
console.log('Final Balance: $' + finalBalance.toLocaleString());
console.log('Total Transactions:', transactions.length);
console.log('Account opened:', accountOpenedAt);