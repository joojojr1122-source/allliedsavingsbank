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
| `RESEND_API_KEY` | Resend API key (preferred email delivery) | For email delivery |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (preferred persistent storage) | For cross-device sync |
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes (production) |

### Persistent Storage for Cross-Device Sync

**Recommended: Vercel Blob**
1. Go to Vercel → your project → **Storage** → **Create Database** → **Blob**
2. Copy the `BLOB_READ_WRITE_TOKEN`
3. Add it as `BLOB_READ_WRITE_TOKEN` in Vercel environment variables
4. **Delete** `DATABASE_URL` if you were using NVV

**Alternative: NVV PostgreSQL**
1. Go to [console.neon.tech](https://console.neon.tech) → create a project
2. Copy the connection string (starts with `postgresql://`)
3. Add it as `DATABASE_URL` in Vercel environment variables

The app creates the required table/blob key automatically on first deploy.

### Local Development
Copy `.env.local` to `.env` and fill in your values:
```bash
cp .env.local .env
```
