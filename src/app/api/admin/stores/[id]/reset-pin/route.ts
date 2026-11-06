import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getAdminSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { clearFailedLogins } from '@/lib/ratelimit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    // 1. Admin Yetki Doğrulaması
    const isAdmin = await getAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Süper admin oturumu gereklidir.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 2. Mağazayı Bul
    const store = await prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        pinVersion: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı.' },
        { status: 404 }
      );
    }

    // 3. Kriptografik Rastgele 8 Haneli Yeni PIN Üret (10000000 - 99999999)
    const newRawPin = crypto.randomInt(10000000, 99999999).toString();
    const pinHash = await bcrypt.hash(newRawPin, 10);

    // 4. Veritabanını Güncelle:
    // DİKKAT: Düz metin PIN kesinlikle veritabanına ve loglara yazılmaz!
    // Yalnızca bcrypt hash kaydedilir ve mustChangePin = true yapılır.
    await prisma.store.update({
      where: { id: store.id },
      data: {
        pinHash,
        mustChangePin: true,
        pinVersion: { increment: 1 }, // Önceki tüm satıcı oturumlarını anında geçersiz kılar
      },
    });

    // Varsa mağazaya ait kilit sayaçlarını sıfırla
    await clearFailedLogins(`store:${store.slug}:global`);

    // 5. Yeni PIN yalnızca bu yanıtta admine bir kez gösterilmek üzere döndürülür
    return NextResponse.json({
      success: true,
      storeName: store.name,
      slug: store.slug,
      temporaryPin: newRawPin,
      message: 'PIN kodu başarıyla sıfırlandı.',
    });
  } catch (error) {
    console.error('POST /api/admin/stores/[id]/reset-pin error:', error);
    return NextResponse.json(
      { error: 'PIN sıfırlama işlemi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
