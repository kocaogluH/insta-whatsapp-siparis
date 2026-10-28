import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSellerSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

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

    // IDOR KONTROLÜ: Ürün bu satıcının mağazasına mı ait?
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true, storeId: true },
    });

    if (!existingProduct || existingProduct.storeId !== session.storeId) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı veya bu ürünü düzenleme yetkiniz yok.' },
        { status: 403 }
      );
    }

    // Varyant stok güncellemesi
    if (body.variantId && typeof body.variantStock === 'number') {
      const newVariantStock = Math.max(0, body.variantStock);
      await prisma.productVariant.update({
        where: { id: body.variantId, productId: id },
        data: { stock: newVariantStock },
      });

      const allVariants = await prisma.productVariant.findMany({
        where: { productId: id },
      });
      const totalStock = allVariants.reduce((sum, v) => sum + v.stock, 0);

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { stock: totalStock },
        include: { variants: true },
      });

      return NextResponse.json(updatedProduct);
    }

    // Standart ürün güncellemesi
    const dataToUpdate: Record<string, unknown> = {};
    if (typeof body.stock === 'number') dataToUpdate.stock = Math.max(0, body.stock);
    if (typeof body.isActive === 'boolean') dataToUpdate.isActive = body.isActive;
    if (typeof body.hideWhenOutOfStock === 'boolean')
      dataToUpdate.hideWhenOutOfStock = body.hideWhenOutOfStock;
    if (typeof body.price === 'number') dataToUpdate.price = Math.max(0, body.price);
    if (typeof body.name === 'string') dataToUpdate.name = String(body.name).slice(0, 150).trim();

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { variants: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Ürün güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
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

    // IDOR KONTROLÜ: Ürün bu satıcının mağazasına mı ait?
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, storeId: true },
    });

    if (!product || product.storeId !== session.storeId) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı veya bu ürünü silme yetkiniz yok.' },
        { status: 403 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Ürün silindi.' });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Ürün silinemedi' }, { status: 500 });
  }
}
