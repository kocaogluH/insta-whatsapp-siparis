/**
 * ==============================================================================
 * DİKKAT / UYARI:
 * Bu test scripti, Brute-Force korumasını doğrulamak için 6. adımda peş peşe 
 * hatalı giriş denemeleri yaparak testi çalıştıran IP adresini 15 DAKİKA KİLİTLER.
 * 
 * Bu nedenle Test 6 en sonda çalıştırılır ve tamamlandıktan sonra testin yapıldığı
 * IP adresinden admin paneline 15 dakika boyunca giriş yapılamaz (HTTP 429).
 * ==============================================================================
 */

// 1. Ortam Değişkenleri Kontrolü (Koda gömülü hiçbir gizli bilgi/şifre olmamalıdır)
const rawBaseUrl = process.env.BASE_URL?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
const BUTIK_SLUG = process.env.BUTIK_SLUG?.trim();
const BUTIK_PIN = process.env.BUTIK_PIN?.trim();

if (!rawBaseUrl || !ADMIN_PASSWORD || !BUTIK_SLUG || !BUTIK_PIN) {
  console.error('\n❌ HATA: Eksik ortam değişkeni tespit edildi!');
  console.error('Lütfen şu 4 değişkeni tanımlayarak çalıştırın:\n');
  console.error('  BASE_URL        : Hedef site adresi (örn: https://fiyat-cepte.vercel.app)');
  console.error('  ADMIN_PASSWORD  : Süper admin parolası');
  console.error('  BUTIK_SLUG      : Test edilecek butik slug adı (örn: butikmoda)');
  console.error('  BUTIK_PIN       : Butik satıcısının 6 haneli PIN kodu\n');
  console.error('Örnek Çalıştırma (Linux / macOS / Git Bash):');
  console.error('  BASE_URL=https://fiyat-cepte.vercel.app ADMIN_PASSWORD=... BUTIK_SLUG=butikmoda BUTIK_PIN=... node scripts/security-check.mjs\n');
  console.error('Örnek Çalıştırma (Windows PowerShell):');
  console.error('  $env:BASE_URL="https://fiyat-cepte.vercel.app"; $env:ADMIN_PASSWORD="..."; $env:BUTIK_SLUG="butikmoda"; $env:BUTIK_PIN="..."; node scripts/security-check.mjs\n');
  process.exit(1);
}

const BASE_URL = rawBaseUrl.replace(/\/+$/, '');
const ORIGIN = new URL(BASE_URL).origin;

let passCount = 0;
let failCount = 0;

function logPass(num, title, detail = '') {
  passCount++;
  console.log(`\x1b[32m[PASS]\x1b[0m Test ${num}: ${title}`);
  if (detail) console.log(`       └─> ${detail}`);
}

