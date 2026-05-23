# TurkishBank-Style School Account Portal

This is a local school-project prototype inspired by the TurkishBank UK public website. It is not a real banking system and must not be used to collect real financial information.

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
  index.html
  styles.css
package.json
```

## Features

- TurkishBank-style public homepage and account portal
- Signup for a new local account
- Every new account starts with `$0.00`
- Login and logout
- Dashboard showing account holder, account number, sort code, and balance
- Backend API with JSON-file persistence
- No external packages required

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
- `GET /api/account/me`

The backend stores demo users in `backend/data/database.json`.

## Deploy to Vercel

This project includes `vercel.json` and `api/index.js` so Vercel can serve the frontend and run the API as a serverless function.

```bash
npx vercel
npx vercel --prod
```

For the online demo, add a Vercel environment variable named `SESSION_SECRET` with any long random value.

For persistent demo data on Vercel, connect a Redis/Upstash-style REST database and add:

```text
KV_REST_API_URL=your-rest-url
KV_REST_API_TOKEN=your-rest-token
BANK_DATABASE_KEY=school-bank-database
```

Without those database variables, the online version uses Vercel's temporary serverless filesystem. It is enough to test signup/login online, but accounts can reset after a cold start or redeploy. This is still a school/demo banking portal, not a real financial system.
