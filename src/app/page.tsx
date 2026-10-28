import Link from 'next/link';
import {
  ShoppingBag,
  MessageCircle,
  Instagram,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  Store,
  Camera,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-base shadow-lg">
              IS
            </div>
            <div>
              <span className="font-black text-lg tracking-tight">InstaSipariş</span>
              <span className="ml-2 bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/30">
                PRO PLATFORM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/butikmoda"
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Örnek Butik Vitrini
            </Link>
            <Link
              href="/admin"
              className="text-xs font-black px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-slate-950 shadow-md transition"
            >
              Süper Admin Paneli →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/20 px-4 py-1.5 rounded-full text-xs font-bold text-rose-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Instagram Butikleri & Esnaflar İçin Çok Mağazalı Sipariş Altyapısı
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
          Her Mağazaya <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300">1 Dakikada</span> Özel Sipariş & Vitrin Sistemi Kurun ve Satın
        </h1>

        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Instagram bio&apos;suna konulan lüks hikayeli vitrin, telefondan fotoğrafla hızlı ürün ekleme,
          WhatsApp & Instagram DM sipariş fişi ve dükkan içi anında kasa stok düşümü tek platformda!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl hover:scale-105 transition"
          >
            <Plus className="w-5 h-5" />
            Yeni Bir Dükkana Mağaza Aç (/admin)
          </Link>

          <Link
            href="/butikmoda"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            Müşteri Gözüyle Vitrini İncele (/butikmoda)
          </Link>

          <Link
            href="/butikmoda/panel"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-sm border border-slate-700 transition"
          >
            <Smartphone className="w-4 h-4" />
            Butik Sahibi Paneli (/butikmoda/panel)
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-12 text-left">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Telefondan Fotoğraf Yükleme</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dükkan sahipleri URL ile uğraşmaz. Telefonunun kamerasını açar veya galeriden fotoğraf
              seçip 3 saniyede yeni ürün ekler.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold">
              <Instagram className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Instagram Hikayeleri (Stories)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vitrinde üstte dönen yuvarlak Instagram hikayeleri ("Yeni Sezon", "İndirimler", "Kombinler").
              Trendyol & Shopier kalitesinde lüks tasarım.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Sınırsız Çoklu Mağaza (SaaS)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tek bir sistem üzerinden istediğiniz kadar butiğe ayrı mağaza linki açabilir, her birine
              kendi 4 haneli PIN şifresini verip aylık/yıllık ücret alabilirsiniz.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        InstaSipariş Platformu • İstediğiniz her dükkana uyarlanabilir ticari sipariş & stok altyapısı
      </footer>
    </div>
  );
}
