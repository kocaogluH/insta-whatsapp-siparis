'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  Copy,
  CheckCircle2,
  Lock,
  Instagram,
  MessageCircle,
  Eye,
  KeyRound,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface StoreItem {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  whatsappPhone: string;
  instagramHandle: string;
  themeColor: string;
  pinCode: string;
  isActive: boolean;
  createdAt: string;
  productCount: number;
  orderCount: number;
  totalRevenue: number;
}

// 4 palettes inspired directly by user's nature & interior references
const PALETTE_PRESETS = [
  {
    id: 'natural',
    name: 'Doğal Keten & Vizon (Natural)',
    sub: 'Sis Bulutu • Bademi • Bozkır • Tan 10',
    primary: '#3c302a', // Tan 10 Koyu Espresso
    accent: '#8b634d',  // Tan 155
    bg: '#f7f4ee',      // Sis Bulutu
  },
  {
    id: 'ocean',
    name: 'Okyanus & Adaçayı (Okyanus)',
    sub: 'Irmak 30 • Kaktüs 20 • Hasır 55',
    primary: '#47635e', // Irmak 30 Derin Adaçayı/Petrol
    accent: '#98ab90',  // Kaktüs 20
    bg: '#f4efe8',      // Hasır 70
  },
  {
    id: 'sunset',
    name: 'Gün Batımı & Terakota (Sunset)',
    sub: 'Tan 150 • Eylül 125 • Kıvılcım • Tan 10',
    primary: '#7a513a', // Tan 150 Sıcak Tarçın
    accent: '#e0834b',  // Eylül 125
    bg: '#faf2ed',      // Sıcak pudra/krem
  },
  {
    id: 'desert',
    name: 'Çöl Kumu & Petrol (Çöl)',
    sub: 'Irmak 215 • Mango 95 • Kozmik • Tan 35',
    primary: '#245667', // Irmak 215 Derin Mavi
    accent: '#c07a3c',  // Mango 95
    bg: '#f6f3ee',      // Çöl kumu
  },
];

