# InstaSipariş Platformu - Kapsamlı Güvenlik Denetim Raporu (Security Audit)

**Tarih:** 28 Ekim 2026  
**Kapsam:** Çok Mağazalı Instagram & WhatsApp Sipariş ve Stok Yönetim Sistemi  
**Denetim Tipi:** Kaynak Kod Güvenlik Denetimi (Static Code Analysis & Threat Modeling)  
**Durum:** Üretim Öncesi (Pre-Production) Güvenlik Değerlendirmesi  

---

## 1. Yönetici Özeti (Executive Summary)

InstaSipariş uygulaması üzerinde gerçekleştirilen güvenlik denetiminde; mimari, kimlik doğrulama, yetkilendirme (IDOR), girdi doğrulama, dosya yükleme ve sunucusuz (serverless) altyapı uyumluluğu alanlarında **8 Kritik**, **6 Yüksek**, **4 Orta** ve **3 Düşük** seviyeli güvenlik zafiyeti tespit edilmiştir.

Mevcut durumda uygulama canlı ticari kullanıma ve ödeme/sipariş trafiğine **uygun değildir**. En acil riskler şunlardır:
1. **İstemci Taraflı PIN Kontrolü ve SSR Veri Sızıntısı:** Satıcı PIN kodu sunucuda değil, tarayıcıda kontrol edilmekte; mağazanın tüm sipariş, adres ve PIN bilgileri HTML kaynağına PIN girilmeden önce basılmaktadır.
2. **Genel Açık ve Yetkisiz API'ler (IDOR):** Tüm yönetim ve veri değiştirme API'leri (ürün ekleme/silme, mağaza ayarları, IBAN değiştirme, sipariş iptali) şifresiz ve yetkisiz çalışmaktadır.
3. **Fiyat ve Toplam Tutar Manipülasyonu:** Sipariş oluştururken toplam tutar ve birim fiyatlar istemciden alınmakta, sunucu tarafında hiçbir hesaplama ve stok uygunluk kontrolü yapılmamaktadır.
4. **Vercel Serverless Dosya Yükleme Uyumsuzluğu:** Fotoğraf yüklemeleri yerel diske (`public/uploads`) yazılmakta olup Vercel'in salt-okunur/geçici dosya yapısında çalışmamakta ve kalıcı olmamaktadır.

---

## 2. Bulguların Özet Tablosu

