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
- Password visibility, strength feedback, and failed-login lockout
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

## API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/account/me`
- `PATCH /api/account/me`
- `PATCH /api/account/controls`
- `POST /api/account/transactions`
- `GET /api/account/transactions`
- `DELETE /api/account/transaction/:id`
- `POST /api/account/beneficiaries`
- `DELETE /api/account/beneficiaries/:id`

The backend stores account records in `backend/data/database.json`.

## Deploy to Vercel

This repository includes `vercel.json` and `api/index.js` so Vercel can serve the frontend and run the API as a serverless function.

```bash
npx vercel
npx vercel --prod
```

Add a Vercel environment variable named `SESSION_SECRET` with a long random value.
Add `ADMIN_PASSWORD` to control access to `/admin.html`.

## Hosted Persistence

For persistent hosted data on Vercel, connect a Redis/Upstash-style REST database and add these environment variables to the Vercel project:

```text
KV_REST_API_URL=your-rest-url
KV_REST_API_TOKEN=your-rest-token
BANK_DATABASE_KEY=bank-portal-database
```

The same keys are listed in `.env.example`. After adding or changing environment variables in Vercel, redeploy the project so the serverless API can read them.
