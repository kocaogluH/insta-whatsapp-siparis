import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { getSellerSession, getAdminSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, uploadLimiter } from '@/lib/ratelimit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Magic Bytes ile Gerçek Dosya Türü Tespiti
 * Sadece JPEG, PNG ve WebP kabul edilir.
 * SVG, HTML, script ve diğer tehlikeli içerikler KESİNLİKLE REDDEDİLİR.
 */
function detectValidImageType(buffer: Buffer): { isValid: boolean; extension: string; mimeType: string } {
  if (buffer.length < 12) {
    return { isValid: false, extension: '', mimeType: '' };
  }

  // 1. SVG / HTML / Script Kontrolü: İlk 1024 byte içinde metin tabanlı etiket arama
  const headerText = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('utf-8').toLowerCase();
  if (
    headerText.includes('<svg') ||
    headerText.includes('<?xml') ||
    headerText.includes('<!doctype') ||
    headerText.includes('<html') ||
    headerText.includes('<script')
  ) {
    return { isValid: false, extension: '', mimeType: '' };
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, extension: 'jpg', mimeType: 'image/jpeg' };
  }

  // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, extension: 'png', mimeType: 'image/png' };
  }

  // 4. WebP: 52 49 46 46 (RIFF) .... 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, extension: 'webp', mimeType: 'image/webp' };
  }

  return { isValid: false, extension: '', mimeType: '' };
}

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    // 1. Hız Sınırı (IP başına dakikada 20 yükleme)
    const ip = getClientIp(req);
    const limitResult = await uploadLimiter.limit(ip);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Kısa süre içinde çok fazla fotoğraf yükleme isteği yapıldı. Lütfen biraz bekleyin.' },
        { status: 429 }
      );
    }

    // 2. YETKİ KONTROLÜ: Sadece oturum açmış satıcı veya admin fotoğraf yükleyebilir
    const seller = await getSellerSession();
    const isAdmin = await getAdminSession();

    if (!seller && !isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Dosya yüklemek için satıcı veya admin girişi yapmalısınız.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 });
    }

    // 3. Dosya Boyutu Kontrolü (Max 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Dosya boyutu çok büyük. Maksimum 5 MB yüklenebilir.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Magic Bytes Doğrulaması (İçerik Düzeyinde Güvenlik Kontrolü)
    const { isValid, extension, mimeType } = detectValidImageType(buffer);
    if (!isValid) {
      return NextResponse.json(
        {
          error:
            'Geçersiz veya güvenli olmayan dosya içeriği. Yalnızca gerçek JPEG, PNG ve WebP fotoğrafları yüklenebilir. SVG ve scriptler yasaktır.',
        },
        { status: 400 }
      );
    }

    // 5. Rastgele Benzersiz UUID Dosya Adı
    const randomName = `${crypto.randomUUID()}.${extension}`;

    // 6. Depolama: Vercel Blob (Varsa doğrudan Vercel Blob'a yükle, yerel geliştirmede diske yaz)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`products/${randomName}`, buffer, {
        access: 'public',
        contentType: mimeType,
      });

      return NextResponse.json({
        url: blob.url,
        fileName: randomName,
        storage: 'vercel_blob',
      });
    } else {
      // Yerel Geliştirme (Local Dev) Yedek Kayıt Alanı
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch {}

      const filePath = join(uploadsDir, randomName);
      await writeFile(filePath, buffer);

      return NextResponse.json({
        url: `/uploads/${randomName}`,
        fileName: randomName,
        storage: 'local_fallback',
      });
    }
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json(
      { error: 'Dosya yüklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