| # | Zafiyet Başlığı | Seviye | Etkilenen Dosya & Satır | Zafiyet Türü |
|---|---|---|---|---|
| **SEC-01** | SSR HTML İçinde Şifresiz PIN ve Müşteri KVKK Verisi Sızıntısı | **KRİTİK** | `src/app/[slug]/panel/page.tsx:21-47` | Bilgi İfşası / Zayıf Auth |
| **SEC-02** | İstemci Taraflı (Bypass Edilebilir) PIN Doğrulaması | **KRİTİK** | `src/components/SellerPanelClient.tsx:185-199` | Kimlik Doğrulama Bypass |
| **SEC-03** | Mağaza Verilerini ve PIN Kodunu Şifresiz Döndüren Genel API | **KRİTİK** | `src/app/api/store/[slug]/route.ts:5-36` | Bilgi İfşası / Yetkisiz Erişim |
| **SEC-04** | Mağaza Ayarları ve IBAN Bilgisini Değiştirme (Yetkisiz IDOR) | **KRİTİK** | `src/app/api/store/[slug]/route.ts:38-65` | IDOR / Yetkisiz Veri Değiştirme |
| **SEC-05** | Sipariş Fiyatı ve Toplam Tutar Manipülasyonu (Price Tampering) | **KRİTİK** | `src/app/api/orders/route.ts:46-48, 70-71` | İş Mantığı / Fiyat Manipülasyonu |
| **SEC-06** | Yetkisiz Ürün Ekleme, Düzenleme ve Silme (Platform Geneli IDOR) | **KRİTİK** | `src/app/api/products/route.ts:4-72`, `src/app/api/products/[id]/route.ts:4-68` | IDOR / Yetkisiz Veri İşleme |
| **SEC-07** | Eski Şifresiz Panel Rotasının Canlıda Kalması | **KRİTİK** | `src/app/panel/page.tsx:204` | Yetkisiz Erişim Rotası |
| **SEC-08** | Vercel Sunucusuz Disk Uyumsuzluğu & Kalıcı Olmayan Fotoğraf Yükleme | **KRİTİK** | `src/app/api/upload/route.ts:18-27` | Mimari Hata / Veri Kaybı |
| **SEC-09** | Admin Mağaza Listeleme API'sinde Sıfır Yetkilendirme | **YÜKSEK** | `src/app/api/admin/stores/route.ts:5-54` | Bilgi İfşası / Yetkisiz Erişim |
| **SEC-10** | Sipariş Öncesi Stok Kontrolünün Bulunmaması | **YÜKSEK** | `src/app/api/orders/route.ts:78-100` | İş Mantığı / Yarış Durumu (Race Cond.) |
| **SEC-11** | Kod İçine Gömülü (Hardcoded) ve Ekranda Açıkça Yazılan Şifreler | **YÜKSEK** | `src/app/admin/page.tsx:109, 190`, `src/components/SellerPanelClient.tsx:188, 284` | Güvenlik İhlali / Hardcoded Credentials |
| **SEC-12** | Dosya Yükleme Güvenliği (MIME Type ve Boyut Kontrolü Yok) | **YÜKSEK** | `src/app/api/upload/route.ts:8-16` | Kötü Amaçlı Dosya Yükleme / DoS |
| **SEC-13** | Yetkisiz Sipariş Durumu Değiştirme (IDOR) | **YÜKSEK** | `src/app/api/orders/[id]/route.ts:4-28` | IDOR / Yetkisiz Güncelleme |
| **SEC-14** | Brute-Force Koruması ve Hız Sınırının (Rate Limiting) Olmaması | **YÜKSEK** | Tüm API'ler (`/api/*`) | Brute-Force / DoS |
| **SEC-15** | Veritabanında PIN Kodunun Düz Metin (Plain Text) Tutulması | **ORTA** | `prisma/schema.postgresql.prisma:24` | Kriptografik Zafiyet |
| **SEC-16** | HTTP Güvenlik Başlıklarının (Security Headers) Bulunmaması | **ORTA** | `next.config.mjs:1-10` | Clickjacking / XSS / Eksik Headers |
| **SEC-17** | Rezerve Edilmiş Slug İsimlerinin Engellenmemesi | **ORTA** | `src/app/api/admin/stores/route.ts:80-84` | Rota Çakışması / Hizmet Aksatma |
| **SEC-18** | Girdi Uzunluğu Sınırlandırılmaması (Payload DoS) | **ORTA** | `src/app/api/orders/route.ts:9-19`, `src/app/api/products/route.ts:8-20` | DoS / Veritabanı Şişirme |
| **SEC-19** | localStorage ve sessionStorage Kullanımı (XSS Kırılganlığı) | **DÜŞÜK** | `src/components/SellerPanelClient.tsx:192`, `src/app/admin/page.tsx:112` | Zayıf Oturum Depolama |
| **SEC-20** | WhatsApp Mesaj Şablonlarında Karakter/Satır Enjeksiyonu | **DÜŞÜK** | `src/lib/format.ts:50-91` | Mesaj Enjeksiyonu |
| **SEC-21** | Test Telefonu ve Sahte Numaraların Sistemde Kalması | **DÜŞÜK** | `src/lib/ensureSeed.ts:59` | Bilgi Kirliliği / Operasyonel Hata |

---

## 3. Detaylı Güvenlik Bulguları

### 3.1. Kimlik Doğrulama & Oturum Yönetimi (Authentication)

