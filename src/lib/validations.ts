import { z } from 'zod';

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'login',
  'panel',
  '_next',
  'public',
  'static',
  'auth',
  'uploads',
  'favicon.ico',
];

export const slugSchema = z
  .string()
  .min(3, 'Mağaza linki (slug) en az 3 karakter olmalıdır.')
  .max(30, 'Mağaza linki (slug) en fazla 30 karakter olabilir.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Mağaza linki sadece küçük harfler, rakamlar ve tek tire (-) içerebilir.'
  )
  .refine(
    (val) => !RESERVED_SLUGS.includes(val.toLowerCase()),
    'Bu link adı sistem tarafından ayrılmıştır, kullanılamaz.'
  );

export const storeCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Mağaza adı en az 2 karakter olmalıdır.')
    .max(100, 'Mağaza adı en fazla 100 karakter olabilir.'),
  slug: slugSchema,
  tagline: z.string().trim().max(200, 'Slogan en fazla 200 karakter olabilir.').optional().nullable(),
  whatsappPhone: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, 'WhatsApp numarası 10-15 haneli rakamlardan oluşmalıdır.'),
  instagramHandle: z
    .string()
    .trim()
    .min(1, 'Instagram kullanıcı adı zorunludur.')
    .max(50, 'Instagram kullanıcı adı en fazla 50 karakter olabilir.')
    .transform((val) => val.replace(/^@/, '')),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Geçersiz tema rengi kodu.')
    .optional()
    .default('#3c302a'),
});

export const storeUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  tagline: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(1000, 'Açıklama en fazla 1000 karakter olabilir.').optional().nullable(),
  whatsappPhone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 10 && v.length <= 15, 'Geçerli bir telefon numarası giriniz.')
    .optional(),
  instagramHandle: z
    .string()
    .trim()
    .max(50)
    .transform((v) => v.replace(/^@/, ''))
    .optional(),
  shippingFee: z.number().min(0, 'Kargo ücreti negatif olamaz.').max(10000).optional(),
  freeShippingThreshold: z.number().min(0).max(100000).optional(),
  address: z.string().trim().max(300, 'Adres en fazla 300 karakter olabilir.').optional().nullable(),
  allowStorePickup: z.boolean().optional(),
  ibanInfo: z.string().trim().max(150, 'IBAN bilgisi en fazla 150 karakter olabilir.').optional().nullable(),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Varyant adı zorunludur.').max(50, 'Varyant adı en fazla 50 karakter olabilir.'),
  priceDiff: z.number().min(-100000).max(100000).default(0),
  stock: z.number().int().min(0, 'Stok negatif olamaz.').max(100000).default(0),
});

export const productCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ürün adı zorunludur.')
    .max(150, 'Ürün adı en fazla 150 karakter olabilir.'),
  description: z
    .string()
    .trim()
    .max(2000, 'Açıklama en fazla 2000 karakter olabilir.')
    .optional()
    .nullable(),
  price: z.number().min(0, 'Fiyat negatif olamaz.').max(1000000, 'Geçersiz fiyat.'),
  compareAtPrice: z.number().min(0).max(1000000).optional().nullable(),
  imageUrl: z
    .string()
    .trim()
    .min(1, 'Görsel linki zorunludur.')
    .max(1000, 'Görsel URL çok uzun.'),
  category: z.string().trim().max(50).optional().default('Genel'),
  stock: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().optional().default(true),
  hideWhenOutOfStock: z.boolean().optional().default(false),
  instagramPostUrl: z.string().trim().max(500).optional().nullable(),
  variants: z.array(productVariantSchema).optional().default([]),
});

export const productUpdateSchema = productCreateSchema.partial();

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Ürün kimliği zorunludur.'),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1, 'Adet en az 1 olmalıdır.').max(50, 'Tek siparişte en fazla 50 adet seçilebilir.'),
});

export const orderCreateSchema = z.object({
  storeSlug: z.string().optional(),
  storeId: z.string().optional(),
  customerName: z
    .string()
    .trim()
    .min(2, 'Müşteri adı en az 2 karakter olmalıdır.')
    .max(100, 'Müşteri adı en fazla 100 karakter olabilir.'),
  customerPhone: z
    .string()
    .trim()
    .min(10, 'Telefon numarası en az 10 haneli olmalıdır.')
    .max(20, 'Telefon numarası en fazla 20 karakter olabilir.'),
  customerAddress: z
    .string()
    .trim()
    .max(500, 'Adres en fazla 500 karakter olabilir.')
    .optional()
    .nullable(),
  deliveryType: z.enum(['SHIPPING', 'STORE_PICKUP']),
  paymentMethod: z.enum(['IBAN_TRANSFER', 'CASH_ON_DELIVERY', 'PAY_AT_STORE']),
  channel: z.enum(['WHATSAPP', 'INSTAGRAM_DM']),
  note: z.string().trim().max(500, 'Sipariş notu en fazla 500 karakter olabilir.').optional().nullable(),
  items: z.array(orderItemSchema).min(1, 'Sipariş için en az bir ürün gereklidir.'),
});
