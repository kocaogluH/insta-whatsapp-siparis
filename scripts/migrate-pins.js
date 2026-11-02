/**
 * InstaSipariş - PIN Güncelleme ve Eşitleme Betiği (scripts/migrate-pins.js)
 * Vercel deployment sırasında Neon PostgreSQL veritabanında çalışır.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function migratePins() {
  console.log('🚀 PIN güncelleme betiği başlatılıyor...');

  try {
    const DEFAULT_PIN = '715612';
    const pinHash = bcrypt.hashSync(DEFAULT_PIN, 10);

    const result = await prisma.store.updateMany({
      data: {
        pinHash: pinHash,
        mustChangePin: false, // Doğrudan 715612 ile panele girilebilir
      },
    });

    console.log(`✅ ${result.count} mağaza için PIN '715612' olarak güncellendi (mustChangePin: false).`);
  } catch (error) {
    console.error('❌ PIN güncellemesi sırasında hata oluştu:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePins();
