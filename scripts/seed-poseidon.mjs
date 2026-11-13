/**
 * ==============================================================================
 * Poseidon Yazılım - Otomatik Vitrin & Katalog Doldurma Scripti
 * 
 * Kullanım (Windows PowerShell):
 *   $env:BUTIK_PIN="6_HANELI_PININIZ"; node scripts/seed-poseidon.mjs
 *
 * Opsiyonel Değişkenler:
 *   BASE_URL   (varsayılan: https://fiyat-cepte.vercel.app)
 *   BUTIK_SLUG (varsayılan: poseidonyazilim)
 * ==============================================================================
 */

const BASE_URL = (process.env.BASE_URL || 'https://fiyat-cepte.vercel.app').replace(/\/+$/, '');
const BUTIK_SLUG = (process.env.BUTIK_SLUG || 'poseidonyazilim').trim();
const BUTIK_PIN = process.env.BUTIK_PIN?.trim();

if (!BUTIK_PIN) {
  console.error('\n❌ HATA: BUTIK_PIN ortam değişkeni tanımlanmamış!');
  console.error('Örnek Çalıştırma (Windows PowerShell):');
  console.error('  $env:BUTIK_PIN="123456"; node scripts/seed-poseidon.mjs\n');
  process.exit(1);
}

const ORIGIN = new URL(BASE_URL).origin;

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function extractCookie(cookieHeaders, cookieName) {
  for (const header of cookieHeaders) {
    const firstPart = header.split(';')[0]?.trim();
    if (firstPart && firstPart.startsWith(`${cookieName}=`)) {
      return firstPart;
    }
  }
  return null;
}

const POSEIDON_PRODUCTS = [
  // --- A) YAZILIM & DİJİTAL HİZMET PAKETLERİ ---
  {
    name: 'Kurumsal Web Sitesi & Yönetim Paneli',
    description:
      'Mobil uyumlu, hızlı, SEO altyapılı modern kurumsal web sitesi ve kolay içerik yönetim paneli. SSL ve temel performans optimizasyonu dahildir.',
    price: 7500,
    compareAtPrice: 9500,
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
    category: 'Web Yazılım',
    sku: 'PSD-WEB-001',
    stock: 20,
    variants: [
      { name: 'Tek Sayfa (Landing)', priceDiff: 0, stock: 10 },
      { name: 'Çok Sayfalı Kurumsal', priceDiff: 3500, stock: 6 },
      { name: 'Özel Tasarım + SEO', priceDiff: 6000, stock: 4 },
    ],
  },
  {
    name: 'E-Ticaret & Instagram Sipariş Sistemi',
    description:
      'Instagram bio linkinden doğrudan WhatsApp ve IBAN destekli sipariş alan, stok & varyant takipli yeni nesil hızlı mağaza altyapısı.',
    price: 9900,
    compareAtPrice: 12500,
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
    category: 'E-Ticaret',
    sku: 'PSD-ETC-002',
    stock: 15,
    variants: [
      { name: 'Standart Mağaza', priceDiff: 0, stock: 10 },
      { name: 'Çoklu Şube / Kasa Modülü', priceDiff: 4000, stock: 5 },
    ],
  },
  {
    name: 'Özel İş Otomasyonu & API Entegrasyonu',
    description:
      'İşletmenize özel WhatsApp bildirim botları, fatura/kargo entegrasyonları ve tekrarlayan işleri otomatikleştiren bulut yazılımlar.',
    price: 6500,
    compareAtPrice: 8000,
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
    category: 'Özel Yazılım',
    sku: 'PSD-API-003',
    stock: 10,
    variants: [
      { name: 'WhatsApp / CRM Bot', priceDiff: 0, stock: 6 },
      { name: 'Pazaryeri & ERP Entegrasyon', priceDiff: 4500, stock: 4 },
    ],
  },
  {
    name: 'Mobil Uygulama Geliştirme (iOS & Android)',
    description:
      'Tek kod tabanıyla hem App Store hem Google Play için yüksek performanslı, bildirim destekli modern mobil uygulama çözümleri.',
    price: 18500,
    compareAtPrice: 24000,
    imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80',
    category: 'Mobil Uygulama',
    sku: 'PSD-MOB-004',
    stock: 8,
    variants: [
      { name: 'MVP Başlangıç Paketi', priceDiff: 0, stock: 5 },
      { name: 'Tam Sürüm + Mağaza Yayını', priceDiff: 9500, stock: 3 },
    ],
  },
  {
    name: 'UI/UX Arayüz & Kurumsal Marka Kimliği',
    description:
      'Markanız için modern logo, renk paleti, sosyal medya şablonları ve kullanıcı dostu web/mobil arayüz tasarımları.',
    price: 4200,
    compareAtPrice: 5500,
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&q=80',
    category: 'Tasarım',
    sku: 'PSD-UIX-005',
    stock: 14,
    variants: [
      { name: 'Logo & Sosyal Medya Kiti', priceDiff: 0, stock: 8 },
      { name: 'Komple Web & Mobil UI/UX', priceDiff: 3800, stock: 6 },
    ],
  },

  // --- B) TEKNOLOJİ & DONANIM ÜRÜNLERİ ---
  {
    name: 'Mekanik RGB Geliştirici Klavyesi (Kablosuz)',
    description:
      'Alüminyum gövde, çift modlu Bluetooth + Type-C bağlantı, uzun pil ömrü ve sessiz/tok tuş hissiyatı sunan kompakt mekanik klavye.',
    price: 2490,
    compareAtPrice: 2990,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
    category: 'Donanım',
    sku: 'PSD-HW-101',
    stock: 18,
    variants: [
      { name: 'Red Switch / Türkçe Q', priceDiff: 0, stock: 10 },
      { name: 'Brown Switch / Türkçe Q', priceDiff: 150, stock: 8 },
    ],
  },
  {
    name: 'Ergonomik Kablosuz Dikey Mouse',
    description:
      'Uzun çalışma saatlerinde bilek yorgunluğunu azaltan ergonomik tasarım, ayarlanabilir DPI ve sessiz tıklama teknolojisi.',
    price: 1190,
    compareAtPrice: 1490,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80',
    category: 'Donanım',
    sku: 'PSD-HW-102',
    stock: 25,
    variants: [
      { name: 'Mat Siyah', priceDiff: 0, stock: 15 },
      { name: 'Uzay Grisi', priceDiff: 0, stock: 10 },
    ],
  },
  {
    name: 'USB-C 8-in-1 Alüminyum Hub & Adaptör',
    description:
      '4K HDMI çıkışı, 100W hızlı şarj (PD), Gigabit Ethernet ve yüksek hızlı USB 3.0 portlarıyla tüm cihazlar için tek merkez.',
    price: 890,
    compareAtPrice: 1150,
    imageUrl: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?auto=format&fit=crop&w=900&q=80',
    category: 'Aksesuar',
    sku: 'PSD-ACC-103',
    stock: 30,
    variants: [
      { name: 'Uzay Grisi (8 Port)', priceDiff: 0, stock: 30 },
    ],
  },
];

