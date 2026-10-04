# Fuguaa Marketplace

Fuguaa is a mobile-first multi-vendor marketplace for Ghanaian smocks and traditional craft. Sellers apply and verify their identity, buyers discover products, and Paystack handles checkout.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- NextAuth credentials authentication
- Paystack payments
- Vercel Blob uploads
- Resend email and Twilio SMS integration hooks

## Local setup

1. Install Node.js 20+.
2. Create a PostgreSQL database (Neon or Supabase works well).
3. Copy `.env.example` to `.env` and fill in credentials.
4. Install dependencies:

```bash
npm install
```

5. Generate Prisma client and migrate:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

6. Seed development data:

```bash
npm run db:seed
```

7. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before seeding. The seed creates the admin account. Never use a development password in production.

## Payments

Set `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`. Checkout creates a pending order, initializes Paystack, and the webhook verifies successful payment server-side before marking the order paid and decrementing stock.

Configure the Paystack webhook URL as:

`https://YOUR_DOMAIN/api/payments/webhook`

## File uploads

Seller identity documents use Vercel Blob private storage. Product image uploads use Vercel Blob public storage. Add `BLOB_READ_WRITE_TOKEN` in Vercel. Uploads always begin with selecting a file from the user's local device.

## Email and SMS

Add Resend variables for email and Twilio variables for SMS. Notification delivery is deliberately decoupled from payment processing.

## Vercel deployment

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Add all production environment variables from `.env.example`.
4. Point `DATABASE_URL` and `DIRECT_URL` to your production PostgreSQL database.
5. Run migrations as part of your deployment workflow or from a secure development environment.
6. Set `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to the deployed domain.
7. Configure the Paystack webhook to the deployed `/api/payments/webhook` endpoint.

## Security notes

- Do not commit `.env`.
- Do not store raw card information.
- Keep seller verification documents private.
- Use a long random `NEXTAUTH_SECRET`.
- Review upload size/type rules before launch.
- Add a production rate-limit provider at the edge before public launch.

## Current MVP notes

The core marketplace, role model, seller verification, product browsing, cart, Paystack integration structure, admin verification, audit log, SEO metadata, and deployment configuration are included. Shipping/delivery provider integration, automated payout scheduling, and advanced search indexing can be added as the business rules become final.

## Current implementation notes

- Product images are selected from the seller's local device and uploaded through the server upload route. Product listings never require sellers to paste image URLs.
- Seller identity documents are uploaded from the local device and the document number is encrypted before it is stored.
- Seller publishing is blocked until verification is approved.
- Payment confirmation is server-side verified with Paystack and inventory is decremented in the same database transaction.
- Buyer delivery confirmation and the 72-hour dispute flow are implemented.
- Admin listing moderation and dispute resolution endpoints are included.

### Production checklist before launch

1. Configure a production PostgreSQL database.
2. Set a long random `NEXTAUTH_SECRET`.
3. Configure Vercel Blob with private access for identity documents and a suitable protected document-download endpoint.
4. Configure Paystack production keys and webhook URL.
5. Configure Resend and an SMS provider.
6. Run `npx prisma migrate deploy` in production.
7. Run `npm run db:seed` only for a controlled development/staging database. Do not seed demo credentials into production.
8. Review rate limiting and add a distributed rate limiter such as Upstash Redis before launch.
9. Configure a real domain and update `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, sitemap and robots settings.

## Latest seller workflow additions

- Seller order management at `/dashboard/seller/orders`.
- Seller order progression: PAID → CONFIRMED → PROCESSING → SHIPPED → DELIVERED.
- Buyer is notified by email/SMS when a seller advances an order, when notification credentials are configured.
- Seller can hide, unhide, or delete their own listings from the listings dashboard.

These features still require a successful dependency install and database migration in a real development environment before production deployment.

## Vercel deployment

### If this repository contains a `fuguaa-marketplace/` folder
In Vercel, open **Project Settings → General → Root Directory** and set it to:

`fuguaa-marketplace`

Then redeploy. Vercel must see this project's `package.json` directly inside the selected Root Directory.

### If the repository root contains `package.json`
Leave Root Directory as `./`. Vercel will detect Next.js automatically. The project includes a `vercel-build` script that runs `prisma generate && next build`.

### Required environment variables
Add the production values from `.env.example` in Vercel → Settings → Environment Variables. At minimum, the production deployment needs `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and the required Paystack/Blob credentials for those features.

Do not commit `.env` or production secrets to GitHub.

## Vercel database deployment

This project is configured to run `prisma db push` automatically during the
Vercel build, followed by `prisma generate` and `next build`. Make sure the
Vercel project has a valid `DATABASE_URL` environment variable pointing to the
production PostgreSQL database.

After deployment, open `/api/health`. A successful response contains
`"ok": true` and `"database": "connected"`.
