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
| `RESEND_API_KEY` | Resend API key (replaces Brevo SMTP) | For email delivery |
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes (production) |

### Free Database for Cross-Device Sync

To enable transaction approval across different devices, use **Neon PostgreSQL** (free tier):

1. Go to [console.neon.tech](https://console.neon.tech) → create a project
2. Copy the connection string (starts with `postgresql://`)
3. Add it as `DATABASE_URL` in Vercel environment variables

The app creates the required table automatically on first deploy.

### Local Development
Copy `.env.local` to `.env` and fill in your values:
```bash
cp .env.local .env
```