#### [SEC-01] SSR HTML İçinde Şifresiz PIN ve Müşteri KVKK Verisi Sızıntısı
- **Seviye:** **KRİTİK**
- **Dosya:** `src/app/[slug]/panel/page.tsx`
- **Satır Aralığı:** `21-47`
- **Açıklama:**
  `StorePanelPage` sunucu bileşeni, mağaza verisini Prisma üzerinden çekerken satıcının `pinCode` değerini ve geçmişteki **tüm müşteri siparişlerini (Müşteri Adı, Telefonu, Açık Adresi, Sipariş Notları, IBAN)** getirmekte ve `SellerPanelClient` bileşenine `initialStore` olarak geçmektedir.
  Next.js bu veriyi sayfanın ilk render HTML'i içerisindeki script payload'una (`self.__next_f.push(...)`) düz metin olarak basmaktadır.
- **Etki:**
  Saldırgan PIN kodunu bilmese bile, tarayıcıda `Ctrl + U` (Kaynağı Görüntüle) yaparak veya basit bir `curl` isteği atarak o mağazanın **PIN kodunu** ve **tüm müşterilerinin kişisel verilerini (KVKK ihlali)** anında ele geçirebilir.

#### [SEC-02] İstemci Taraflı (Client-Side) PIN Doğrulaması
- **Seviye:** **KRİTİK**
- **Dosya:** `src/components/SellerPanelClient.tsx`
- **Satır Aralığı:** `185-199`
- **Açıklama:**
  PIN kontrolü tamamen React state'i (`isAuthenticated`) üzerinden tarayıcıda yapılmaktadır:
  ```typescript
  if (pinToTest === correctPin || pinToTest === '1234') {
    setIsAuthenticated(true);
    localStorage.setItem(`auth_pin_${slug}`, pinToTest);
  }
  ```
- **Etki:**
  Sunucu tarafında hiçbir HTTP-Only Cookie, JWT veya oturum doğrulaması yoktur. Tarayıcı konsolunda React state'ini `true` yapan veya `localStorage`'a değer yazan herhangi biri PIN bilmeden panele tam yetkili erişim sağlar.

#### [SEC-15] Veritabanında PIN Kodunun Düz Metin (Plain Text) Saklanması
- **Seviye:** **ORTA**
- **Dosya:** `prisma/schema.postgresql.prisma`
- **Satır Aralığı:** `24`
- **Açıklama:**
  `pinCode String @default("1234")` alanı veritabanında şifrelenmeden (bcrypt, argon2 veya scrypt gibi algoritmalar kullanılmadan) açık metin olarak tutulmaktadır.
- **Etki:**
  Olası bir veritabanı sızıntısında veya admin paneli üzerinden tüm mağazaların PIN kodları üçüncü şahısların eline geçer.

---

### 3.2. Yetkilendirme & IDOR (Insecure Direct Object Reference)

#### [SEC-03] Mağaza Bilgilerini ve PIN Kodunu Döndüren Genel API
- **Seviye:** **KRİTİK**
- **Dosya:** `src/app/api/store/[slug]/route.ts`
- **Satır Aralığı:** `5-36`
- **Açıklama:**
  `GET /api/store/[slug]` endpoint'i hiçbir yetki kontrolü yapmadan mağazanın tüm veritabanı kaydını (`store` objesi) JSON olarak dönmektedir:
  ```typescript
  return NextResponse.json(store);
  ```
  Bu obje `pinCode`, `ibanInfo`, `whatsappPhone` ve ilişkili tüm `orders` (siparişler, müşteri adresleri, telefonları) verisini içermektedir.
- **Etki:**
  İnternetteki herhangi biri `GET /api/store/butikmoda` çağrısı yaparak mağazanın PIN'ini ve müşteri defterini saniyeler içinde indirebilir.

#### [SEC-04] Yetkisiz Mağaza Ayarları ve IBAN Değiştirme (Finansal Risk)
- **Seviye:** **KRİTİK**
- **Dosya:** `src/app/api/store/[slug]/route.ts`
- **Satır Aralığı:** `38-65`
- **Açıklama:**
  `PATCH /api/store/[slug]` endpoint'i hiçbir token, PIN veya oturum kontrolü yapmamaktadır. İstek gövdesinde gönderilen `ibanInfo` ve `whatsappPhone` değerlerini doğrudan veritabanında güncellemektedir.
