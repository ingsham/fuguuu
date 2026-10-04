import { z } from 'zod';

export const shippingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  country: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  address1: z.string().trim().min(5).max(200),
  address2: z.string().trim().max(200).optional().default(''),
  postalCode: z.string().trim().max(30).optional().default(''),
});

export type ShippingAddress = z.infer<typeof shippingSchema>;
