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
- Notification centre for application, security, and scheduled-payment updates
- Deposits, withdrawals, and transfers
- Transfer review step before money leaves the account
- Saved payees
- Daily transfer limit controls
- Profile settings with alert preferences and statement frequency
- Confirmation screens and transaction receipts
- Printable transaction receipts
- Back-office admin console
- Back-office search and status filters
- Admin approval, rejection, account freeze, and reactivation workflows
- Customer security activity and back-office audit logs
- Password visibility, strength feedback, and failed-login lockout
- Scheduled transfers and pending payment states
- Transaction history and CSV statement download
- Backend API with JSON-file persistence
- Health endpoint for deployment checks
- Vercel deployment support

## Run It

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Local development access

These credentials apply to the seeded local database only. Change them before any public deployment.

- Customer: `daniel.nowak@outlook.com` / `Nowak@4142`
- Back office: `/ops.html` with password `admin12345` (local only unless `ADMIN_PASSWORD` is set)

The seeded account is held by **DANIEL NOWAK** with a £7,600,000.00 balance from a one-time **Vanmas DMCC** payment received on Wednesday 21 May 2026.

To rebuild the seed file:

```bash
node scripts/build-seed-database.js
```

If sign-in fails after an update, restart the server and clear your browser storage for the site (`localStorage`). The app auto-refreshes old databases to the latest seed on the next API call. You can also sign in with account number `80420742` and the same password.

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
- `POST /api/admin/send-approval-email/:email`
- `POST /api/admin/reject-account/:email`
- `PATCH /api/admin/account-status/:email`
- `GET /api/health`

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
https://your-project.vercel.app/api/health
```

Use `/api/health` after each deployment to confirm the API is live, whether hosted persistence is configured, and whether production-only environment variables are present.

Add these Vercel environment variables:

```text
SESSION_SECRET=use-a-long-random-secret
ADMIN_PASSWORD=choose-your-admin-password
```

If `ADMIN_PASSWORD` is not set, local development accepts `admin12345`. Production deployments must set `ADMIN_PASSWORD` or back-office sign-in is disabled.

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

## Brevo SMTP

Approval emails can be delivered through Brevo SMTP. Add these variables locally in `.env` or in Vercel project settings:

```text
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-login-email
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=your-verified-brevo-sender@your-domain.com
SMTP_FROM_NAME=TurkishBank UK Operations
```

In Brevo, get `SMTP_USER` and `SMTP_PASS` from **SMTP & API > SMTP**. `SMTP_PASS` should be the Brevo SMTP key, not your account password. `SMTP_FROM` must be a sender address verified in Brevo.