- **Etki:**
  Kötü niyetli bir kullanıcı veya rakip satıcı, hedef butiğin IBAN numarasını kendi banka hesabı ile, WhatsApp numarasını da kendi numarasıyla değiştirebilir. Müşterilerin yapacağı tüm havale ödemeleri saldırganın hesabına gider.

#### [SEC-06] Platform Geneli Ürün Ekleme, Düzenleme ve Silme
- **Seviye:** **KRİTİK**
- **Dosyalar:**
  - `src/app/api/products/route.ts` (Satır `4-72`)
  - `src/app/api/products/[id]/route.ts` (Satır `4-68`)
- **Açıklama:**
  - `POST /api/products`: İstek gövdesinde gönderilen `storeId` parametresini sorgusuz kabul eder. Satıcı A, Satıcı B'nin mağaza ID'sini yazarak onun vitrinine sahte ürünler ekleyebilir.
  - `PATCH /api/products/[id]`: Ürünün hangi mağazaya ait olduğunu veya çağıranın kimliğini denetlemez. İsteyen herkes herhangi bir ürünün fiyatını 1 TL yapabilir veya stoğunu sıfırlayabilir.
  - `DELETE /api/products/[id]`: Herhangi bir ürün kimliği (ID) gönderilerek rakip butiğin tüm kataloğu silinebilir.

#### [SEC-13] Yetkisiz Sipariş Durumu Değiştirme
- **Seviye:** **YÜKSEK**
- **Dosya:** `src/app/api/orders/[id]/route.ts`
- **Satır Aralığı:** `4-28`
- **Açıklama:**
  `PATCH /api/orders/[id]` uç noktası, sipariş ID'sini alan herkesin siparişin durumunu `CANCELLED`, `COMPLETED` vb. yapmasına izin vermektedir.

#### [SEC-07] Eski Şifresiz Panel Rotasının Canlıda Kalması
- **Seviye:** **KRİTİK**
- **Dosya:** `src/app/panel/page.tsx`
- **Satır Aralığı:** `204`
- **Açıklama:**
  Uygulamada dinamik `/[slug]/panel` yapısına geçilmiş olmasına rağmen, eski kök `/panel` sayfası projede bırakılmıştır. Bu sayfa doğrudan `fetch('/api/store/butikmoda')` çağrısı yapmakta ve PIN ekranı dahi olmadan `butikmoda` panelini açmaktadır.

---

### 3.3. Sipariş & Fiyat Bütünlüğü (Business Logic)

#### [SEC-05] İstemciden Gelen Fiyat ve Toplam Tutarın Doğrulanmaması (Price Tampering)
- **Seviye:** **KRİTİK**
- **Dosya:** `src/app/api/orders/route.ts`
- **Satır Aralığı:** `15-20, 46-48, 70-71`
- **Açıklama:**
  ```typescript
  subtotal: Number(subtotal),
  shippingCost: Number(shippingCost),
  totalAmount: Number(totalAmount),
  // item bazında:
  unitPrice: Number(item.unitPrice),
  ```
  Sipariş tutarı, kargo bedeli ve ürün birim fiyatı tamamen istemcinin gönderdiği JSON paketinden okunup kaydedilmektedir.
- **Etki:**
  Bir saldırgan tarayıcı konsolundan veya cURL ile istek atarak 1.500 TL'lik bir ürünü `unitPrice: 1`, `totalAmount: 1` şeklinde sipariş edebilir. Sistem veritabanına bu siparişi 1 TL olarak işler ve mağaza sahibine WhatsApp üzerinden 1 TL'lik sipariş fişi iletilir.

