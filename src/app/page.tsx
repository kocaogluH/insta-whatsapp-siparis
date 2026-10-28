import Link from 'next/link';
import {
  ShoppingBag,
  Plus,
  Smartphone,
  Sparkles,
  Camera,
  Layers,
  Palette,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#312925] flex flex-col justify-between selection:bg-[#ede2d5] selection:text-[#312925] font-sans">
      {/* Top Header */}
      <header className="border-b border-[#e8dfcf] bg-white/85 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#3c302a] flex items-center justify-center font-bold text-[#f7f4ee] text-sm shadow-xs">
              IS
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-[#312925]">
                InstaSipariş
              </span>
              <span className="ml-2 bg-[#ede2d5] text-[#6d4c38] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#d9c7b5]">
                Doğal Butik Platformu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/butikmoda"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#f4ece1] hover:bg-[#eadbc9] text-[#4a3a31] transition border border-[#e2d3be]"
            >
              Örnek Butik Vitrini
            </Link>
            <Link
              href="/admin"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] shadow-xs transition"
            >
              Yönetici Paneli →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-16 text-center space-y-7">
        <div className="inline-flex items-center gap-2 bg-[#f4ece1] border border-[#e2d8c5] px-4 py-1.5 rounded-full text-xs font-semibold text-[#665345]">
          <Sparkles className="w-3.5 h-3.5 text-[#8b634d]" />
          Doğal Tonlar &bull; Instagram Butikleri &bull; Fiziksel Mağazalar
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto text-[#2b221d]">
          Her Butiğe Sakin, Lüks ve Doğal Renklerle <span className="text-[#8b634d]">Sipariş Kataloğu</span> Kurun
        </h1>

        <p className="text-[#786c64] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Göz yormayan toprak, keten, vizon ve adaçayı paletleri; telefondan fotoğraflı ürün ekleme,
          Instagram hikayeleri ve tek tıkla hazır WhatsApp sipariş akışı.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] font-semibold text-xs sm:text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Yeni Bir Dükkana Mağaza Aç (/admin)
          </Link>

          <Link
            href="/butikmoda"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#fbf9f5] text-[#312925] font-semibold text-xs sm:text-sm border border-[#e2d8c5] shadow-xs transition"
          >
            <ShoppingBag className="w-4 h-4 text-[#8b634d]" />
            Müşteri Vitrinini İncele (/butikmoda)
          </Link>

          <Link
            href="/butikmoda/panel"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#f4ece1] hover:bg-[#eadbc9] text-[#4a3a31] font-semibold text-xs sm:text-sm border border-[#e2d3be] transition"
          >
            <Smartphone className="w-4 h-4 text-[#7a513a]" />
            Butik Sahibi Paneli (/butikmoda/panel)
          </Link>
        </div>

        {/* Color Palette Cards based on user's interior reference photos */}
        <div className="pt-8">
          <p className="text-xs font-semibold text-[#8a7c73] uppercase tracking-wider mb-3">
            Desteklenen 4 Doğal Butik Renk Paleti
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="bg-white p-3.5 rounded-2xl border border-[#e8dfcf] space-y-2">
              <div className="flex gap-1">
                <span className="w-5 h-5 rounded-full bg-[#3c302a]" />
                <span className="w-5 h-5 rounded-full bg-[#8b634d]" />
                <span className="w-5 h-5 rounded-full bg-[#be9d83]" />
                <span className="w-5 h-5 rounded-full bg-[#f7f4ee] border border-[#e8dfcf]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#312925]">Natural Palet</p>
                <p className="text-[10px] text-[#8a7c73]">Keten, Vizon & Espresso</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#e8dfcf] space-y-2">
              <div className="flex gap-1">
                <span className="w-5 h-5 rounded-full bg-[#47635e]" />
                <span className="w-5 h-5 rounded-full bg-[#98ab90]" />
                <span className="w-5 h-5 rounded-full bg-[#cbb19b]" />
                <span className="w-5 h-5 rounded-full bg-[#f5ece1]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#312925]">Okyanus Palet</p>
                <p className="text-[10px] text-[#8a7c73]">Adaçayı & Sıcak Hasır</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#e8dfcf] space-y-2">
              <div className="flex gap-1">
                <span className="w-5 h-5 rounded-full bg-[#7a513a]" />
                <span className="w-5 h-5 rounded-full bg-[#e0834b]" />
                <span className="w-5 h-5 rounded-full bg-[#ddb5ad]" />
                <span className="w-5 h-5 rounded-full bg-[#faf2ed]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#312925]">Gün Batımı</p>
                <p className="text-[10px] text-[#8a7c73]">Terakota & Pudra</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#e8dfcf] space-y-2">
              <div className="flex gap-1">
                <span className="w-5 h-5 rounded-full bg-[#245667]" />
                <span className="w-5 h-5 rounded-full bg-[#c07a3c]" />
                <span className="w-5 h-5 rounded-full bg-[#6e4439]" />
                <span className="w-5 h-5 rounded-full bg-[#8da2b3]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#312925]">Çöl Paleti</p>
                <p className="text-[10px] text-[#8a7c73]">Petrol & Sıcak Taba</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 text-left">
          <div className="p-6 rounded-3xl bg-white border border-[#e8dfcf] space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f4ece1] text-[#7a513a] flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#312925]">Telefondan Fotoğraf Ekleme</h3>
            <p className="text-xs text-[#786c64] leading-relaxed">
              Dükkan sahipleri URL ile uğraşmaz. Telefon kamerasını açarak veya galeriden fotoğraf
              seçip 3 saniyede ürün yükler.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e8dfcf] space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#edf2ec] text-[#47635e] flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#312925]">Instagram Hikayeleri (Stories)</h3>
            <p className="text-xs text-[#786c64] leading-relaxed">
              Vitrinin en üstünde dönen yuvarlak hikaye çemberleri (&quot;Yeni Sezon&quot;, &quot;Kombinler&quot;, &quot;Keten Seri&quot;).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e8dfcf] space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f9f7f2] text-[#3c302a] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#312925]">Çoklu Mağaza (SaaS) Mimarisi</h3>
            <p className="text-xs text-[#786c64] leading-relaxed">
              Tek sistemden dilediğiniz kadar butiğe ayrı sayfa açabilir, her birine kendi 4 haneli PIN
              şifresini verip yönetebilirsiniz.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8dfcf] py-6 text-center text-xs text-[#8a7c73] bg-white/50">
        InstaSipariş Platformu &bull; Doğal tonlarda Instagram &amp; WhatsApp butik sipariş altyapısı
      </footer>
    </div>
  );
}
