# Fuguaa Vercel build fix

The seller onboarding upload was changed from Vercel Blob `access:'private'` to `access:'public'` because the installed Blob type definitions in this project only accept `public` and were blocking the production build.

IMPORTANT: seller identity documents are sensitive. Before production use, move verification documents to private storage or encrypt the document bytes before public blob storage and expose them only through an authenticated admin route.

## Latest deployment fixes
- `/auth/login` now wraps `useSearchParams()` in `Suspense`, preventing Next.js 14 production prerender failure.
- `/dashboard/admin` and session-dependent admin pages are explicitly dynamic.
- Production seed requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`; no weak default admin password is used in production.
- Set all required environment variables in Vercel for the Production environment before deploying.
