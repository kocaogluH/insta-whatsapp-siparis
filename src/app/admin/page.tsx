'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Search,
  LogOut,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { formatCurrency, cleanPhoneForWhatsApp } from '@/lib/format';

interface StoreItem {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  whatsappPhone: string;
  instagramHandle: string;
  themeColor: string;
  mustChangePin: boolean;
  isActive: boolean;
  createdAt: string;
  productCount: number;
  orderCount: number;
  totalRevenue: number;
}

// 4 palettes inspired directly by nature & interior references
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [newStoreTheme, setNewStoreTheme] = useState('#3c302a');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Temporary PIN Modal (Shown ONLY once upon creation)
  const [createdStoreResult, setCreatedStoreResult] = useState<{
    name: string;
    slug: string;
    temporaryPin: string;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch('/api/admin/stores', {
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        setStores(Array.isArray(data) ? data : []);
        setIsAuthenticated(true);
      } else if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
      } else {
        setLoadError('Veritabanına bağlanılamadı. Soğuk başlangıç (cold start) olabilir.');
      }
    } catch {
      setLoadError('Ağ hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Geçersiz yönetici şifresi.');
        return;
      }

      setAdminPassword('');
      setIsAuthenticated(true);
      fetchStores();
    } catch {
      setAuthError('Giriş sırasında bağlantı hatası oluştu.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    setStores([]);
  };

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
          themeColor: newStoreTheme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mağaza oluşturulamadı');
      }

      setShowModal(false);
      setNewStoreName('');
      setNewStoreSlug('');
      setNewStoreTagline('');
      setNewStorePhone('');
      setNewStoreIg('');

      // Geçici PIN sonucunu admine tek seferlik göster
      setCreatedStoreResult({
        name: data.name,
        slug: data.slug,
        temporaryPin: data.temporaryPin,
      });

      fetchStores();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Bilinmeyen bir hata oluştu');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee]">
        <RefreshCw className="w-8 h-8 text-[#786c64] animate-spin" />
      </div>
    );
  }

  // 1. GÜVENLİK KİLİT EKRANI (Kodda şifre yok, ipucu yok)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] flex items-center justify-center p-4 font-sans text-[#33261f]">
        <div className="bg-white border border-[#e5dcce] rounded-3xl max-w-sm w-full p-7 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#3e312b] text-[#f7f4ee] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase bg-[#f2ece1] text-[#8c5f4a] px-2.5 py-1 rounded-full border border-[#e5dcce]">
              Güvenli Alan
            </span>
            <h1 className="text-xl font-bold text-[#33261f] mt-3">Süper Admin Girişi</h1>
            <p className="text-xs text-[#78695e] mt-1.5 leading-relaxed">
              Bu alan yalnızca yetkili ajans yöneticisine aittir. Devam etmek için şifrenizi girin.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={32}
                autoFocus
                placeholder="Yönetici Şifreniz"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full text-center text-lg font-mono font-bold tracking-widest py-3 px-4 bg-[#fdfcf9] border border-[#e5dcce] rounded-2xl text-[#33261f] outline-none focus:border-[#8c5f4a] shadow-inner"
              />
              {authError && (
                <p className="text-xs text-[#783e35] mt-2 font-semibold">
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !adminPassword}
              className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] shadow-xs cursor-pointer transition disabled:opacity-50"
            >
              {isLoggingIn ? 'Doğrulanıyor...' : 'Yönetici Paneline Gir'}
            </button>
          </form>

          <div className="pt-2 border-t border-[#f2ece1] text-center">
            <Link href="/" className="text-xs text-[#78695e] hover:underline">
              ← Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = stores.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalOrders = stores.reduce((acc, s) => acc + s.orderCount, 0);
  const totalProducts = stores.reduce((acc, s) => acc + s.productCount, 0);

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#33261f] font-sans pb-24">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#312925] text-[#f7f4ee] px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-[#4a3f39]">
          <CheckCircle2 className="w-4 h-4 text-[#cfbeab]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top SuperAdmin Navigation Bar */}
      <header className="bg-white border-b border-[#e8dfcf] sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#312925] text-[#f7f4ee] flex items-center justify-center font-bold shadow-xs">
              <Store className="w-5 h-5 text-[#cfbeab]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-[#312925]">
                  InstaSipariş Ajans Yönetimi
                </h1>
                <span className="bg-[#f0ebe1] text-[#786c64] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#ded4c3]">
                  Süper Admin
                </span>
              </div>
              <p className="text-xs text-[#786c64]">
                Tüm butik mağazaları, vitrinleri ve satıcı panellerini tek merkezden yönetin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStores}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#f0ebe1] hover:bg-[#e4dbcd] text-[#312925] transition border border-[#ded4c3] cursor-pointer"
              title="Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#312925] hover:bg-[#1e1916] text-[#f7f4ee] shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#cfbeab]" />
              Yeni Mağaza Aç
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[#786c64] hover:text-[#783e35] hover:bg-[#f0ebe1] transition cursor-pointer"
              title="Güvenli Çıkış"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Soğuk Başlangıç veya Ağ Hatası Bildirimi */}
        {loadError && (
          <div className="bg-[#faf2ea] border border-[#ebd7c5] p-4 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#784d33]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#bf6d37] shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              onClick={fetchStores}
              className="px-3 py-1.5 bg-[#312925] text-white rounded-xl font-bold hover:bg-[#1e1916] transition cursor-pointer shrink-0"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Top Aggregated SaaS Metrics (Yüklenirken "—" İskeleti Gösterir) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Aktif Mağazalar</p>
            <p className="text-3xl font-bold text-[#312925] mt-1">
              {loading ? '—' : stores.length}
            </p>
            <p className="text-[11px] text-[#8a7c73] mt-1">Bağımsız bio katalogları</p>
          </div>

          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Toplam Satış Hacmi</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#783e35] mt-1">
              {loading ? '—' : formatCurrency(totalRevenue)}
            </p>
            <p className="text-[11px] text-[#8a7c73] mt-1">Tüm dükkanların cirosu</p>
          </div>

          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Gelen Siparişler</p>
            <p className="text-3xl font-bold text-[#312925] mt-1">
              {loading ? '—' : totalOrders}
            </p>
            <p className="text-[11px] text-[#8a7c73] mt-1">WhatsApp & IG fişleri</p>
          </div>

          <div className="bg-white border border-[#e8dfcf] rounded-2xl p-5 shadow-xs">
            <p className="text-xs font-semibold text-[#8a7c73]">Katalogdaki Ürünler</p>
            <p className="text-3xl font-bold text-[#312925] mt-1">
              {loading ? '—' : totalProducts}
            </p>
            <p className="text-[11px] text-[#8a7c73] mt-1">Fotoğraflı ve varyantlı</p>
          </div>
        </div>

        {/* Store List Header & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#312925]">Yönetilen Mağazalar</h2>
              <p className="text-xs text-[#786c64]">
                Açılan tüm butiklerin vitrin ve panel erişimleri.
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
            <div className="text-center py-20 text-[#8a7c73] bg-white rounded-3xl border border-[#e8dfcf]">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-[#786c64]" />
              Mağazalar yükleniyor (Veritabanı uyanıyor olabilir)...
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#e8dfcf] p-8 space-y-3">
              <Store className="w-10 h-10 text-[#8a7c73] mx-auto" />
              <h3 className="font-bold text-base text-[#312925]">Henüz kayıtlı mağaza yok</h3>
              <p className="text-xs text-[#786c64] max-w-md mx-auto">
                İlk butiğinizi açmak için yukarıdaki &quot;Yeni Mağaza Aç&quot; butonuna tıklayın.
              </p>
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
                        <p className="text-sm font-bold text-[#783e35] mt-0.5">
                          {formatCurrency(st.totalRevenue)}
                        </p>
                      </div>
                    </div>

                    {/* Contact Badges */}
                    <div className="flex items-center justify-between text-xs text-[#665a52] pt-1">
                      <a
                        href={`https://wa.me/${cleanPhoneForWhatsApp(st.whatsappPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#2d5c48] hover:underline font-mono"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {st.whatsappPhone}
                      </a>

                      <a
                        href={`https://instagram.com/${st.instagramHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#8b634d] hover:underline"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        @{st.instagramHandle.replace('@', '')}
                      </a>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-4 border-t border-[#ede5d8] space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/${st.slug}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#f9f7f2] hover:bg-[#ede5d8] text-[#312925] border border-[#ded4c3] transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#8b634d]" />
                        Vitrini Aç
                      </Link>

                      <Link
                        href={`/${st.slug}/panel`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#312925] hover:bg-[#1e1916] text-[#f7f4ee] shadow-xs transition"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#cfbeab]" />
                        Satıcı Paneli
                      </Link>
                    </div>

                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/${st.slug}`;
                        navigator.clipboard.writeText(link);
                        setCopiedSlug(st.slug);
                        setTimeout(() => setCopiedSlug(null), 2000);
                        showToast(`Bio linki kopyalandı: ${link}`);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-semibold text-[#786c64] hover:text-[#312925] hover:bg-[#f0ebe1] transition cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
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

      {/* MODAL: Yeni Butik Tanımlama (Rastgele Güvenli PIN ile) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e8dfcf] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b634d] bg-[#f9f7f2] px-2 py-0.5 rounded-full border border-[#ede5d8]">
                  SaaS Mağaza Kurulumu
                </span>
                <h3 className="text-lg font-bold text-[#312925] mt-1">
                  Yeni Butik / Dükkan Tanımla
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#9c8e84] hover:text-[#312925] text-sm p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-[#fcf0ee] border border-[#f5c7c1] text-[#783e35] p-3 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                    Butik / Mağaza Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Alaçatı Keten Butik"
                    value={newStoreName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded4c3] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8b634d] text-[#312925]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                    Bio Linki (slug) *
                  </label>
                  <div className="flex items-center px-3 py-2 rounded-xl border border-[#ded4c3] bg-[#f9f7f2] text-xs font-mono text-[#312925]">
                    <span className="text-[#8a7c73]">/</span>
                    <input
                      type="text"
                      required
                      placeholder="alacatibutik"
                      value={newStoreSlug}
                      onChange={(e) => setNewStoreSlug(e.target.value)}
                      className="w-full bg-transparent outline-none pl-1 text-[#312925] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                    WhatsApp Sipariş Telefonu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="905321234567"
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded4c3] bg-[#fdfcf9] text-xs sm:text-sm font-mono outline-none focus:border-[#8b634d] text-[#312925]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                    Instagram Kullanıcı Adı *
                  </label>
                  <div className="flex items-center px-3 py-2 rounded-xl border border-[#ded4c3] bg-[#fdfcf9] text-xs text-[#312925]">
                    <span className="text-[#8a7c73]">@</span>
                    <input
                      type="text"
                      required
                      placeholder="alacatibutik"
                      value={newStoreIg}
                      onChange={(e) => setNewStoreIg(e.target.value)}
                      className="w-full bg-transparent outline-none pl-1 text-[#312925]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                    Slogan / Açıklama (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Doğal Keten & Şık Tasarımlar"
                    value={newStoreTagline}
                    onChange={(e) => setNewStoreTagline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ded4c3] bg-[#fdfcf9] text-xs outline-none text-[#312925]"
                  />
                </div>
              </div>

              {/* Natural Earth Palette Preset Selector */}
              <div className="space-y-2 pt-2 border-t border-[#ede5d8]">
                <label className="block text-xs font-bold text-[#312925]">
                  Doğal Mimari Renk Paleti Seçimi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PALETTE_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setNewStoreTheme(p.primary)}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        newStoreTheme === p.primary
                          ? 'border-[#312925] bg-[#f7f4ee] ring-1 ring-[#312925]'
                          : 'border-[#ded4c3] bg-white hover:border-[#8b634d]'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-lg shrink-0 mt-0.5 border border-black/10"
                        style={{ backgroundColor: p.primary }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#312925] truncate">{p.name}</p>
                        <p className="text-[10px] text-[#786c64] line-clamp-1">{p.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#ede5d8]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#786c64] hover:bg-[#f0ebe1] transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#312925] hover:bg-[#1e1916] text-[#f7f4ee] shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Açılıyor...' : 'Mağazayı Aç (Geçici PIN Üret)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Üretilen Tek Seferlik Geçici PIN Bilgisi */}
      {createdStoreResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e8dfcf] rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f0ebe1] text-[#786c64] flex items-center justify-center mx-auto border border-[#ded4c3]">
              <KeyRound className="w-7 h-7 text-[#8b634d]" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#47635e] bg-[#edf2ec] px-2.5 py-0.5 rounded-full border border-[#d6dfd4]">
                Mağaza Başarıyla Açıldı
              </span>
              <h3 className="text-lg font-bold text-[#312925] mt-2">
                {createdStoreResult.name}
              </h3>
              <p className="text-xs text-[#786c64] mt-1 font-mono">
                /{createdStoreResult.slug}
              </p>
            </div>

            <div className="bg-[#f9f7f2] p-4 rounded-2xl border border-[#ede5d8] space-y-2">
              <p className="text-xs font-semibold text-[#786c64]">
                Satıcı İçin Üretilen Geçici Giriş PIN Kodu:
              </p>
              <p className="text-2xl font-mono font-bold tracking-widest text-[#312925]">
                {createdStoreResult.temporaryPin}
              </p>
              <p className="text-[11px] text-[#b94a38] font-medium leading-tight pt-1">
                ⚠️ Güvenlik gereği bu PIN yalnızca BİR KEZ gösterilir. Satıcı ilk girişinde en az 6 haneli yeni bir PIN belirlemek zorundadır.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdStoreResult.temporaryPin);
                  setCopiedPin(true);
                  setTimeout(() => setCopiedPin(false), 2000);
                }}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-[#f0ebe1] hover:bg-[#e4dbcd] text-[#312925] border border-[#ded4c3] transition cursor-pointer"
              >
                {copiedPin ? 'PIN Kopyalandı ✓' : 'PIN Kodunu Kopyala'}
              </button>

              <button
                onClick={() => setCreatedStoreResult(null)}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-[#312925] hover:bg-[#1e1916] text-[#f7f4ee] transition cursor-pointer"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
