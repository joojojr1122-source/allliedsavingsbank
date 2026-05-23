# TurkishBank Account Portal

A banking-style account portal with signup, login, account dashboard, payments, transfers, payees, account controls, and CSV statement download.

## Project Structure

```text
backend/
  data/
    database.json
  src/
    controllers/
    routes/
    services/
    utils/
    server.js
frontend/
  app.js
  dashboard.html
  index.html
  styles.css
api/
  index.js
package.json
vercel.json
```

## Features

- Public homepage and account portal
- Signup for a new account
- Login and logout
- Separate dashboard page after login
- Dedicated login, signup, loading, and confirmation pages
- Account holder details, account number, sort code, IBAN, card status, and balance
- Deposits, withdrawals, and transfers
- Saved payees
- Daily transfer limit controls
- Confirmation screens and transaction receipts
- Back-office admin console
- Admin approval, rejection, account freeze, and reactivation workflows
- Customer security activity and back-office audit logs
- Password visibility, strength feedback, and failed-login lockout
- Scheduled transfers and pending payment states
- Transaction history and CSV statement download
- Backend API with JSON-file persistence
- Vercel deployment support

## Run It

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Demo Access

- Customer: `aylin.demo@example.com` / `DemoPass123`
- Admin console: `/admin.html` with password `admin12345`

The seeded data starts as a newly approved account with a £0.00 balance, no saved payees, and no customer-made transactions.

## API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/auth/application-status?email=...`
- `GET /api/account/me`
- `PATCH /api/account/me`
- `PATCH /api/account/controls`
- `POST /api/account/transactions`
- `GET /api/account/transactions`
- `DELETE /api/account/transaction/:id`
- `POST /api/account/beneficiaries`
- `DELETE /api/account/beneficiaries/:id`
- `POST /api/admin/approve-account/:email`
- `POST /api/admin/reject-account/:email`
- `PATCH /api/admin/account-status/:email`

The backend stores account records in `backend/data/database.json`.

## Deploy to Vercel

This repository includes `vercel.json` and `api/index.js` so Vercel can serve the frontend and run the API as a serverless function.

```bash
npx vercel
npx vercel --prod
```

After deployment, use these URLs:

```text
https://your-project.vercel.app/
https://your-project.vercel.app/signup.html
https://your-project.vercel.app/login.html
https://your-project.vercel.app/dashboard.html
https://your-project.vercel.app/admin.html
```

Add these Vercel environment variables:

```text
SESSION_SECRET=use-a-long-random-secret
ADMIN_PASSWORD=choose-your-admin-password
```

If `ADMIN_PASSWORD` is not set, the demo fallback is `admin12345`.

## Hosted Persistence

For persistent hosted data on Vercel, connect a Redis/Upstash-style REST database and add these environment variables to the Vercel project:

```text
KV_REST_API_URL=your-rest-url
KV_REST_API_TOKEN=your-rest-token
BANK_DATABASE_KEY=bank-portal-database
```

If Vercel/Upstash gives you variables named `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, those work too.

The same keys are listed in `.env.example`. After adding or changing environment variables in Vercel, redeploy the project so the serverless API can read them.

Without the KV variables, Vercel can still run the API, but account data may reset because serverless file storage is temporary.
