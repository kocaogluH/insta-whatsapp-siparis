import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSellerSession, getAdminSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    // YETKİ KONTROLÜ: Sadece oturum açmış satıcı veya admin fotoğraf yükleyebilir
    const seller = await getSellerSession();
    const isAdmin = await getAdminSession();

    if (!seller && !isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Dosya yüklemek için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }

    // 1. Dosya Boyutu Kontrolü (Max 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Dosya boyutu çok büyük. Maksimum dosya boyutu 5 MB olabilir.' },
        { status: 400 }
      );
    }

    // 2. MIME Type Kontrolü (Sadece JPG, PNG, WEBP)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Geçersiz dosya türü. Yalnızca JPEG, PNG ve WebP görselleri yüklenebilir.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Güvenli uzantı belirleme
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

    // Uploads klasörü
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {}

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `${timestamp}_${randomHex}.${extension}`;
    const filePath = join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/${fileName}`,
      fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Dosya yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