export default function SuperAdminPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New Store Modal Form
  const [showModal, setShowModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [newStoreTagline, setNewStoreTagline] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreIg, setNewStoreIg] = useState('');
  const [newStorePin, setNewStorePin] = useState('1234');
  const [newStoreTheme, setNewStoreTheme] = useState('#3c302a');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stores', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStores(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleNameChange = (val: string) => {
    setNewStoreName(val);
    const generated = val
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '');
    setNewStoreSlug(generated);
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStoreName,
          slug: newStoreSlug,
          tagline: newStoreTagline,
          whatsappPhone: newStorePhone,
          instagramHandle: newStoreIg,
          pinCode: newStorePin,
          themeColor: newStoreTheme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Mağaza oluşturulamadı');
        return;
      }

      showToast(`"${data.name}" mağazası başarıyla açıldı!`);
      setShowModal(false);
      setNewStoreName('');
      setNewStoreSlug('');
      setNewStoreTagline('');
      setNewStorePhone('');
      setNewStoreIg('');
      fetchStores();
    } catch {
      setFormError('Bir bağlantı hatası oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase()) ||
      s.instagramHandle.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = stores.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalOrders = stores.reduce((acc, s) => acc + s.orderCount, 0);
  const totalProducts = stores.reduce((acc, s) => acc + s.productCount, 0);

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#312925] pb-20 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#312925] text-[#f7f5f0] font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-[#4a3f39]">
          <CheckCircle2 className="w-4 h-4 text-[#cfbeab]" />
          <span className="text-xs">{toast}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="border-b border-[#e7decb] bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3c302a] flex items-center justify-center font-bold text-[#f7f4ee] text-sm shadow-sm">
              IS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#312925] tracking-tight">
                  InstaSipariş Yönetici Paneli
                </h1>
                <span className="bg-[#ede2d5] text-[#6d4c38] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#d9c7b5]">
                  Ajans & Çoklu Mağaza
                </span>
              </div>
              <p className="text-xs text-[#786c64]">
                Butiklere özel doğal tonlarda kataloglar kurun ve yönetin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Mağaza Aç
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* KPI Cards in Natural Earth Tones */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Aktif Mağazalar</p>
            <p className="text-3xl font-bold text-[#312925] mt-1">{stores.length}</p>
            <p className="text-[11px] text-[#55735f] font-medium mt-1">
              Bağımsız Instagram bio linkleri
            </p>
          </div>

          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Toplam Sipariş Hacmi</p>
            <p className="text-3xl font-bold text-[#312925] mt-1">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[11px] text-[#8a7c73] mt-1">Tüm dükkanların cirosu</p>
          </div>

          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Gelen Siparişler</p>
            <p className="text-3xl font-bold text-[#312925] mt-1">{totalOrders}</p>
            <p className="text-[11px] text-[#8a7c73] mt-1">WhatsApp & IG DM fişleri</p>
          </div>

          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Katalogdaki Ürünler</p>
            <p className="text-3xl font-bold text-[#312925] mt-1">{totalProducts}</p>
            <p className="text-[11px] text-[#8a7c73] mt-1">Fotoğraflı ve varyantlı</p>
          </div>
        </div>

        {/* Store List Header & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#312925]">Yönetilen Mağazalar</h2>
              <p className="text-xs text-[#786c64]">
                Açılan tüm dükkanların vitrin ve panel erişimleri.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-[#9c8e84] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mağaza adı veya link ara..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#e2d8c5] rounded-xl text-xs text-[#312925] placeholder-[#9c8e84] focus:border-[#8b634d] outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-[#8a7c73]">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-[#786c64]" />
              Mağazalar yükleniyor...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((st) => (
                <div
                  key={st.id}
                  className="bg-white border border-[#e8dfcf] rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:border-[#cfbeab] transition"
                >
                  <div className="space-y-3.5">
                    {/* Store Title Bar */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shadow-xs shrink-0"
                          style={{ backgroundColor: st.themeColor || '#3c302a' }}
                        >
                          {st.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-[#312925] leading-snug">
                            {st.name}
                          </h3>
                          <p className="text-xs text-[#8a7c73] font-mono">
                            /{st.slug}
                          </p>
                        </div>
                      </div>

                      <span className="bg-[#edf2ec] text-[#47635e] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#d6dfd4]">
                        Aktif
                      </span>
                    </div>

                    {st.tagline && (
                      <p className="text-xs text-[#665a52] italic line-clamp-1">
                        &quot;{st.tagline}&quot;
                      </p>
                    )}

                    {/* Stats & Contacts */}
                    <div className="grid grid-cols-3 gap-2 bg-[#f9f7f2] p-3 rounded-2xl border border-[#ede5d8] text-center">
                      <div>
                        <p className="text-[10px] text-[#8a7c73] uppercase font-semibold">
                          Ürün
                        </p>
                        <p className="text-sm font-bold text-[#312925] mt-0.5">
                          {st.productCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#8a7c73] uppercase font-semibold">
                          Sipariş
                        </p>
                        <p className="text-sm font-bold text-[#312925] mt-0.5">
                          {st.orderCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#8a7c73] uppercase font-semibold">
                          Ciro
                        </p>
                        <p className="text-xs font-bold text-[#47635e] mt-1">
                          {formatCurrency(st.totalRevenue)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#665a52] pt-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-[#47635e]" />
                          WhatsApp:
                        </span>
                        <span className="font-mono text-[#312925]">
                          +{st.whatsappPhone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Instagram className="w-3.5 h-3.5 text-[#a87857]" />
                          Instagram:
                        </span>
                        <span className="text-[#312925]">
                          @{st.instagramHandle}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-[#b07d57]" />
                          Panel PIN:
                        </span>
                        <span className="font-mono bg-[#f4ece1] px-2 py-0.5 rounded text-[#7a513a] font-bold border border-[#e6d8c7]">
                          {st.pinCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-[#ede5d8] flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/${st.slug}`}
                        target="_blank"
                        className="py-2.5 px-3 rounded-xl bg-[#f4ece1] hover:bg-[#eadbc9] text-[#4a3a31] font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-[#e2d3be]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Vitrini Aç
                      </Link>

                      <Link
                        href={`/${st.slug}/panel`}
                        target="_blank"
                        className="py-2.5 px-3 rounded-xl bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Satıcı Paneli
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/${st.slug}`;
                        navigator.clipboard.writeText(link);
                        setCopiedSlug(st.slug);
                        setTimeout(() => setCopiedSlug(null), 2000);
                        showToast(`Bio linki kopyalandı: ${link}`);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#f9f7f2] text-[#665a52] hover:text-[#312925] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#e2d8c5] transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedSlug === st.slug
                        ? 'Bio Linki Kopyalandı ✓'
                        : 'Müşteriye Verilecek Bio Linkini Kopyala'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Store Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-[#e2d8c5] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl text-[#312925] my-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#312925]">
                  Yeni Mağaza Aç
                </h3>
                <p className="text-xs text-[#786c64] mt-0.5">
                  Butik sahibinin bilgilerini girin; anında vitrini ve paneli oluşsun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#9c8e84] hover:text-[#312925] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-[#faebe8] border border-[#f0c2b8] text-[#8e3c2f] p-3 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a3f39] mb-1">
                  Mağaza Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Vizon Butik, Ada Keten Atölye"
                  value={newStoreName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f9f7f2] border border-[#e2d8c5] rounded-xl text-xs sm:text-sm text-[#312925] focus:border-[#8b634d] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4a3f39] mb-1">
                    Bio Linki (slug) *
                  </label>
                  <div className="flex items-center bg-[#f9f7f2] border border-[#e2d8c5] rounded-xl px-2.5 py-2">
                    <span className="text-xs text-[#9c8e84] font-mono">/</span>
                    <input
                      type="text"
                      required
                      placeholder="vizonbutik"
                      value={newStoreSlug}
                      onChange={(e) => setNewStoreSlug(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono text-[#312925] outline-none ml-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a3f39] mb-1">
                    Panel Giriş PIN Kodu *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newStorePin}
                    onChange={(e) => setNewStorePin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 bg-[#f9f7f2] border border-[#e2d8c5] rounded-xl text-xs font-mono text-[#7a513a] font-bold focus:border-[#8b634d] outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a3f39] mb-1">
                  Slogan / Kısa Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: %100 Doğal Keten & Zamansız Koleksiyon"
                  value={newStoreTagline}
                  onChange={(e) => setNewStoreTagline(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f9f7f2] border border-[#e2d8c5] rounded-xl text-xs text-[#312925] focus:border-[#8b634d] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4a3f39] mb-1">
                    WhatsApp Sipariş Hattı *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0532 000 00 00"
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f9f7f2] border border-[#e2d8c5] rounded-xl text-xs text-[#312925] focus:border-[#8b634d] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a3f39] mb-1">
                    Instagram Kullanıcı Adı
                  </label>
                  <div className="flex items-center bg-[#f9f7f2] border border-[#e2d8c5] rounded-xl px-2.5 py-2">
                    <span className="text-xs text-[#9c8e84]">@</span>
                    <input
                      type="text"
                      placeholder="vizon.butik"
                      value={newStoreIg}
                      onChange={(e) => setNewStoreIg(e.target.value)}
                      className="w-full bg-transparent text-xs text-[#312925] outline-none ml-1"
                    />
                  </div>
                </div>
              </div>

              {/* Natural Color Palettes Selector */}
              <div>
                <label className="block text-xs font-bold text-[#4a3f39] mb-2">
                  Mağaza Renk Paleti (Doğal Tonlar)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PALETTE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewStoreTheme(p.primary)}
                      className={`p-2.5 rounded-2xl text-left border transition cursor-pointer flex items-center justify-between ${
                        newStoreTheme === p.primary
                          ? 'border-[#3c302a] bg-[#f5ede2] shadow-xs'
                          : 'border-[#e8dfcf] bg-[#fbf9f5] hover:border-[#cfbeab]'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[#312925]">{p.name}</p>
                        <p className="text-[10px] text-[#8a7c73]">{p.sub}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-white shadow-2xs"
                          style={{ backgroundColor: p.primary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white shadow-2xs"
                          style={{ backgroundColor: p.accent }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#f4ece1] hover:bg-[#eadbc9] text-[#4a3a31] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Oluşturuluyor...' : 'Mağazayı Aç'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
