import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

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
