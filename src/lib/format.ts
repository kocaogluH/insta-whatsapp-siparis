export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '9' + digits;
  if (digits.length === 10) return '90' + digits;
  return digits;
}

export interface OrderMessagePayload {
  orderNumber: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryType: 'SHIPPING' | 'STORE_PICKUP';
  paymentMethod: 'IBAN_TRANSFER' | 'CASH_ON_DELIVERY' | 'PAY_AT_STORE';
  items: {
    productName: string;
    variantName?: string | null;
    sku?: string | null;
    quantity: number;
    unitPrice: number;
  }[];
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  note?: string;
  ibanInfo?: string | null;
}

const DELIVERY_LABELS: Record<string, string> = {
  SHIPPING: 'Adrese Kargo',
  STORE_PICKUP: 'Mağazadan Gel-Al (Fiziksel Mağaza)',
};

const PAYMENT_LABELS: Record<string, string> = {
  IBAN_TRANSFER: 'Havale / EFT (IBAN)',
  CASH_ON_DELIVERY: 'Kapıda Ödeme',
  PAY_AT_STORE: 'Mağazada Ödeme',
};

export function buildOrderMessage(payload: OrderMessagePayload): string {
  const lines: string[] = [];
  lines.push(`🛍️ *YENİ SİPARİŞ - ${payload.orderNumber}*`);
  lines.push(`🏪 *Mağaza:* ${payload.storeName}`);
  lines.push(`────────────────────`);
  lines.push(`📦 *Sipariş Edilen Ürünler:*`);

  payload.items.forEach((item, index) => {
    const variantText = item.variantName ? ` (${item.variantName})` : '';
    const skuText = item.sku ? ` [${item.sku}]` : '';
    const lineTotal = formatCurrency(item.unitPrice * item.quantity);
    lines.push(
      `${index + 1}. ${item.productName}${variantText}${skuText}\n   ${item.quantity} Adet x ${formatCurrency(item.unitPrice)} = *${lineTotal}*`
    );
  });

  lines.push(`────────────────────`);
  lines.push(`Ara Toplam: ${formatCurrency(payload.subtotal)}`);
  lines.push(
    `Kargo: ${payload.shippingCost === 0 ? 'Ücretsiz (0,00 ₺)' : formatCurrency(payload.shippingCost)}`
  );
  lines.push(`💰 *GENEL TOPLAM: ${formatCurrency(payload.totalAmount)}*`);
  lines.push(`────────────────────`);
  lines.push(`👤 *Müşteri Bilgileri:*`);
  lines.push(`• Ad Soyad: ${payload.customerName}`);
  lines.push(`• Telefon: ${payload.customerPhone}`);
  lines.push(`• Teslimat: ${DELIVERY_LABELS[payload.deliveryType] || payload.deliveryType}`);
  lines.push(`• Adres: ${payload.customerAddress}`);
  lines.push(`• Ödeme Tercihi: ${PAYMENT_LABELS[payload.paymentMethod] || payload.paymentMethod}`);

  if (payload.note && payload.note.trim()) {
    lines.push(`• Sipariş Notu: ${payload.note.trim()}`);
  }

  if (payload.paymentMethod === 'IBAN_TRANSFER' && payload.ibanInfo) {
    lines.push(`────────────────────`);
    lines.push(`🏦 *IBAN Bilgisi:* ${payload.ibanInfo}`);
  }

  lines.push(`\nSiparişimi onaylamak için gönderiyorum.`);
  return lines.join('\n');
}

export function buildProductQuestionWhatsAppUrl(
  storePhone: string,
  productName: string,
  price: number,
  sku?: string | null,
  variantName?: string | null
): string {
  const cleanPhone = cleanPhoneForWhatsApp(storePhone);
  const variantPart = variantName ? ` (${variantName})` : '';
  const skuPart = sku ? ` [Kod: ${sku}]` : '';
  const text = `Merhaba 👋 Vitrininizdeki *${productName}${variantPart}*${skuPart} (${formatCurrency(
    price
  )}) ürünü hakkında bilgi almak istiyorum. Stok durumu uygun mudur?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function buildCustomerStatusWhatsAppUrl(
  customerPhone: string,
  customerName: string,
  orderNumber: string,
  storeName: string,
  status: string,
  totalAmount: number
): string {
  const cleanPhone = cleanPhoneForWhatsApp(customerPhone);
  const statusMap: Record<string, string> = {
    NEW: 'Siparişiniz alındı ve sıraya eklendi ✅',
    PREPARING: 'Siparişiniz şu anda özenle hazırlanıyor 📦',
    SHIPPED: 'Siparişiniz kargoya / teslimata çıkarıldı 🚚',
    COMPLETED: 'Siparişiniz teslim edildi. İyi günlerde kullanın! 🎉',
    CANCELLED: 'Siparişiniz iptal edilmiştir ❌',
  };
  const statusMessage = statusMap[status] || status;
  const text = `Merhaba *${customerName}* 👋\n\n*${storeName}* mağazamızdan verdiğiniz *#${orderNumber}* numaralı (${formatCurrency(
    totalAmount
  )}) siparişinizin durumu güncellendi:\n\n👉 *${statusMessage}*\n\nHerhangi bir sorunuz olursa bu mesaj üzerinden bize ulaşabilirsiniz.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
