import Link from 'next/link';
import {
  ShoppingBag,
  MessageCircle,
  Instagram,
  Barcode,
  ArrowRight,
  CheckCircle2,
  Store,
  Settings,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              IS
            </div>
            <span className="font-extrabold text-slate-900 text-base tracking-tight">
              InstaSipariş <span className="text-emerald-600 font-semibold text-xs">MVP</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/butikmoda"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
            >
              Örnek Vitrin (/butikmoda)
            </Link>
            <Link
              href="/panel"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              Satıcı Paneli (/panel)
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Online Butikler + Fiziksel Mağazalar İçin Hibrit Sipariş & Stok Sistemi
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Instagram Bio Katalog Linki ile WhatsApp & DM Sipariş Sistemi
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Müşterileriniz Instagram bio linkinizden ürünleri sepete ekler; tek tıkla hazır sipariş
            özeti <strong>WhatsApp</strong> veya <strong>Instagram DM</strong> üzerinden size düşer
            ve aynı anda veritabanına kaydedilerek stoktan düşülür.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/butikmoda"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-sm transition"
            >
              <ShoppingBag className="w-4 h-4" />
              Müşteri Vitrini Deneyimini Aç (/butikmoda)
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/panel"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-sm transition"
            >
              <Settings className="w-4 h-4" />
              Satıcı Yönetim & Barkod Paneline Git
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              1. Hazır WhatsApp Sipariş & Soru
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Her ürün kartında <strong>&quot;WhatsApp&apos;tan Sor&quot;</strong> butonu ve sepet
              sonunda <code>wa.me/90...</code> üzerinden sipariş kalemleri, SKU, adres ve ödeme
              tercihi hazır doldurulmuş mesaj akışı.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
              <Instagram className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              2. Instagram DM Kopyala & Aç (ig.me)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              API onayı gerektirmeden sipariş metnini otomatik panoya kopyalar ve{' '}
              <code>ig.me/m/kullaniciadi</code> ile doğrudan mağaza DM sohbetini açar.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Barcode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              3. Hibrit Barkod & Fiziksel Mağaza Stoğu
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Varyant bazlı SKU/Barkod takibi, fiziksel mağazadan <strong>Gel-Al</strong> teslimat
              seçeneği ve dükkanda satılan ürünü barkodla tek tıkta stoktan düşme ekranı.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Next.js App Router + Prisma + SQLite • Instagram & WhatsApp Sipariş Sistemi MVP
      </footer>
    </div>
  );
}
