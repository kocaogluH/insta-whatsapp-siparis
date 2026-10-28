'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Settings,
  Barcode,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  MessageCircle,
  Instagram,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Copy,
  Store,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Upload,
  Lock,
  Camera,
  Image as ImageIcon,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, buildCustomerStatusWhatsAppUrl } from '@/lib/format';

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceDiff: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string;
  category: string;
  sku: string | null;
  barcode: string | null;
  stock: number;
  isActive: boolean;
  hideWhenOutOfStock: boolean;
  instagramPostUrl: string | null;
  variants: Variant[];
}

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryType: string;
  paymentMethod: string;
  channel: string;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  status: string;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
}

interface StoreData {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  themeColor: string;
  whatsappPhone: string;
  instagramHandle: string;
  shippingFee: number;
  freeShippingThreshold: number;
  address: string | null;
  allowStorePickup: boolean;
  ibanInfo: string | null;
  pinCode: string;
  products: Product[];
  orders: Order[];
}

const STATUS_META: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  NEW: {
    label: 'Yeni',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
  },
  PREPARING: {
    label: 'Hazırlanıyor',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Package,
  },
  SHIPPED: {
    label: 'Kargoda',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Tamamlandı',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'İptal',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: XCircle,
  },
};

export default function StoreSellerPanel({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'pos' | 'settings'>('products');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedBio, setCopiedBio] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Simple PIN Login Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // New Product State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Elbise');
  const [prodPrice, setProdPrice] = useState('');
  const [prodComparePrice, setProdComparePrice] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodVariants, setProdVariants] = useState<
    { name: string; sku: string; stock: number }[]
  >([
    { name: 'S', sku: '', stock: 5 },
    { name: 'M', sku: '', stock: 5 },
  ]);

  // Settings State
  const [settings, setSettings] = useState({
    name: '',
    tagline: '',
    whatsappPhone: '',
    instagramHandle: '',
    shippingFee: 49.9,
    freeShippingThreshold: 750,
    address: '',
    allowStorePickup: true,
    ibanInfo: '',
    pinCode: '',
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetch(`/api/store/${slug}`, { cache: 'no-store' });
      if (res.ok) {
        const data: StoreData = await res.json();
        setStore(data);
        setSettings({
          name: data.name,
          tagline: data.tagline || '',
          whatsappPhone: data.whatsappPhone,
          instagramHandle: data.instagramHandle,
          shippingFee: data.shippingFee,
          freeShippingThreshold: data.freeShippingThreshold,
          address: data.address || '',
          allowStorePickup: data.allowStorePickup,
          ibanInfo: data.ibanInfo || '',
          pinCode: data.pinCode || '1234',
        });

        // Check stored PIN auth
        const storedAuth = localStorage.getItem(`auth_pin_${slug}`);
        if (storedAuth === (data.pinCode || '1234')) {
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    if (enteredPin === (store.pinCode || '1234')) {
      setIsAuthenticated(true);
      localStorage.setItem(`auth_pin_${slug}`, enteredPin);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Image upload from camera or gallery
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProdImageUrl(data.url);
        showToast('Fotoğraf başarıyla yüklendi! 📸');
      } else {
        showToast('Fotoğraf yüklenemedi');
      }
    } catch {
      showToast('Yükleme sırasında hata oluştu');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    if (!prodName || !prodPrice || !prodImageUrl) {
      showToast('Lütfen ürün adı, fiyat ve fotoğraf ekleyin.');
      return;
    }

    const validVariants = prodVariants.filter((v) => v.name.trim() !== '');

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: store.id,
        name: prodName.trim(),
        category: prodCategory,
        price: Number(prodPrice),
        compareAtPrice: prodComparePrice ? Number(prodComparePrice) : null,
        imageUrl: prodImageUrl,
        sku: prodSku || null,
        stock: Number(prodStock),
        variants: validVariants,
      }),
    });

    if (res.ok) {
      showToast('Ürün başarıyla vitrine eklendi! 🎉');
      setShowAddProduct(false);
      setProdName('');
      setProdPrice('');
      setProdComparePrice('');
      setProdImageUrl('');
      fetchStore();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`Sipariş durumu "${STATUS_META[status]?.label || status}" yapıldı.`);
      fetchStore();
    }
  };

  const handleStockQuickChange = async (
    productId: string,
    variantId: string | null,
    newStock: number
  ) => {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        variantId
          ? { variantId, variantStock: Math.max(0, newStock) }
          : { stock: Math.max(0, newStock) }
      ),
    });
    if (res.ok) {
      fetchStore();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    const res = await fetch(`/api/store/${store.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (res.ok) {
      showToast('Mağaza ayarları kaydedildi!');
      localStorage.setItem(`auth_pin_${slug}`, settings.pinCode);
      fetchStore();
    }
  };

  if (loading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
      </div>
    );
  }

  // PIN Login Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-sm w-full p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">{store.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Satıcı yönetim paneline erişmek için 4 haneli PIN kodunuzu girin.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="PIN Kodu (Varsayılan: 1234)"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full text-center text-xl font-black tracking-widest py-3 px-4 bg-slate-900 border border-slate-700 rounded-2xl text-white outline-none focus:border-rose-500"
              />
              {pinError && (
                <p className="text-xs text-rose-400 mt-2 font-bold">
                  Hatalı PIN kodu! (Varsayılan: 1234)
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-lg cursor-pointer"
            >
              Giriş Yap
            </button>
          </form>

          <p className="text-[11px] text-slate-500">
            PIN kodunu unuttuysanız Süper Admin panelinden görebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  const newOrdersCount = store.orders.filter((o) => o.status === 'NEW').length;
  const filteredOrders = store.orders.filter((o) =>
    statusFilter === 'ALL' ? true : o.status === statusFilter
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
              style={{ backgroundColor: store.themeColor }}
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm sm:text-base text-slate-900 leading-tight">
                  {store.name}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  Panel
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                /{store.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/${store.slug}`;
                navigator.clipboard.writeText(url);
                setCopiedBio(true);
                setTimeout(() => setCopiedBio(false), 2000);
                showToast('Instagram Bio linki kopyalandı!');
              }}
              className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedBio ? 'Kopyalandı ✓' : 'Bio Linkini Kopyala'}
            </button>

            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-bold bg-slate-950 hover:bg-slate-800 text-white px-3 py-2 rounded-xl transition"
            >
              <Eye className="w-3.5 h-3.5" />
              Vitrini Gör
            </Link>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Package className="w-4 h-4" />
            Ürünler ({store.products.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Siparişler ({store.orders.length})
            {newOrdersCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {newOrdersCount} Yeni
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'pos'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Barcode className="w-4 h-4" />
            Dükkan / Kasa Satışı
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Settings className="w-4 h-4" />
            Mağaza Ayarları
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* TAB 1: PRODUCTS & SIMPLE PHOTO UPLOAD */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Ürün Listesi & Hızlı Ekleme
                </h2>
                <p className="text-xs text-slate-500">
                  Telefonunuzdan fotoğraf seçerek 1 dakikada vitrine ürün ekleyin.
                </p>
              </div>

              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {showAddProduct ? 'Formu Kapat' : 'Fotoğraflı Yeni Ürün Ekle'}
              </button>
            </div>

            {/* Quick Add Product Form with File Upload */}
            {showAddProduct && (
              <form
                onSubmit={handleCreateProduct}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5"
              >
                <h3 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-3">
                  📸 Telefondan Yeni Ürün Ekle
                </h3>

                {/* Photo Upload Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Ürün Fotoğrafı Seç (Galeri veya Kamera) *
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label className="w-full sm:w-44 h-44 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-900 bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden shrink-0">
                      {prodImageUrl ? (
                        <img
                          src={prodImageUrl}
                          alt="Önizleme"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-500">
                          <Camera className="w-8 h-8 mx-auto mb-1 text-slate-400" />
                          <span className="text-xs font-bold block">
                            {uploadingImage ? 'Yükleniyor...' : 'Fotoğraf Çek / Yükle'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Galeri veya kamera
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="font-bold text-slate-800">
                        Fotoğraf eklemek çok kolay:
                      </p>
                      <p>
                        Kutucuğa tıklayarak telefonunuzun kamerasını açabilir veya galeriden
                        ürün fotoğrafı seçebilirsiniz.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Fotoğraf anında sisteme yüklenir ve vitrinde görünür.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ürün Adı *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Keten Düğmeli Elbise"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      placeholder="Elbise, Üst Giyim..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Satış Fiyatı (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="499.90"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      İndirim Öncesi Fiyat (Opsiyonel)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="650.00"
                      value={prodComparePrice}
                      onChange={(e) => setProdComparePrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Toplam Stok Adedi
                    </label>
                    <input
                      type="number"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Simple Variants Builder */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Beden / Renk Seçenekleri
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setProdVariants([
                          ...prodVariants,
                          { name: '', sku: '', stock: 5 },
                        ])
                      }
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      + Beden Ekle
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {prodVariants.map((v, i) => (
                      <div
                        key={i}
                        className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-1"
                      >
                        <input
                          type="text"
                          placeholder="Beden (S, M, 38)"
                          value={v.name}
                          onChange={(e) => {
                            const copy = [...prodVariants];
                            copy[i].name = e.target.value;
                            setProdVariants(copy);
                          }}
                          className="w-full text-xs font-bold outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProdVariants(prodVariants.filter((_, idx) => idx !== i))
                          }
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md"
                  >
                    Ürünü Vitrine Yayınla 🚀
                  </button>
                </div>
              </form>
            )}

            {/* Product Cards List */}
            <div className="space-y-3">
              {store.products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-14 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {p.name}
                      </h4>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        {formatCurrency(p.price)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Kalan Stok: <strong className="text-slate-800">{p.stock} adet</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Quick Stock Controls */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleStockQuickChange(p.id, null, p.stock - 1)}
                        className="p-1 text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-5 text-center">{p.stock}</span>
                      <button
                        type="button"
                        onClick={() => handleStockQuickChange(p.id, null, p.stock + 1)}
                        className="p-1 text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">
                Gelen Siparişler ({store.orders.length})
              </h2>
              <button
                onClick={fetchStore}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Yenile
              </button>
            </div>

            {store.orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">Henüz sipariş yok</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {store.orders.map((ord) => {
                  const meta = STATUS_META[ord.status] || STATUS_META.NEW;
                  const notifyUrl = buildCustomerStatusWhatsAppUrl(
                    ord.customerPhone,
                    ord.customerName,
                    ord.orderNumber,
                    store.name,
                    ord.status,
                    ord.totalAmount
                  );

                  return (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">
                            #{ord.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                          {ord.channel === 'WHATSAPP' ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              WhatsApp
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full">
                              Instagram DM
                            </span>
                          )}
                        </div>

                        <span className="font-black text-base text-slate-900">
                          {formatCurrency(ord.totalAmount)}
                        </span>
                      </div>

                      {/* Customer & Items */}
                      <div className="text-xs space-y-1">
                        <p>
                          <strong>Müşteri:</strong> {ord.customerName} ({ord.customerPhone})
                        </p>
                        <p>
                          <strong>Adres:</strong> {ord.customerAddress}
                        </p>
                        <p className="text-slate-500">
                          {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-400 mr-1">
                            Durum:
                          </span>
                          {['NEW', 'PREPARING', 'SHIPPED', 'COMPLETED'].map((stKey) => (
                            <button
                              key={stKey}
                              onClick={() => handleUpdateOrderStatus(ord.id, stKey)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                ord.status === stKey
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {STATUS_META[stKey].label}
                            </button>
                          ))}
                        </div>

                        <a
                          href={notifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Müşteriye WhatsApp Bildir
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PHYSICAL STORE POS */}
        {activeTab === 'pos' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Fiziksel Dükkan / Kasa Satışı
              </h2>
              <p className="text-xs text-slate-500">
                Dükkanda elden satılan ürünün stoğunu tek dokunuşla düşürün. Böylece Instagram
                müşterisi biten ürünü sipariş edemez.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {store.products.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{p.name}</p>
                    <p className="text-[11px] font-black text-emerald-700 mt-0.5">
                      Kalan Stok: {p.stock}
                    </p>
                  </div>

                  <button
                    disabled={p.stock <= 0}
                    onClick={() => {
                      handleStockQuickChange(p.id, null, p.stock - 1);
                      showToast(`Dükkanda satıldı: ${p.name} (-1 stok)`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    -1 Elden Satıldı
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs max-w-2xl space-y-4"
          >
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              Mağaza & İletişim Ayarları
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mağaza Adı
                </label>
                <input
                  type="text"
                  required
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Numarası
                </label>
                <input
                  type="text"
                  required
                  value={settings.whatsappPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instagram Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={settings.instagramHandle}
                  onChange={(e) =>
                    setSettings({ ...settings, instagramHandle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Panel Giriş PIN Kodu
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={settings.pinCode}
                  onChange={(e) => setSettings({ ...settings, pinCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono text-amber-600 font-bold outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Havale / EFT için IBAN
                </label>
                <input
                  type="text"
                  value={settings.ibanInfo}
                  onChange={(e) => setSettings({ ...settings, ibanInfo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-black text-xs bg-slate-950 hover:bg-slate-800 text-white cursor-pointer shadow-md"
            >
              Ayarları Kaydet
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