#### [SEC-10] Stok Kontrolünün Sipariş Öncesi Yapılmaması
- **Seviye:** **YÜKSEK**
- **Dosya:** `src/app/api/orders/route.ts`
- **Satır Aralığı:** `78-100`
- **Açıklama:**
  Sipariş oluşturulurken ürün veya varyantın stok miktarının `> 0` veya `item.quantity` kadar yeterli olup olmadığı doğrulanmamaktadır. Sipariş oluşturulduktan sonra `Math.max(0, stock - qty)` yapılmaktadır.
- **Etki:**
  Stoğu 0 olan veya tükenmiş ürünler için sınırsız sipariş oluşturulabilir. Ayrıca yüksek hacimli eşzamanlı isteklerde yarış durumu (race condition) oluşarak negatif stok/fiziksel teslim edilememe sorunlarına yol açar.

---

### 3.4. Dosya Yükleme & Sunucusuz Altyapı (Upload & Serverless)

#### [SEC-08] Vercel Serverless Uyumsuzluğu ve Kalıcı Olmayan Fotoğraf Yükleme
- **Seviye:** **KRİTİK**
- **Dosya:** `src/app/api/upload/route.ts`
- **Satır Aralığı:** `18-27`
- **Açıklama:**
  ```typescript
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(filePath, buffer);
  ```
  Vercel Serverless Functions ve AWS Lambda üzerinde çalışan Next.js uygulamalarında sunucu diski **salt-okunurdur (Read-Only)**.
- **Etki:**
  1. Üretim ortamında dosya yazma işlemi `EROFS: read-only file system` hatası vererek çöker.
  2. Yazma `/tmp` dizinine yönlendirilse bile, serverless konteyneri kapandığında (container recycle) yüklenen tüm fotoğraflar silinir. Müşteriler ve satıcılar kırık resim linkleri görür.

#### [SEC-12] Dosya Tipi (MIME) ve Boyut Kontrolünün Bulunmaması
- **Seviye:** **YÜKSEK**
- **Dosya:** `src/app/api/upload/route.ts`
- **Satır Aralığı:** `8-16`
- **Açıklama:**
  Yüklenen dosyanın uzantısı, `Content-Type` başlığı veya dosya sihirli baytları (magic bytes) denetlenmemektedir. Boyut sınırı (örneğin maksimum 5 MB) yoktur.
- **Etki:**
  Saldırganlar sunucuya zararlı scriptler, HTML dosyaları (Stored XSS amacıyla) yükleyebilir veya gigabaytlarca veri göndererek bellek/işlemci kaynaklarını tüketebilir (Denial of Service).

---

### 3.5. Kod İçi Bilgi Sızıntısı & Rezerve Rotalar

#### [SEC-11] Kodda Sabitlenmiş ve Ekranda Gösterilen Şifreler
- **Seviye:** **YÜKSEK**
- **Dosyalar:**
  - `src/app/admin/page.tsx` (Satır `109, 190, 206`)
  - `src/app/api/admin/stores/route.ts` (Satır `59`)
  - `src/components/SellerPanelClient.tsx` (Satır `188, 258, 276, 284`)
- **Açıklama:**
  - Admin anahtarı `1923` doğrudan JavaScript içine gömülüdür.
  - Ekranda `"Yönetici Şifresi (Varsayılan: 1923)"` ve `"⚡ Hızlı Giriş (1923)"` butonları bulunmaktadır.
  - Satıcı panelinde `"Varsayılan PIN: 1234"` ve `"⚡ Hızlı Giriş (1234)"` butonları halka açık durumdadır.
- **Etki:**
  Giriş mekanizması bir güvenlik bariyeri değil, yalnızca formaliteden ibaret bir tık butonuna dönüşmektedir.

#### [SEC-17] Rezerve Slug Değerlerinin Engellenmemesi
- **Seviye:** **ORTA**
- **Dosya:** `src/app/api/admin/stores/route.ts`
- **Satır Aralığı:** `80-84`
- **Açıklama:**
  `admin`, `api`, `panel`, `login`, `_next`, `public` gibi sistem rotalarının slug olarak alınmasını engelleyen bir kara liste (reserved slugs list) bulunmamaktadır.
