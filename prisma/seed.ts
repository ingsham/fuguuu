import { PrismaClient, Role, VerificationStatus, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@fuguaa.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, isActive: true },
    create: {
      name: 'Fuguaa Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: Role.ADMIN,
      country: 'Ghana',
    },
  });

  // Keep the demo catalogue idempotent so every Vercel deployment can safely run the seed.
  const data = [
    ['Amina Yakubu','Northern Looms','Northern Region'],
    ['Kofi Mensah','Savannah Threads','Upper East Region'],
    ['Adwoa Asare','Heritage Stitch','Ashanti Region'],
  ];

  for (const [name, shop, region] of data) {
    const email = shop.toLowerCase().replace(/[^a-z]/g,'') + '@example.com';
    const u = await prisma.user.upsert({
      where: { email },
      update: { role: Role.SELLER, isActive: true },
      create: {
        name,
        email,
        passwordHash: await bcrypt.hash('Seller123!', 12),
        role: Role.SELLER,
        country: 'Ghana',
      },
    });

    const s = await prisma.sellerProfile.upsert({
      where: { userId: u.id },
      update: {
        shopName: shop,
        region,
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
      create: {
        userId: u.id,
        shopName: shop,
        region,
        country: 'Ghana',
        bio: `Traditional craftsmanship from ${region}.`,
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    for (const [title, price] of [
      ['Classic Indigo Smock', 280],
      ['Festival Heritage Smock', 340],
      ['Everyday Cotton Smock', 220],
    ] as [string, number][]) {
      const slug = (title + '-' + shop).toLowerCase().replace(/[^a-z0-9]+/g,'-');
      await prisma.product.upsert({
        where: { slug },
        update: { sellerId: s.id, price, stock: 12, status: ProductStatus.ACTIVE },
        create: {
          sellerId: s.id,
          title,
          slug,
          price,
          stock: 12,
          status: ProductStatus.ACTIVE,
          description: 'A carefully crafted Ghanaian smock combining traditional weaving with modern comfort.',
          sizes: ['M','L','XL'],
          colors: ['Indigo','Cream'],
          fabricType: 'Handwoven cotton',
          occasionTags: ['festival','wedding','everyday'],
          sizeGuide: 'Chest: 40–44 inches. Shoulder: 17–19 inches.',
          images: {
            create: {
              url: '/fuguaa-mark.png',
              altText: `${title} — Fuguaa`,
            },
          },
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error('PRISMA_SEED_ERROR', error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
