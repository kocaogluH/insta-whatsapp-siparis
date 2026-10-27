import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await ensureDemoStore();

    const store = await prisma.store.findUnique({
      where: { slug },
      include: {
        products: {
          include: { variants: true },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('GET /api/store/[slug] error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();

    const updated = await prisma.store.update({
      where: { slug },
      data: {
        name: body.name,
        description: body.description,
        whatsappPhone: body.whatsappPhone,
        instagramHandle: body.instagramHandle?.replace(/^@/, ''),
        shippingFee: Number(body.shippingFee ?? 0),
        freeShippingThreshold: Number(body.freeShippingThreshold ?? 0),
        address: body.address,
        allowStorePickup: Boolean(body.allowStorePickup),
        ibanInfo: body.ibanInfo,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/store/[slug] error:', error);
    return NextResponse.json({ error: 'Mağaza güncellenemedi' }, { status: 500 });
  }
}