async function main() {
  console.log(`\n🚀 Poseidon Yazılım (${BUTIK_SLUG}) mağazası dolduruluyor...`);
  console.log(`🌐 Hedef: ${BASE_URL}\n`);

  const baseHeaders = {
    'Content-Type': 'application/json',
    Origin: ORIGIN,
    Referer: `${BASE_URL}/`,
  };

  // 1. Satıcı Girişi
  const loginRes = await fetch(`${BASE_URL}/api/store/${BUTIK_SLUG}/login`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ pin: BUTIK_PIN }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    console.error(`❌ Giriş başarısız (HTTP ${loginRes.status}):`, err.error || loginRes.statusText);
    process.exit(1);
  }

  const sellerCookie = extractCookie(getSetCookieHeaders(loginRes), 'seller_session');
  if (!sellerCookie) {
    console.error('❌ Oturum çerezi (seller_session) alınamadı.');
    process.exit(1);
  }
  console.log('✅ Satıcı oturumu başarıyla açıldı.');

  const authHeaders = {
    ...baseHeaders,
    Cookie: sellerCookie,
  };

  // 2. Mevcut Ürünleri Kontrol Et (Tekrar eklemeyi önle)
  const panelRes = await fetch(`${BASE_URL}/api/store/${BUTIK_SLUG}/panel-data`, {
    method: 'GET',
    headers: { Cookie: sellerCookie },
  });

  if (!panelRes.ok) {
    console.error(`❌ Mağaza verileri okunamadı (HTTP ${panelRes.status}).`);
    process.exit(1);
  }

  const storeData = await panelRes.json();
  const existingNames = new Set((storeData.products || []).map((p) => p.name.trim().toLowerCase()));

  // Mağaza logosunu, bannerını, adresini, slogan ve açıklamasını güncelle
  const patchRes = await fetch(`${BASE_URL}/api/store/${BUTIK_SLUG}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      logoUrl: '/images/poseidon/logo.jpg',
      bannerUrl: '/images/poseidon/banner.jpg',
      storeType: 'SERVICE',
      freeShippingThreshold: null,
      address: storeData.address || 'Antakya / Hatay',
      tagline: storeData.tagline || 'Poseidon Enterprise Solutions — Web, Mobil & Özel Yazılım Çözümleri',
      description:
        storeData.description ||
        'Poseidon Yazılım (Antakya / Hatay) olarak işletmenizi dijital dünyada öne çıkaran kurumsal web, e-ticaret, mobil uygulama ve donanım çözümleri sunuyoruz. WhatsApp üzerinden hızlı teklif ve sipariş verebilirsiniz.',
    }),
  });

  if (patchRes.ok) {
    console.log('✅ Mağaza logosu (/images/poseidon/logo.jpg), bannerı (/images/poseidon/banner.jpg) ve profil bilgileri güncellendi.');
  } else {
    const err = await patchRes.json().catch(() => ({}));
    console.warn('⚠️ Mağaza profili güncellenemedi:', err.error || patchRes.status);
  }

  // 3. Ürünleri Ekle
  let addedCount = 0;
  let skippedCount = 0;

  for (const product of POSEIDON_PRODUCTS) {
    if (existingNames.has(product.name.trim().toLowerCase())) {
      console.log(`⏭️  Atlandı (zaten mevcut): ${product.name}`);
      skippedCount++;
      continue;
    }

    const createRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(product),
    });

    if (createRes.ok) {
      console.log(`✨ Eklendi: ${product.name} (${product.price} ₺)`);
      addedCount++;
    } else {
      const err = await createRes.json().catch(() => ({}));
      console.error(`❌ Eklenemedi (${product.name}):`, err.error || createRes.status);
    }
  }

  console.log('\n=============================================================');
  console.log(`🎉 İşlem Tamamlandı! Eklenen: ${addedCount} | Atlanan: ${skippedCount}`);
  console.log(`🔗 Vitrin Linki: ${BASE_URL}/${BUTIK_SLUG}`);
  console.log(`🛠️  Panel Linki : ${BASE_URL}/${BUTIK_SLUG}/panel`);
  console.log('=============================================================\n');
}

main().catch((err) => {
  console.error('❌ Beklenmeyen hata:', err);
  process.exit(1);
});
