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
  Store,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#33261f] flex flex-col justify-between font-sans selection:bg-[#eae3d6] selection:text-[#33261f]">
      {/* Top Header in Clean Linen & Espresso */}
      <header className="border-b border-[#e5dcce] bg-[#f7f4ee]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3e312b] flex items-center justify-center font-bold text-[#f7f4ee] text-sm shadow-xs">
              IS
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-[#33261f]">
                InstaSipariş
              </span>
              <span className="ml-2 bg-[#f2ece1] text-[#78695e] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#e5dcce]">
                Doğal Butik Platformu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/butikmoda"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#f2ece1] hover:bg-[#eae3d6] text-[#33261f] transition border border-[#e5dcce]"
            >
              Örnek Butik Vitrini
            </Link>
            <Link
              href="/butikmoda/panel"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] shadow-xs transition"
            >
              Butik Paneli Girişi →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 py-16 text-center space-y-7">
        <div className="inline-flex items-center gap-2 bg-[#f2ece1] border border-[#e5dcce] px-4 py-1.5 rounded-full text-xs font-semibold text-[#78695e]">
          <Sparkles className="w-3.5 h-3.5 text-[#8c5f4a]" />
          Toprak, Keten & Vizon Paletleriyle Lüks Butik Altyapısı
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto text-[#33261f]">
          Her Butiğe Sakin ve Organik Renklerle <span className="text-[#8c5f4a]">Sipariş Kataloğu</span> Kurun
        </h1>

        <p className="text-[#78695e] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Göz yormayan keten, vizon, adaçayı ve fırınlanmış toprak tonları; telefondan fotoğraflı ürün yükleme,
          Instagram hikaye halkaları ve tek tıkla hazır WhatsApp sipariş akışı.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link
            href="/butikmoda"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] font-semibold text-xs sm:text-sm shadow-xs transition"
          >
            <ShoppingBag className="w-4 h-4 text-[#cfbeab]" />
            Müşteri Vitrinini İncele (/butikmoda)
          </Link>

          <Link
            href="/butikmoda/panel"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#f2ece1] text-[#33261f] font-semibold text-xs sm:text-sm border border-[#e5dcce] shadow-xs transition"
          >
            <Smartphone className="w-4 h-4 text-[#8c5f4a]" />
            Satıcı Panelini Dene (PIN: 1234)
          </Link>
        </div>

        {/* 4 Palette Showcase from reference images */}
        <div className="pt-8">
          <p className="text-xs font-semibold text-[#9e8e82] uppercase tracking-wider mb-3">
            Desteklenen 4 Doğal İç Mekan ve Butik Renk Paleti
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            {/* Natural */}
            <div className="bg-white p-4 rounded-2xl border border-[#e5dcce] space-y-2.5 shadow-xs">
              <div className="flex gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#3e312b] border border-[#e5dcce]" title="Tan 10" />
                <span className="w-5 h-5 rounded-full bg-[#8c5f4a]" title="Tan 155" />
                <span className="w-5 h-5 rounded-full bg-[#ba9b81]" title="Bozkır" />
                <span className="w-5 h-5 rounded-full bg-[#e7cdbb]" title="Bademi" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#33261f]">Natural Paleti</p>
                <p className="text-[10px] text-[#78695e]">Keten, Vizon & Espresso</p>
              </div>
            </div>

            {/* Okyanus */}
            <div className="bg-white p-4 rounded-2xl border border-[#e5dcce] space-y-2.5 shadow-xs">
              <div className="flex gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#4f6d67]" title="Irmak 30" />
                <span className="w-5 h-5 rounded-full bg-[#a3b899]" title="Kaktüs 20" />
                <span className="w-5 h-5 rounded-full bg-[#cbad8d]" title="Hasır 55" />
                <span className="w-5 h-5 rounded-full bg-[#f6efe6] border border-[#e5dcce]" title="Hasır 70" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#33261f]">Okyanus Paleti</p>
                <p className="text-[10px] text-[#78695e]">Adaçayı & Sıcak Hasır</p>
              </div>
            </div>

            {/* Gün Batımı */}
            <div className="bg-white p-4 rounded-2xl border border-[#e5dcce] space-y-2.5 shadow-xs">
              <div className="flex gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#9f6d4f]" title="Tan 150" />
                <span className="w-5 h-5 rounded-full bg-[#e8894e]" title="Eylül 125" />
                <span className="w-5 h-5 rounded-full bg-[#dcb5a8]" title="Kıvılcım 205" />
                <span className="w-5 h-5 rounded-full bg-[#5e4f4c]" title="Tan 10" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#33261f]">Gün Batımı</p>
                <p className="text-[10px] text-[#78695e]">Terakota & Pudra</p>
              </div>
            </div>

            {/* Çöl */}
            <div className="bg-white p-4 rounded-2xl border border-[#e5dcce] space-y-2.5 shadow-xs">
              <div className="flex gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#2d687a]" title="Irmak 215" />
                <span className="w-5 h-5 rounded-full bg-[#c78144]" title="Mango 95" />
                <span className="w-5 h-5 rounded-full bg-[#6d433a]" title="Tan 35" />
                <span className="w-5 h-5 rounded-full bg-[#8b9fa8]" title="Kozmik 55" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#33261f]">Çöl Paleti</p>
                <p className="text-[10px] text-[#78695e]">Petrol & Sıcak Taba</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 text-left">
          <div className="p-6 rounded-3xl bg-white border border-[#e5dcce] space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f2ece1] text-[#8c5f4a] flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#33261f]">Telefondan Fotoğraf Yükleme</h3>
            <p className="text-xs text-[#78695e] leading-relaxed">
              Dükkan sahipleri URL ile uğraşmaz. Telefonunun kamerasını açarak veya galeriden fotoğraf
              seçip 3 saniyede ürün yükler.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e5dcce] space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#edf2eb] text-[#415e58] flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#33261f]">Instagram Hikayeleri (Stories)</h3>
            <p className="text-xs text-[#78695e] leading-relaxed">
              Vitrinin en üstünde dönen yuvarlak hikaye çemberleri (&quot;Yeni Sezon&quot;, &quot;Kombinler&quot;, &quot;Keten Seri&quot;).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e5dcce] space-y-2.5 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#f2ece1] text-[#3e312b] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#33261f]">Çoklu Mağaza (SaaS) Mimarisi</h3>
            <p className="text-xs text-[#78695e] leading-relaxed">
              Tek sistemden dilediğiniz kadar butiğe ayrı sayfa açabilir, her birine kendi 4 haneli PIN
              şifresini verip yönetebilirsiniz.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5dcce] py-6 px-4 bg-white/40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#78695e]">
          <span>InstaSipariş Platformu &bull; Doğal tonlarda Instagram &amp; WhatsApp butik sipariş altyapısı</span>
          <Link
            href="/admin"
            className="text-[#9e8e82] hover:text-[#33261f] transition inline-flex items-center gap-1.5"
          >
            <Lock className="w-3 h-3" />
            Ajans Yönetici Girişi
          </Link>
        </div>
      </footer>
    </div>
  );
}
