import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const isAdmin = await getAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz işlem. Süper admin girişi gereklidir.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const updateData: { verified?: boolean; isActive?: boolean } = {};
    if (typeof body.verified === 'boolean') {
      updateData.verified = body.verified;
    }
    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    const updated = await prisma.store.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        slug: true,
        name: true,
        verified: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/admin/stores/[id] error:', error);
    return NextResponse.json(
      { error: 'Mağaza durumu güncellenemedi.' },
      { status: 500 }
    );
  }
}
