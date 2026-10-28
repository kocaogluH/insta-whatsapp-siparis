'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  ExternalLink,
  Copy,
  CheckCircle2,
  Lock,
  Smartphone,
  Instagram,
  MessageCircle,
  TrendingUp,
  ShoppingBag,
  Palette,
  Eye,
  KeyRound,
  RefreshCw,
  Search,
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

const THEME_PRESETS = [
  { name: 'Lüks Oniks (Siyah)', value: '#0f172a' },
  { name: 'Romantik Gül (Pembe)', value: '#e11d48' },
  { name: 'Kraliyet Moru', value: '#7c3aed' },
  { name: 'Zümrüt Yeşil', value: '#059669' },
  { name: 'Sıcak Amber', value: '#d97706' },
  { name: 'Gece Mavisi', value: '#1d4ed8' },
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
  const [newStoreTheme, setNewStoreTheme] = useState('#0f172a');
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

  // Auto-generate slug as user types name
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
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-base shadow-lg">
              IS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">
                  InstaSipariş Süper Yönetici Paneli
                </h1>
                <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/30">
                  SAAS AGENCY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gördüğünüz her butik ve dükkana 1 dakikada mağaza açıp satın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              10 Saniyede Yeni Mağaza Aç
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 backdrop-blur">
            <p className="text-xs font-semibold text-slate-400">Aktif Mağazalar</p>
            <p className="text-3xl font-black text-white mt-1">{stores.length}</p>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">
              Her biri bağımsız linkli
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 backdrop-blur">
            <p className="text-xs font-semibold text-slate-400">Toplam Sipariş Hacmi</p>
            <p className="text-3xl font-black text-white mt-1">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Tüm dükkanların cirosu</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 backdrop-blur">
            <p className="text-xs font-semibold text-slate-400">Gelen Sipariş Sayısı</p>
            <p className="text-3xl font-black text-white mt-1">{totalOrders}</p>
            <p className="text-[11px] text-slate-400 mt-1">WhatsApp & IG DM toplamı</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 backdrop-blur">
            <p className="text-xs font-semibold text-slate-400">Katalogdaki Ürünler</p>
            <p className="text-3xl font-black text-white mt-1">{totalProducts}</p>
            <p className="text-[11px] text-slate-400 mt-1">Fotoğraflı & varyantlı</p>
          </div>
        </div>

        {/* Store List Header & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Açılan Mağazalar</h2>
              <p className="text-xs text-slate-400">
                Müşterilerinize satabileceğiniz veya yönettiğiniz tüm dükkanlar.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mağaza adı veya link ara..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-400" />
              Mağazalar yükleniyor...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((st) => (
                <div
                  key={st.id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-5 flex flex-col justify-between shadow-xl hover:border-slate-600 transition"
                >
                  <div className="space-y-3.5">
                    {/* Store Title Bar */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md shrink-0"
                          style={{ backgroundColor: st.themeColor || '#0f172a' }}
                        >
                          {st.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white leading-snug">
                            {st.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">
                            /{st.slug}
                          </p>
                        </div>
                      </div>

                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Aktif
                      </span>
                    </div>

                    {st.tagline && (
                      <p className="text-xs text-slate-300 italic line-clamp-1">
                        &quot;{st.tagline}&quot;
                      </p>
                    )}

                    {/* Stats & Contacts */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">
                          Ürün
                        </p>
                        <p className="text-sm font-black text-white mt-0.5">
                          {st.productCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">
                          Sipariş
                        </p>
                        <p className="text-sm font-black text-white mt-0.5">
                          {st.orderCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">
                          Ciro
                        </p>
                        <p className="text-xs font-black text-emerald-400 mt-1">
                          {formatCurrency(st.totalRevenue)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          WhatsApp:
                        </span>
                        <span className="font-mono text-slate-200">
                          +{st.whatsappPhone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Instagram className="w-3.5 h-3.5 text-pink-400" />
                          Instagram:
                        </span>
                        <span className="text-slate-200">
                          @{st.instagramHandle}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          Panel Şifresi (PIN):
                        </span>
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-bold">
                          {st.pinCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-700/80 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/${st.slug}`}
                        target="_blank"
                        className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Vitrini Aç
                      </Link>

                      <Link
                        href={`/${st.slug}/panel`}
                        target="_blank"
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition"
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
                      className="w-full py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl text-slate-100 my-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-white">
                  10 Saniyede Yeni Mağaza Aç
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Dükkan sahibinin bilgilerini girin; anında vitrini ve paneli oluşsun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mağaza Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Melis Butik, Çınar Kundura"
                  value={newStoreName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Bio Linki (slug) *
                  </label>
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2">
                    <span className="text-xs text-slate-500 font-mono">/</span>
                    <input
                      type="text"
                      required
                      placeholder="melisbutik"
                      value={newStoreSlug}
                      onChange={(e) => setNewStoreSlug(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono text-white outline-none ml-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Panel Giriş PIN Kodu *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newStorePin}
                    onChange={(e) => setNewStorePin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 font-bold focus:border-amber-400 outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Slogan / Kısa Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Özel Tasarım Kadın Giyim & Hızlı Kargo"
                  value={newStoreTagline}
                  onChange={(e) => setNewStoreTagline(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp Sipariş Hattı *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0532 000 00 00"
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Instagram Kullanıcı Adı
                  </label>
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2">
                    <span className="text-xs text-slate-500">@</span>
                    <input
                      type="text"
                      placeholder="melis.butik"
                      value={newStoreIg}
                      onChange={(e) => setNewStoreIg(e.target.value)}
                      className="w-full bg-transparent text-xs text-white outline-none ml-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Mağaza Renk Teması
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setNewStoreTheme(t.value)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
                        newStoreTheme === t.value
                          ? 'border-white bg-slate-800 text-white shadow-md'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.value }}
                      />
                      <span className="truncate">{t.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Oluşturuluyor...' : 'Mağazayı Hemen Aç 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