- **Etki:**
  `admin` veya `api` slug'ına sahip bir mağaza açıldığında Next.js yönlendirmesi çöker veya kritik rotalar erişilemez hale gelir.

---

### 3.6. Ağ, Hız Sınırı & Güvenlik Başlıkları

#### [SEC-14] Hız Sınırı (Rate Limiting) Yokluğu
- **Seviye:** **YÜKSEK**
- **Dosyalar:** Tüm API rotaları (`/api/*`)
- **Açıklama:**
  IP veya oturum başına istek sınırlaması (Upstash Redis, Cloudflare veya bellek içi rate limiter) bulunmamaktadır.
- **Etki:**
  4 haneli bir PIN (`0000` - `9999`) yalnızca 10.000 olasılıktan oluşur. Rate limiting olmadan yazılacak 10 satırlık bir script 30 saniye içinde doğru PIN'i kırabilir. Aynı şekilde spam sipariş veya dosya yükleme saldırıları engellenemez.

#### [SEC-16] Güvenlik Başlıklarının Eksikliği
- **Seviye:** **ORTA**
- **Dosya:** `next.config.mjs`
- **Satır Aralığı:** `1-10`
- **Açıklama:**
  Uygulamada temel web güvenlik başlıkları tanımlanmamıştır:
  - `Content-Security-Policy (CSP)`
  - `X-Frame-Options: DENY` (Clickjacking saldırılarına açık)
  - `X-Content-Type-Options: nosniff` (MIME sniffing saldırılarına açık)
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 4. Admin Panelindeki "Aktif Mağazalar: 0" ve "Yükleniyor..." Durumunun Kök Neden Analizi

Kullanıcının karşılaştığı tutarsızlığın kök nedenleri:

1. **İstemci Başlangıç Durumu (Client-Side State Delay):**  
   `src/app/admin/page.tsx:74-75` dosyasında `stores` durumu `[]` boş dizi, `loading` ise `false` olarak başlamaktadır. Sayfa mount olduğunda `sessionStorage` kontrolü yapılmakta; oturum henüz girilmediyse `fetchStores` fonksiyonu hiç tetiklenmemektedir. Buna karşılık üstteki metrik kartları doğrudan `stores.length` değerini ekrana bastığı için "Aktif Mağazalar: 0" göstermektedir.
2. **Serverless Veritabanı Soğuk Başlangıcı (Neon.tech Cold Start):**  
   Neon PostgreSQL veritabanı boşta kaldığında sunucusuz havuzunu askıya (compute sleep) almaktadır. `/api/admin/stores` ilk çağrıldığında `ensureDemoStore()` ve `prisma.store.findMany()` çalışırken veritabanının uyanması 5 ila 15 saniye sürebilmektedir. Bu bekleme süresince liste "Mağazalar yükleniyor..." olarak dönmekte, kullanıcı henüz mağaza yokmuş hissiyatı yaşamaktadır.
3. **Derleme Hatası Sonrası Önbellek (Stale Cache):**  
   Önceki commit'lerde Vercel derlemesi başarısız olduğunda, Vercel eski sürümü sunmaya devam etmiş veya API 500 hatası dönmüştür. Hata yakalandığında `setLoading(false)` çalışmadığı veya boş dizi döndüğü için liste sıfırda kalmıştır.

---

## 5. Düzeltme ve Öncelik Sıralaması (Remediation Roadmap)

Uygulamanın ticari canlıya alınabilmesi için önerilen düzeltme sırası:

### Aşama 1: Kritik Veri ve Kimlik Doğrulama Güvenliği (Acil - 1. Gün)
1. **SSR Veri Sızıntısını Kapatın (`src/app/[slug]/panel/page.tsx`):**
   - Sunucu tarafında mağazanın `pinCode` değerini ve geçmiş `orders` listesini şifresiz HTML'e göndermeyi derhal durdurun.
   - Panel sayfası ilk açıldığında sunucudan yalnızca mağaza adı ve logosunu gönderin; siparişler ve ayarlar ancak sunucuda doğrulanan bir oturumdan sonra `/api/panel/data` üzerinden getirilsin.
