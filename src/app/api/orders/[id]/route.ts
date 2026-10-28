import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSellerSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

const ALLOWED_STATUSES = ['NEW', 'PREPARING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const session = await getSellerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Yetkisiz işlem. Lütfen giriş yapın.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // IDOR KONTROLÜ: Sipariş bu satıcının mağazasına mı ait?
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, storeId: true },
    });

    if (!existingOrder || existingOrder.storeId !== session.storeId) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı veya bu siparişi güncelleme yetkiniz yok.' },
        { status: 403 }
      );
    }

    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Geçersiz sipariş durumu.' },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
      },
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error);
    return NextResponse.json(
      { error: 'Sipariş durumu güncellenemedi' },
      { status: 500 }
    );
  }
}
