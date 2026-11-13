import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import { SITE_NAME, BASE_URL } from '@/lib/constants';

export const runtime = 'nodejs';

function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const upgraded = url.replace(/([?&])w=(300|400)\b/g, '$1w=800');
  if (upgraded.startsWith('http://') || upgraded.startsWith('https://')) {
    return upgraded;
  }
  if (upgraded.startsWith('/')) {
    return `${BASE_URL}${upgraded}`;
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  await ensureDemoStore();

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      name: true,
      tagline: true,
      logoUrl: true,
      bannerUrl: true,
      themeColor: true,
    },
  });

  const storeName = store?.name || SITE_NAME;
  const storeTagline =
    store?.tagline || `${SITE_NAME} — Instagram & WhatsApp Sipariş Kataloğu`;
  const themeColor = store?.themeColor || '#3c302a';
  const logoAbs = toAbsoluteUrl(store?.logoUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f7f4ee',
          border: '16px solid #e5dcce',
          padding: '48px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '220px',
            height: '220px',
            borderRadius: '110px',
            backgroundColor: '#ffffff',
            border: '6px solid #e5dcce',
            overflow: 'hidden',
            marginBottom: '28px',
            boxShadow: '0 12px 32px rgba(51, 38, 31, 0.12)',
          }}
        >
          {logoAbs ? (
            <img
              src={logoAbs}
              alt={storeName}
              width={220}
              height={220}
              style={{
                width: '220px',
                height: '220px',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '220px',
                height: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: themeColor,
                color: '#ffffff',
                fontSize: '72px',
                fontWeight: 700,
              }}
            >
              {storeName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: '54px',
            fontWeight: 800,
            color: '#33261f',
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: '960px',
          }}
        >
          {storeName}
        </div>

        <div
          style={{
            fontSize: '26px',
            color: '#78695e',
            textAlign: 'center',
            marginTop: '14px',
            maxWidth: '880px',
          }}
        >
          {storeTagline}
        </div>

        <div
          style={{
            marginTop: '28px',
            padding: '10px 24px',
            borderRadius: '999px',
            backgroundColor: themeColor,
            color: '#f7f4ee',
            fontSize: '20px',
            fontWeight: 700,
          }}
        >
          {SITE_NAME}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
