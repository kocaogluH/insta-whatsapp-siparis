import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // If updating a specific variant's stock (e.g. from panel or barcode POS)
    if (body.variantId && typeof body.variantStock === 'number') {
      const newVariantStock = Math.max(0, body.variantStock);
      await prisma.productVariant.update({
        where: { id: body.variantId },
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

    // Standard product update
    const dataToUpdate: Record<string, unknown> = {};
    if (typeof body.stock === 'number') dataToUpdate.stock = Math.max(0, body.stock);
    if (typeof body.isActive === 'boolean') dataToUpdate.isActive = body.isActive;
    if (typeof body.hideWhenOutOfStock === 'boolean')
      dataToUpdate.hideWhenOutOfStock = body.hideWhenOutOfStock;
    if (typeof body.price === 'number') dataToUpdate.price = body.price;
    if (typeof body.name === 'string') dataToUpdate.name = body.name;

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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Ürün silinemedi' }, { status: 500 });
  }
}
