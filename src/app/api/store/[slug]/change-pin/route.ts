import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSellerSession, createSellerToken, setSellerSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const { slug } = await params;
    const session = await getSellerSession();

    if (!session || session.slug !== slug) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { newPin } = body;

    // Yeni PIN kuralı: En az 6 hane / karakter
    if (!newPin || typeof newPin !== 'string' || newPin.trim().length < 6) {
      return NextResponse.json(
        { error: 'Yeni PIN kodu en az 6 karakter / rakamdan oluşmalıdır.' },
        { status: 400 }
      );
    }

    const cleanPin = newPin.trim();
    const newHash = await bcrypt.hash(cleanPin, 10);

    // Mağazayı güncelle: pinHash'i ata, pinVersion'ı artır, mustChangePin'i false yap
    const updatedStore = await prisma.store.update({
      where: { id: session.storeId },
      data: {
        pinHash: newHash,
        pinCode: cleanPin, // 1. aşama geçiş uyumluluğu için korunuyor
        pinVersion: { increment: 1 },
        mustChangePin: false,
      },
      select: {
        id: true,
        slug: true,
        pinVersion: true,
      },
    });

    // Güncel pinVersion ile yeni JWT üret ve çerezi tazele
    const newToken = await createSellerToken({
      storeId: updatedStore.id,
      slug: updatedStore.slug,
      role: 'seller',
      pinVersion: updatedStore.pinVersion,
    });

    await setSellerSessionCookie(newToken);

    return NextResponse.json({
      success: true,
      message: 'PIN kodunuz başarıyla güncellendi.',
    });
  } catch (error) {
    console.error('POST /api/store/[slug]/change-pin error:', error);
    return NextResponse.json(
      { error: 'PIN güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
