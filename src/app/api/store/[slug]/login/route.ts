import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSellerToken, setSellerSessionCookie } from '@/lib/auth';
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
    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'Geçersiz giriş bilgileri' },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        pinHash: true,
        pinCode: true,
        pinVersion: true,
        mustChangePin: true,
        isActive: true,
      },
    });

    if (!store || !store.isActive) {
      // Zaman-güvenli (timing attack koruması) için dummy hash kontrolü
      await bcrypt.compare(pin, '$2b$10$abcdefghijklmnopqrstuuNOPQRSTUVWXYZ1234567890dummyhash');
      return NextResponse.json(
        { error: 'Geçersiz giriş bilgileri' },
        { status: 401 }
      );
    }

    // pinHash varsa onunla, yoksa pinCode ile doğrula
    let isValid = false;
    if (store.pinHash) {
      isValid = await bcrypt.compare(pin, store.pinHash);
    } else if (store.pinCode) {
      // Henüz hash'lenmemişse geçici kontrol ve hash oluşturma
      isValid = pin === store.pinCode;
      if (isValid) {
        const hash = await bcrypt.hash(pin, 10);
        await prisma.store.update({
          where: { id: store.id },
          data: { pinHash: hash },
        });
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz giriş bilgileri' },
        { status: 401 }
      );
    }

    // JWT token oluştur ve httpOnly, secure, sameSite=strict çereze yaz
    const token = await createSellerToken({
      storeId: store.id,
      slug: store.slug,
      role: 'seller',
      pinVersion: store.pinVersion,
    });

    await setSellerSessionCookie(token);

    return NextResponse.json({
      success: true,
      mustChangePin: store.mustChangePin,
    });
  } catch (error) {
    console.error('POST /api/store/[slug]/login error:', error);
    return NextResponse.json(
      { error: 'Giriş işlemi sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
