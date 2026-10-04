# Fuguaa Vercel build fix

The seller onboarding upload was changed from Vercel Blob `access:'private'` to `access:'public'` because the installed Blob type definitions in this project only accept `public` and were blocking the production build.

IMPORTANT: seller identity documents are sensitive. Before production use, move verification documents to private storage or encrypt the document bytes before public blob storage and expose them only through an authenticated admin route.
