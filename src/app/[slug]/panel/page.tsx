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
  RefreshCw,
  Eye,
  Camera,
  Lock,
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
    badgeClass: 'bg-[#faf2ed] text-[#a87857] border-[#e8dfcf]',
    icon: Clock,
  },
  PREPARING: {
    label: 'Hazırlanıyor',
    badgeClass: 'bg-[#f4f7f6] text-[#47635e] border-[#d6dfd4]',
    icon: Package,
  },
  SHIPPED: {
    label: 'Kargoda',
    badgeClass: 'bg-[#f7f2eb] text-[#8b634d] border-[#e2d3be]',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Tamamlandı',
    badgeClass: 'bg-[#edf2ec] text-[#3d5752] border-[#c8d4c6]',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'İptal',
    badgeClass: 'bg-[#faebe8] text-[#8e3c2f] border-[#f0c2b8]',
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
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0]">
        <RefreshCw className="w-8 h-8 text-[#786c64] animate-spin" />
      </div>
    );
  }

  // PIN Login Gate in Soft Earth Tones
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-[#e8dfcf] rounded-3xl max-w-sm w-full p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#f4ece1] text-[#7a513a] flex items-center justify-center mx-auto border border-[#e2d8c5]">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#312925]">{store.name}</h2>
            <p className="text-xs text-[#786c64] mt-1">
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
                className="w-full text-center text-xl font-bold tracking-widest py-3 px-4 bg-[#f9f7f2] border border-[#e2d8c5] rounded-2xl text-[#312925] outline-none focus:border-[#8b634d]"
              />
              {pinError && (
                <p className="text-xs text-[#8e3c2f] mt-2 font-semibold">
                  Hatalı PIN kodu! (Varsayılan: 1234)
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl font-semibold text-xs sm:text-sm bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] shadow-sm cursor-pointer transition"
            >
              Giriş Yap
            </button>
          </form>

          <p className="text-[11px] text-[#8a7c73]">
            PIN kodunu unuttuysanız Süper Admin panelinden görebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  const newOrdersCount = store.orders.filter((o) => o.status === 'NEW').length;

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#312925] pb-20 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#312925] text-[#f7f4ee] px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-[#4a3f39]">
          <CheckCircle2 className="w-4 h-4 text-[#cfbeab]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-[#e8dfcf] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
              style={{ backgroundColor: store.themeColor || '#3c302a' }}
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base text-[#312925] leading-tight">
                  {store.name}
                </h1>
                <span className="bg-[#ede2d5] text-[#6d4c38] text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                  Panel
                </span>
              </div>
              <p className="text-[11px] text-[#8a7c73] font-mono">
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
              className="inline-flex items-center gap-1 text-xs font-semibold bg-[#f4ece1] hover:bg-[#eadbc9] text-[#4a3a31] px-3 py-2 rounded-xl transition cursor-pointer border border-[#e2d8c5]"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedBio ? 'Kopyalandı ✓' : 'Bio Linkini Kopyala'}
            </button>

            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-semibold bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] px-3 py-2 rounded-xl transition shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Vitrini Gör
            </Link>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 border-t border-[#f0e9dd] overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'border-[#3c302a] text-[#312925]'
                : 'border-transparent text-[#786c64]'
            }`}
          >
            <Package className="w-4 h-4" />
            Ürünler ({store.products.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#3c302a] text-[#312925]'
                : 'border-transparent text-[#786c64]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Siparişler ({store.orders.length})
            {newOrdersCount > 0 && (
              <span className="bg-[#a87857] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {newOrdersCount} Yeni
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'pos'
                ? 'border-[#3c302a] text-[#312925]'
                : 'border-transparent text-[#786c64]'
            }`}
          >
            <Barcode className="w-4 h-4" />
            Dükkan / Kasa Satışı
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#3c302a] text-[#312925]'
                : 'border-transparent text-[#786c64]'
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
                <h2 className="text-base font-bold text-[#312925]">
                  Ürün Listesi & Hızlı Ekleme
                </h2>
                <p className="text-xs text-[#786c64]">
                  Telefonunuzdan fotoğraf seçerek ürün ekleyin.
                </p>
              </div>

              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="inline-flex items-center gap-1.5 bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {showAddProduct ? 'Formu Kapat' : 'Fotoğraflı Yeni Ürün Ekle'}
              </button>
            </div>

            {/* Quick Add Product Form with File Upload */}
            {showAddProduct && (
              <form
                onSubmit={handleCreateProduct}
                className="bg-white rounded-3xl border border-[#e8dfcf] p-5 sm:p-6 shadow-xs space-y-5"
              >
                <h3 className="font-bold text-sm text-[#312925] border-b border-[#f0e9dd] pb-3">
                  📸 Telefondan Yeni Ürün Ekle
                </h3>

                {/* Photo Upload Box */}
                <div>
                  <label className="block text-xs font-semibold text-[#4a3f39] mb-1.5">
                    1. Ürün Fotoğrafı Seç (Galeri veya Kamera) *
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label className="w-full sm:w-44 h-44 rounded-2xl border-2 border-dashed border-[#cfbeab] hover:border-[#3c302a] bg-[#f9f7f2] flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden shrink-0">
                      {prodImageUrl ? (
                        <img
                          src={prodImageUrl}
                          alt="Önizleme"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-3 text-[#786c64]">
                          <Camera className="w-8 h-8 mx-auto mb-1 text-[#8b634d]" />
                          <span className="text-xs font-bold block text-[#312925]">
                            {uploadingImage ? 'Yükleniyor...' : 'Fotoğraf Çek / Yükle'}
                          </span>
                          <span className="text-[10px] text-[#8a7c73]">
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

                    <div className="text-xs text-[#665a52] space-y-1">
                      <p className="font-semibold text-[#312925]">
                        Fotoğraf eklemek çok kolay:
                      </p>
                      <p>
                        Kutucuğa tıklayarak telefonunuzun kamerasını açabilir veya galeriden
                        ürün fotoğrafı seçebilirsiniz.
                      </p>
                      <p className="text-[11px] text-[#8a7c73]">
                        Fotoğraf anında sisteme yüklenir ve vitrinde görünür.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      Ürün Adı *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Keten Düğmeli Elbise"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8b634d] text-[#312925]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      placeholder="Elbise, Üst Giyim..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8b634d] text-[#312925]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      Satış Fiyatı (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="499.90"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8b634d] text-[#312925]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      İndirim Öncesi Fiyat (Opsiyonel)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="650.00"
                      value={prodComparePrice}
                      onChange={(e) => setProdComparePrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8b634d] text-[#312925]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      Toplam Stok Adedi
                    </label>
                    <input
                      type="number"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8b634d] text-[#312925]"
                    />
                  </div>
                </div>

                {/* Simple Variants Builder */}
                <div className="bg-[#f9f7f2] p-4 rounded-2xl border border-[#ede5d8] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#4a3f39]">
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
                      className="text-xs font-bold text-[#8b634d] hover:underline cursor-pointer"
                    >
                      + Beden Ekle
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {prodVariants.map((v, i) => (
                      <div
                        key={i}
                        className="bg-white p-2 rounded-xl border border-[#e2d8c5] flex items-center justify-between gap-1"
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
                          className="w-full text-xs font-bold outline-none text-[#312925]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProdVariants(prodVariants.filter((_, idx) => idx !== i))
                          }
                          className="text-[#9c8e84] hover:text-[#8e3c2f] p-0.5 cursor-pointer"
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
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#f4ece1] hover:bg-[#eadbc9] text-[#4a3a31] cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] cursor-pointer shadow-xs"
                  >
                    Ürünü Vitrine Yayınla
                  </button>
                </div>
              </form>
            )}

            {/* Product Cards List */}
            <div className="space-y-3">
              {store.products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#e8dfcf] p-3.5 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-14 h-16 rounded-xl object-cover bg-[#f4efe8] shrink-0 border border-[#e8dfcf]"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-[#312925] truncate">
                        {p.name}
                      </h4>
                      <p className="text-xs font-bold text-[#312925] mt-0.5">
                        {formatCurrency(p.price)}
                      </p>
                      <p className="text-[11px] text-[#786c64] mt-0.5">
                        Kalan Stok: <strong className="text-[#312925]">{p.stock} adet</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Quick Stock Controls */}
                    <div className="flex items-center gap-1 bg-[#f9f7f2] border border-[#e2d8c5] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleStockQuickChange(p.id, null, p.stock - 1)}
                        className="p-1 text-[#786c64] hover:text-[#312925] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-5 text-center text-[#312925]">{p.stock}</span>
                      <button
                        type="button"
                        onClick={() => handleStockQuickChange(p.id, null, p.stock + 1)}
                        className="p-1 text-[#786c64] hover:text-[#312925] cursor-pointer"
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
              <h2 className="text-base font-bold text-[#312925]">
                Gelen Siparişler ({store.orders.length})
              </h2>
              <button
                onClick={fetchStore}
                className="text-xs font-semibold text-[#786c64] hover:text-[#312925] flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Yenile
              </button>
            </div>

            {store.orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#e8dfcf] p-12 text-center shadow-xs">
                <ShoppingCart className="w-10 h-10 text-[#cfbeab] mx-auto mb-2" />
                <p className="font-bold text-[#312925]">Henüz sipariş yok</p>
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
                      className="bg-white rounded-3xl border border-[#e8dfcf] p-4 sm:p-5 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0e9dd] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#312925]">
                            #{ord.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                          {ord.channel === 'WHATSAPP' ? (
                            <span className="text-[10px] font-medium text-[#47635e] bg-[#edf2ec] px-2 py-0.5 rounded-full">
                              WhatsApp
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-[#8b634d] bg-[#fbf7f4] px-2 py-0.5 rounded-full">
                              Instagram DM
                            </span>
                          )}
                        </div>

                        <span className="font-bold text-base text-[#312925]">
                          {formatCurrency(ord.totalAmount)}
                        </span>
                      </div>

                      {/* Customer & Items */}
                      <div className="text-xs space-y-1 text-[#665a52]">
                        <p>
                          <strong>Müşteri:</strong> {ord.customerName} ({ord.customerPhone})
                        </p>
                        <p>
                          <strong>Adres:</strong> {ord.customerAddress}
                        </p>
                        <p className="text-[#8a7c73]">
                          {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-[#f0e9dd] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[11px] font-semibold text-[#8a7c73] mr-1">
                            Durum:
                          </span>
                          {['NEW', 'PREPARING', 'SHIPPED', 'COMPLETED'].map((stKey) => (
                            <button
                              key={stKey}
                              onClick={() => handleUpdateOrderStatus(ord.id, stKey)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${
                                ord.status === stKey
                                  ? 'bg-[#3c302a] text-white'
                                  : 'bg-[#f4ece1] text-[#4a3a31] hover:bg-[#eadbc9]'
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
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#47635e] hover:bg-[#384e4a] px-3 py-1.5 rounded-xl transition shadow-xs"
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
          <div className="bg-white rounded-3xl border border-[#e8dfcf] p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#312925]">
                Fiziksel Dükkan / Kasa Satışı
              </h2>
              <p className="text-xs text-[#786c64]">
                Dükkanda elden satılan ürünün stoğunu tek dokunuşla düşürün. Böylece Instagram
                müşterisi biten ürünü sipariş edemez.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {store.products.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl border border-[#e8dfcf] bg-[#f9f7f2] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#312925] truncate">{p.name}</p>
                    <p className="text-[11px] font-semibold text-[#47635e] mt-0.5">
                      Kalan Stok: {p.stock}
                    </p>
                  </div>

                  <button
                    disabled={p.stock <= 0}
                    onClick={() => {
                      handleStockQuickChange(p.id, null, p.stock - 1);
                      showToast(`Dükkanda satıldı: ${p.name} (-1 stok)`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#3c302a] text-[#f7f4ee] font-semibold text-xs hover:bg-[#2b221d] disabled:opacity-40 cursor-pointer shrink-0"
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
            className="bg-white rounded-3xl border border-[#e8dfcf] p-5 sm:p-6 shadow-xs max-w-2xl space-y-4"
          >
            <h2 className="text-base font-bold text-[#312925] border-b border-[#f0e9dd] pb-3">
              Mağaza & İletişim Ayarları
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Mağaza Adı
                </label>
                <input
                  type="text"
                  required
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#312925]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  WhatsApp Numarası
                </label>
                <input
                  type="text"
                  required
                  value={settings.whatsappPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm font-mono outline-none text-[#312925]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Instagram Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={settings.instagramHandle}
                  onChange={(e) =>
                    setSettings({ ...settings, instagramHandle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#312925]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Panel Giriş PIN Kodu
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={settings.pinCode}
                  onChange={(e) => setSettings({ ...settings, pinCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm font-mono text-[#8b634d] font-bold outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Havale / EFT için IBAN
                </label>
                <input
                  type="text"
                  value={settings.ibanInfo}
                  onChange={(e) => setSettings({ ...settings, ibanInfo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2d8c5] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#312925]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#3c302a] hover:bg-[#2b221d] text-[#f7f4ee] cursor-pointer shadow-xs"
            >
              Ayarları Kaydet
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