2. **Sunucu Taraflı PIN & Oturum Doğrulaması:**
   - Satıcı PIN'ini doğrulamak için `POST /api/store/[slug]/auth` endpoint'i kurun.
   - Doğrulama başarılı olduğunda `HttpOnly`, `Secure`, `SameSite=Strict` özellikli bir JWT veya Session Cookie yazın.
   - Veritabanındaki PIN'leri `bcrypt` ile hash'leyerek saklayın.
3. **Genel Açık API'leri Kapatın:**
   - `GET /api/store/[slug]` içerisinden `pinCode` ve müşteri kişisel verilerini (siparişler) tamamen çıkarın. Bu endpoint yalnızca vitrin için gerekli ürünleri dönsün.
   - `PATCH /api/store/[slug]` için geçerli satıcı oturumu zorunlu kılın.
   - Eski `src/app/panel/page.tsx` dosyasını projeden tamamen silin.

### Aşama 2: Sipariş Güvenliği ve Finansal Bütünlük (2. Gün)
4. **Sunucu Taraflı Fiyat Doğrulaması (`src/app/api/orders/route.ts`):**
   - İstemciden gelen `subtotal`, `totalAmount` ve `unitPrice` değerlerine ASLA güvenmeyin.
   - Gönderilen her `productId` ve `variantId` için veritabanındaki güncel fiyatı çekin, sunucuda toplayın ve kargo kuralını sunucuda işleterek gerçek `totalAmount`'u hesaplayıp kaydedin.
5. **Stok Uygunluk Kontrolü:**
   - Sipariş oluşturulmadan önce her ürün için `product.stock >= quantity` kontrolü yapın. Yetersiz stok varsa işlemi iptal edin ve kullanıcıya bildirin.

### Aşama 3: IDOR ve Mağaza İzolasyonu (3. Gün)
6. **Yetki Kontrolü Middleware / Helper:**
   - Satıcının aktif oturumundaki `storeId` ile işlem yapmak istediği `productId` / `orderId`'nin aynı mağazaya ait olduğunu doğrulayan bir kontrolcü (`verifyStoreOwnership`) yazın.
   - Başka bir mağazanın ürününü düzenleme veya silme denemelerinde `403 Forbidden` döndürün.

### Aşama 4: Dosya Yükleme & Bulut Depolama (4. Gün)
7. **Bulut Depolama Entegrasyonu (Cloud Object Storage):**
   - Yerel `fs.writeFile` kodunu kaldırın.
   - Vercel Blob, Cloudinary, AWS S3 veya Supabase Storage entegrasyonu kurun.
   - Dosya yüklerken sadece `image/jpeg`, `image/png`, `image/webp` formatlarına izin verin ve maksimum dosya boyutunu 5 MB ile sınırlayın.

### Aşama 5: Brute-Force, Başlıklar & Sertleştirme (5. Gün)
8. **Rate Limiting Uygulayın:**
   - `@upstash/ratelimit` kullanarak PIN denemelerini IP başına dakikada maksimum 5 deneme ile sınırlayın.
9. **Hardcoded Şifreleri ve İpuçlarını Temizleyin:**
   - Arayüzdeki "Varsayılan PIN: 1234", "Hızlı Giriş (1234)", "Yönetici Şifresi: 1923" yazılarını ve butonlarını kaldırın.
   - Admin şifresini ortam değişkenine (`ADMIN_SECRET_KEY`) taşıyın.
10. **Güvenlik Başlıklarını Ekleyin (`next.config.mjs`):**
    - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin` başlıklarını ekleyin.

---

*Rapor Sonu. Proje kodlarına bu aşamada hiçbir müdahale yapılmamış, bulgular yalnızca dokümante edilmiştir.*