function logFail(num, title, detail = '') {
  failCount++;
  console.log(`\x1b[31m[FAIL]\x1b[0m Test ${num}: ${title}`);
  if (detail) console.log(`       └─> \x1b[33m${detail}\x1b[0m`);
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function extractCookie(cookieHeaders, cookieName) {
  for (const header of cookieHeaders) {
    const parts = header.split(';');
    const firstPart = parts[0]?.trim();
    if (firstPart && firstPart.startsWith(`${cookieName}=`)) {
      return firstPart;
    }
  }
  return null;
}

async function runSecurityAudit() {
  console.log('\n=============================================================');
  console.log('🔒 INSTASİPARİŞ GÜVENLİK VE ERİŞİM DENETİM TESTİ BAŞLATILIYOR');
  console.log(`🎯 Hedef: ${BASE_URL}`);
  console.log(`🏪 Test Mağazası: ${BUTIK_SLUG}`);
  console.log('=============================================================\n');

  // Ortak İstek Başlıkları (CSRF Origin korumasına uyumlu)
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Origin: ORIGIN,
    Referer: `${BASE_URL}/`,
  };

  // --------------------------------------------------------------------------
  // TEST 1: Yanlış admin şifresi 401 dönüyor mu?
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ password: `wrong-test-pwd-${Date.now()}` }),
    });

    if (res.status === 401) {
      logPass(1, 'Yanlış admin şifresi 401 dönüyor', `HTTP ${res.status}`);
    } else {
      logFail(1, 'Yanlış admin şifresi 401 dönmedi', `Beklenen: 401, Dönen: ${res.status}`);
    }
  } catch (err) {
    logFail(1, 'Yanlış admin şifresi testi sırasında bağlantı hatası', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Doğru girişte gelen admin_session çerezi HttpOnly, Secure ve SameSite bayraklarını içeriyor mu?
  // --------------------------------------------------------------------------
  let adminCookie = null;
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ password: ADMIN_PASSWORD }),
    });

    if (res.status !== 200) {
      logFail(2, 'Doğru admin şifresi ile giriş yapılamadı', `HTTP ${res.status}`);
    } else {
      const setCookies = getSetCookieHeaders(res);
      const adminSessionHeader = setCookies.find((c) => c.toLowerCase().includes('admin_session='));

      if (!adminSessionHeader) {
        logFail(2, 'Set-Cookie başlığında admin_session çerezi bulunamadı');
      } else {
        const lowerHeader = adminSessionHeader.toLowerCase();
        const hasHttpOnly = lowerHeader.includes('httponly');
        const hasSecure = lowerHeader.includes('secure');
        const hasSameSite = lowerHeader.includes('samesite');

        adminCookie = extractCookie(setCookies, 'admin_session');

        if (hasHttpOnly && hasSecure && hasSameSite) {
          logPass(
            2,
            'admin_session çerezi HttpOnly, Secure ve SameSite bayraklarını içeriyor',
            `Bayraklar doğrulandı: HttpOnly=${hasHttpOnly}, Secure=${hasSecure}, SameSite=${hasSameSite}`
          );
        } else {
          logFail(
            2,
            'admin_session çerezinde eksik güvenlik bayrakları var',
            `HttpOnly: ${hasHttpOnly}, Secure: ${hasSecure}, SameSite: ${hasSameSite} | Ham Başlık: ${adminSessionHeader}`
          );
        }
      }
    }
  } catch (err) {
    logFail(2, 'Admin oturum çerezi testi sırasında bağlantı hatası', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Giriş yapmadan /admin yönlendirmesi ve /{BUTIK_SLUG}/panel veri izolasyonu kontrolü
  // - /admin: 3xx veya 401/403 ile engellenmeli (redirect: "manual")
  // - /{BUTIK_SLUG}/panel: 200 dönmesi kabul edilir, ancak HTML gövdesinde sipariş/müşteri JSON sızıntısı olmamalı
  // - /api/store/{BUTIK_SLUG}/panel-data: Oturum olmadan 401 veya 403 dönmeli
  // --------------------------------------------------------------------------
  try {
    const [resAdmin, resStorePage, resStoreApi] = await Promise.all([
      fetch(`${BASE_URL}/admin`, {
        method: 'GET',
        redirect: 'manual',
      }),
      fetch(`${BASE_URL}/${BUTIK_SLUG}/panel`, {
        method: 'GET',
      }),
      fetch(`${BASE_URL}/api/store/${BUTIK_SLUG}/panel-data`, {
        method: 'GET',
      }),
    ]);

    const isAdminProtected =
      (resAdmin.status >= 300 && resAdmin.status < 400) ||
      resAdmin.status === 401 ||
      resAdmin.status === 403;

    const isApiProtected = resStoreApi.status === 401 || resStoreApi.status === 403;

    // Oturumsuz panel sayfası HTML gövdesinde hassas veri (sipariş, müşteri, PIN hash, IBAN vb.) sızıntı kontrolü
    const htmlBody = await resStorePage.text();
    const sensitivePatterns = [
      { name: 'sipariş listesi JSON ("orders": [...])', regex: /"orders"\s*:\s*\[/ },
      { name: 'müşteri telefon JSON ("customerPhone": ...)', regex: /"customerPhone"\s*:/ },
      { name: 'müşteri adı JSON ("customerName": ...)', regex: /"customerName"\s*:/ },
      { name: 'IBAN bilgisi JSON ("ibanInfo": ...)', regex: /"ibanInfo"\s*:\s*"[^"]+"/ },
      { name: 'PIN hash ("pinHash": ...)', regex: /"pinHash"\s*:/ },
      { name: 'PIN kodu ("pinCode": ...)', regex: /"pinCode"\s*:/ },
    ];

    const leakedPattern = sensitivePatterns.find((p) => p.regex.test(htmlBody));

    if (isAdminProtected && isApiProtected && !leakedPattern) {
      logPass(
        3,
        '/admin yönlendirildi, panel API verisi (401/403) korundu ve HTML sızıntısı yok',
        `/admin: HTTP ${resAdmin.status}, panel-data: HTTP ${resStoreApi.status}, HTML Sızıntı Kontrolü: TEMİZ (Sipariş/Müşteri verisi sızmıyor)`
      );
    } else {
      let detail = '';
      if (!isAdminProtected) {
        detail += `/admin HTTP ${resAdmin.status} döndü (3xx/401/403 bekleniyordu). `;
      }
      if (!isApiProtected) {
        detail += `panel-data API HTTP ${resStoreApi.status} döndü (401 veya 403 bekleniyordu). `;
      }
      if (leakedPattern) {
        detail += `Panel HTML gövdesinde sızan veri bulundu: ${leakedPattern.name}! `;
      }
      logFail(3, 'Yetkisiz erişim veya veri sızıntısı tespit edildi', detail.trim());
    }
  } catch (err) {
    logFail(3, 'Yetkisiz erişim kontrolü testi sırasında bağlantı hatası', err.message);
  }

  // --------------------------------------------------------------------------
  // Satıcı Oturumu Al (Test 4 ve Test 5 için hazırlık)
  // --------------------------------------------------------------------------
  let sellerCookie = null;
  try {
    const storeLoginRes = await fetch(`${BASE_URL}/api/store/${BUTIK_SLUG}/login`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ pin: BUTIK_PIN }),
    });

    if (storeLoginRes.ok) {
      const setCookies = getSetCookieHeaders(storeLoginRes);
      sellerCookie = extractCookie(setCookies, 'seller_session');
    }
  } catch (err) {
    console.warn(`[UYARI] Butik satıcı oturumu alınamadı (${err.message}). Test 4 ve 5 etkilenebilir.`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Butik satıcı oturumuyla /admin altındaki sayfalara ve API'lere erişilebiliyor mu? (Erişilememeli)
  // --------------------------------------------------------------------------
  try {
    if (!sellerCookie) {
      logFail(4, 'Test 4 çalıştırılamadı: Geçerli butik satıcı oturumu oluşturulamadı (PIN kontrol edin)');
    } else {
      const [resAdminPage, resAdminApi] = await Promise.all([
        fetch(`${BASE_URL}/admin`, {
          method: 'GET',
          headers: { Cookie: sellerCookie },
          redirect: 'manual',
        }),
        fetch(`${BASE_URL}/api/admin/stores`, {
          method: 'GET',
          headers: { Cookie: sellerCookie },
          redirect: 'manual',
        }),
      ]);

      const isPageBlocked =
        (resAdminPage.status >= 300 && resAdminPage.status < 400) ||
        resAdminPage.status === 401 ||
        resAdminPage.status === 403;

      const isApiBlocked = resAdminApi.status === 401 || resAdminApi.status === 403;

      if (isPageBlocked && isApiBlocked) {
        logPass(
          4,
          'Butik satıcı oturumuyla /admin sayfalarına ve API\'lerine erişim engellendi',
          `/admin: HTTP ${resAdminPage.status}, /api/admin/stores: HTTP ${resAdminApi.status}`
        );
      } else {
        logFail(
          4,
          'Butik satıcı oturumu /admin kaynaklarına yetkisiz erişebildi!',
          `/admin: HTTP ${resAdminPage.status}, /api/admin/stores: HTTP ${resAdminApi.status}`
        );
      }
    }
  } catch (err) {
    logFail(4, 'Satıcı yetki sınırlandırma testi sırasında bağlantı hatası', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Butik satıcı oturumuyla başka bir butiğin panel yoluna ve API'sine erişilebiliyor mu? (Erişilememeli)
  // --------------------------------------------------------------------------
  try {
    if (!sellerCookie) {
      logFail(5, 'Test 5 çalıştırılamadı: Geçerli butik satıcı oturumu yok');
    } else {
      const foreignSlug = `diger-butik-deneme-${Date.now()}`;
      const [resForeignData, resForeignPinChange] = await Promise.all([
        fetch(`${BASE_URL}/api/store/${foreignSlug}/panel-data`, {
          method: 'GET',
          headers: { Cookie: sellerCookie },
        }),
        fetch(`${BASE_URL}/api/store/${foreignSlug}/change-pin`, {
          method: 'POST',
          headers: {
            ...defaultHeaders,
            Cookie: sellerCookie,
          },
          body: JSON.stringify({
            currentPin: '123456',
            newPin: '654321',
            confirmNewPin: '654321',
          }),
        }),
      ]);

      // Başka butiğin verisi 401/403/404 dönmeli (asla 200 dönmemeli)
      const isDataBlocked = resForeignData.status !== 200;
      const isPinBlocked = resForeignPinChange.status === 401 || resForeignPinChange.status === 403;

      if (isDataBlocked && isPinBlocked) {
        logPass(
          5,
          'Butik satıcı oturumuyla başka butiğin panel API verilerine ve işlemlerine erişim engellendi',
          `panel-data: HTTP ${resForeignData.status}, change-pin: HTTP ${resForeignPinChange.status}`
        );
      } else {
        logFail(
          5,
          'Butik satıcı oturumu başka bir butiğin verilerine erişebildi!',
          `panel-data: HTTP ${resForeignData.status}, change-pin: HTTP ${resForeignPinChange.status}`
        );
      }
    }
  } catch (err) {
    logFail(5, 'Çapraz butik izolasyon testi sırasında bağlantı hatası', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: EN SONDA: Peş peşe 6 yanlış admin şifresi denemesinden sonra 429 dönüyor mu?
  // (Bu test IP'yi 15 dakika kilitler!)
  // --------------------------------------------------------------------------
  console.log('\n⚠️  Test 6 Başlatılıyor: 6 peş peşe hatalı admin denemesi ile kilit tetikleniyor...');
  try {
    let hitRateLimit = false;
    let lastStatus = 0;
    let retryAfterHeader = null;

    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ password: `bruteforce-test-pwd-${i}` }),
      });

      lastStatus = res.status;
      if (res.status === 429) {
        hitRateLimit = true;
        retryAfterHeader = res.headers.get('retry-after');
        console.log(`   └─> Deneme ${i}: HTTP 429 (Kilit devreye girdi, Retry-After: ${retryAfterHeader || '900'})`);
        break;
      } else {
        console.log(`   └─> Deneme ${i}: HTTP ${res.status}`);
      }
    }

    if (hitRateLimit) {
      logPass(
        6,
        '6 yanlış admin denemesinden sonra IP kilitlendi ve 429 döndü',
        `Son durum: HTTP 429 Too Many Requests (Retry-After: ${retryAfterHeader || '900'}s)`
      );
    } else {
      logFail(
        6,
        '6 yanlış admin denemesinden sonra 429 dönmedi (Kilit devreye girmedi)',
        `Son durum: HTTP ${lastStatus} (Beklenen: 429)`
      );
    }
  } catch (err) {
    logFail(6, 'Brute-force kilit testi sırasında bağlantı hatası', err.message);
  }

  // --------------------------------------------------------------------------
  // Özet ve Çıkış
  // --------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`📊 TEST SONUÇLARI: Toplam: 6 | \x1b[32mPASS: ${passCount}\x1b[0m | \x1b[31mFAIL: ${failCount}\x1b[0m`);
  console.log('=============================================================\n');

  if (failCount > 0) {
    console.error(`❌ Testler sırasında ${failCount} adet başarısızlık tespit edildi.`);
    process.exit(1);
  } else {
    console.log('🎉 Tebrikler! Tüm güvenlik ve izolasyon kontrolleri başarıyla geçti.');
    process.exit(0);
  }
}

runSecurityAudit();
