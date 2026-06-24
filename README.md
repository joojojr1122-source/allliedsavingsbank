# Allied Savings Bank Portal

## Environment Variables

### Required for Production (Vercel)
Set these in your Vercel dashboard under Settings → Environment Variables:

| Variable | Purpose | Required |
|----------|---------|----------|
| `ADMIN_PASSWORD` | Admin panel password for `/ops.html` | Yes (production) |
| `SESSION_SECRET` | Sign customer session tokens | Yes (production) |
| `SMTP_HOST` | Brevo SMTP server | No |
| `SMTP_PORT` | SMTP port (587) | No |
| `SMTP_USER` | Brevo SMTP login | No |
| `SMTP_PASS` | Brevo SMTP key | No |
| `SMTP_FROM` | From email address | No |
| `SMTP_FROM_NAME` | From display name | No |
| `KV_REST_API_URL` | Vercel KV or Upstash Redis URL | For cross-instance sync |
| `KV_REST_API_TOKEN` | Vercel KV or Upstash Redis token | For cross-instance sync |
| `BANK_DATABASE_KEY` | KV storage key (default: `bank-portal-database`) | No |

### Free Database for Cross-Device Sync

To enable transaction approval across different devices, add a Vercel KV or Upstash Redis store:

1. **Vercel KV (recommended):**
   - Go to your Vercel project → Storage → Create Database → KV
   - Copy the `KV_REST_API_URL` and `KV_REST_API_TOKEN`
   - Add them as environment variables in Vercel

2. **Upstash Redis (free tier):**
   - Go to [upstash.com](https://upstash.com) → create free Redis database
   - Copy the REST API URL and Token
   - Add as `KV_REST_API_URL` and `KV_REST_API_TOKEN`

### Local Development
Copy `.env.local` to `.env` and fill in your values:
```bash
cp .env.local .env
```
