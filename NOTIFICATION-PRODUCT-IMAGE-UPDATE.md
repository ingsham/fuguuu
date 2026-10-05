# Notification product image update

This version updates in-app notifications so sale notifications include the purchased product's first image, product title, order ID, product ID, and seller shop name.

- Seller sale notifications show the purchased product image and product details.
- Admin sale notifications are created per seller order and show only the seller associated with that particular sale, plus the product image/details.
- Notification history and the header notification dropdown display the product image.
- The Prisma schema adds nullable notification metadata fields. The existing Vercel build command uses `prisma db push`, so the new fields will be applied during deployment.

No payment secrets are included in this ZIP.
