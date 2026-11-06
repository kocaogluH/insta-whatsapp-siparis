/**
 * InstaSipariş - PIN Bütünlük ve Güvenlik Kontrol Betiği (scripts/migrate-pins.js)
 * Vercel deployment sırasında çalışır.
 * Yalnızca pinHash değeri olmayan mağazalara rastgele geçici PIN üretir.
 * Mevcut mağazaların şifrelenmiş PIN'lerine kesinlikle dokunmaz.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function migratePins() {
  console.log('🚀 PIN bütünlük kontrolü başlatılıyor...');

  try {
    const uninitializedStores = await prisma.store.findMany({
      where: {
        pinHash: null,
      },
    });

    if (uninitializedStores.length === 0) {
      console.log('✅ Tüm mağazaların PIN hash değerleri mevcut ve güvende.');
      return;
    }

    for (const store of uninitializedStores) {
      const temporaryPin = crypto.randomInt(100000, 999999).toString();
      const pinHash = bcrypt.hashSync(temporaryPin, 10);

      await prisma.store.update({
        where: { id: store.id },
        data: {
          pinHash,
          mustChangePin: true,
          pinVersion: 1,
        },
      });

      console.log(`✅ [${store.slug}] Mağazası için rastgele geçici PIN üretilip hash'lendi.`);
    }

    console.log(`✅ Toplam ${uninitializedStores.length} mağazanın PIN bütünlüğü sağlandı.`);
  } catch (error) {
    console.error('❌ PIN kontrolü sırasında hata oluştu:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePins();
