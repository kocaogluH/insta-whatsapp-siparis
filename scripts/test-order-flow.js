function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function cleanPhoneForWhatsApp(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '9' + digits;
  if (digits.length === 10) return '90' + digits;
  return digits;
}

const DELIVERY_LABELS = {
  SHIPPING: 'Adrese Kargo',
  STORE_PICKUP: 'Mağazadan Gel-Al (Fiziksel Mağaza)',
};

const PAYMENT_LABELS = {
  IBAN_TRANSFER: 'Havale / EFT (IBAN)',
  CASH_ON_DELIVERY: 'Kapıda Ödeme',
  PAY_AT_STORE: 'Mağazada Ödeme',
};

function buildOrderMessage(payload) {
  const lines = [];
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

const mockOrder = {
  orderNumber: 'SIP-1002-841',
  storeName: 'Nişantaşı Butik & Atölye',
  customerName: 'Ayşe Yılmaz',
  customerPhone: '0532 123 45 67',
  customerAddress: 'Bağdat Caddesi No:120 Kadıköy/İstanbul',
  deliveryType: 'SHIPPING',
  paymentMethod: 'IBAN_TRANSFER',
  items: [
    {
      productName: 'Yüksek Bel Palazzo Pantolon',
      variantName: '36 Beden / Bej',
      quantity: 1,
      unitPrice: 780,
    },
    {
      productName: 'Oversize Keten Gömlek - Doğal Dokulu',
      variantName: 'S / Ekru',
      quantity: 1,
      unitPrice: 649.9,
    },
  ],
  subtotal: 1429.9,
  shippingCost: 0,
  totalAmount: 1429.9,
  note: 'Lütfen hediye paketi yapılsın.',
  ibanInfo: 'TR12 0006 2000 0000 0123 4567 89 (Nişantaşı Butik Tekstil)',
};

const messageText = buildOrderMessage(mockOrder);
console.log('--- OLUŞTURULAN WHATSAPP SİPARİŞ MESAJI ---');
console.log(messageText);

const cleanPhone = cleanPhoneForWhatsApp('05321234567');
const targetUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

console.log('\n--- HEDEF WHATSAPP LINKI ---');
console.log(targetUrl);
console.log('\n- Temizlenmiş Telefon:', cleanPhone);
console.log('- Test Başarılı ✓');
