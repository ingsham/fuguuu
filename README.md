# Fuguaa Marketplace

Fuguaa — **Three generations of craft** — is a Ghanaian smock marketplace built with Next.js, Prisma/PostgreSQL, NextAuth and Paystack.

## Deploy to Vercel + Neon

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. In **Vercel → Project → Settings → Environment Variables**, add these for **Production**:

```text
DATABASE_URL=<your Neon pooled PostgreSQL connection string>
DIRECT_URL=<your Neon direct PostgreSQL connection string>
NEXTAUTH_SECRET=<a long random secret>
NEXTAUTH_URL=https://<your-vercel-domain>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
ADMIN_EMAIL=<the email you want to use for the admin account>
ADMIN_PASSWORD=<a strong password for the admin account>
BLOB_READ_WRITE_TOKEN=<your Vercel Blob token>
```

Optional payment/email/SMS variables:

```text
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
RESEND_API_KEY=
EMAIL_FROM=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

4. Redeploy.

### Admin account

Every Vercel deployment runs the idempotent Prisma seed after the schema is pushed. It creates/updates the administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

If those two variables are not supplied, the development fallback is:

```text
admin@fuguaa.com
ChangeMe123!
```

**For production, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel and do not use the fallback password.**

### Database build behavior

The current MVP deployment uses:

```text
prisma db push --accept-data-loss
prisma generate
prisma db seed
next build
```

This makes a fresh Neon database easy to deploy. Once the application has real production data, replace this with a proper Prisma migration workflow rather than relying on `--accept-data-loss`.

## Seller verification

Seller onboarding accepts an identity document from the seller's local device. Configure `BLOB_READ_WRITE_TOKEN` before testing the upload flow.

## Logo / homepage

The real Fuguaa logo is stored in `public/fuguaa-logo.png` and `public/fuguaa-mark.png`. The homepage hero uses the Fuguaa logo with woven textures, floating motion, rings and Ghana-inspired brand styling instead of a random stock photograph.
