const { execSync } = require('child_process');

const realDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  '';

const buildEnv = {
  ...process.env,
  DATABASE_URL:
    realDbUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
};

console.log('🔧 [vercel-build] Prisma Client üretiliyor...');
execSync('npx prisma generate --schema=prisma/schema.postgresql.prisma', {
  stdio: 'inherit',
  env: buildEnv,
});

if (realDbUrl) {
  console.log('🗄️ [vercel-build] Veritabanı şeması senkronize ediliyor (prisma db push)...');
  try {
    execSync(
      'npx prisma db push --schema=prisma/schema.postgresql.prisma --accept-data-loss',
      {
        stdio: 'inherit',
        env: buildEnv,
      }
    );
    execSync('node scripts/migrate-pins.js', {
      stdio: 'inherit',
      env: buildEnv,
    });
  } catch (err) {
    console.warn('⚠️ [vercel-build] Veritabanı senkronizasyonu sırasında uyarı:', err.message);
  }
} else {
  console.warn(
    '⚠️ [vercel-build] DATABASE_URL (veya POSTGRES_PRISMA_URL) tanımlı değil; db push adımı atlanıyor.'
  );
}

console.log('🚀 [vercel-build] Next.js uygulaması derleniyor...');
execSync('npx next build', {
  stdio: 'inherit',
  env: buildEnv,
});
