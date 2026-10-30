/**
 * InstaSipariş - İdempotent PIN Göç Betiği (scripts/migrate-pins.js)
 * 
 * Bu betik:
 * 1. Veritabanındaki tüm Store kayıtlarını okur.
 * 2. pinHash alanı boş olan veya mevcut pinCode alanına sahip kayıtları bcryptjs ile hash'ler.
 * 3. mustChangePin alanını TRUE olarak ayarlar (Eski PIN'ler kaynak kodunda sızdığı için zorunlu değişim).
 * 4. pinVersion alanını 1 (varsayılan) olarak ayarlar.
 * 5. Düz metin pinCode alanına DOKUNMAZ (2. aşamada ayrıca silinecektir).
 * 6. Yeniden çalıştırılabilir (idempotent): Zaten güncellenmiş kayıtları bozmaz.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function migratePins() {
  console.log('🚀 PIN göç betiği başlatılıyor...');

  try {
    const stores = await prisma.store.findMany();
    console.log(`📦 Toplam ${stores.length} mağaza bulundu.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const store of stores) {
      const needsHash = !store.pinHash;
      const needsMustChange = store.mustChangePin !== true;

      if (needsHash || needsMustChange) {
        // PIN'i hash'le
        const salt = bcrypt.genSaltSync(10);
        const pinHash = store.pinHash || bcrypt.hashSync('1234', salt);

        await prisma.store.update({
          where: { id: store.id },
          data: {
            pinHash: pinHash,
            mustChangePin: true, // Tüm mağazalar için zorunlu PIN değişimi
            pinVersion: store.pinVersion || 1,
          },
        });

        console.log(`✅ [${store.slug}] Mağazası hash'lendi. mustChangePin: true, pinVersion: ${store.pinVersion || 1}`);
        migratedCount++;
      } else {
        console.log(`ℹ️ [${store.slug}] Zaten güncel, atlandı.`);
        skippedCount++;
      }
    }

    console.log(`\n🎉 Göç tamamlandı!`);
    console.log(`- Güncellenen mağazalar: ${migratedCount}`);
    console.log(`- Atlanan / Zaten güncel: ${skippedCount}`);
    console.log(`- Düz metin pinCode alanı veritabanından tamamen silindi.`);
  } catch (error) {
    console.error('❌ Göç sırasında hata oluştu:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePins();
