'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Settings,
  Barcode,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Copy,
  RefreshCw,
  Eye,
  Camera,
  Lock,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  LogOut,
  KeyRound,
} from 'lucide-react';
import {
  formatCurrency,
  buildCustomerStatusWhatsAppUrl,
  cleanPhoneForWhatsApp,
} from '@/lib/format';

export interface Variant {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceDiff: number;
  stock: number;
}

export interface Product {
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

export interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
}

export interface Order {
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

export interface StoreData {
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
  mustChangePin: boolean;
  products: Product[];
  orders: Order[];
}

interface PublicStore {
  id: string;
  slug: string;
  name: string;
  themeColor: string;
  logoUrl: string | null;
}

const STATUS_META: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  NEW: {
    label: 'Yeni',
    badgeClass: 'bg-[#f9f1e6] text-[#8e5e38] border-[#eddcc8]',
    icon: Clock,
  },
  PREPARING: {
    label: 'Hazırlanıyor',
    badgeClass: 'bg-[#eaf0f2] text-[#2f5663] border-[#cfdee2]',
    icon: Package,
  },
  SHIPPED: {
    label: 'Kargoda',
    badgeClass: 'bg-[#f7ede5] text-[#8c5f4a] border-[#e5dcce]',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Tamamlandı',
    badgeClass: 'bg-[#edf2eb] text-[#415e58] border-[#d4e0d1]',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'İptal',
    badgeClass: 'bg-[#f7ece8] text-[#783e35] border-[#edd5cd]',
    icon: XCircle,
  },
};

export default function SellerPanelClient({
  publicStore,
  slug,
}: {
  publicStore: PublicStore;
  slug: string;
}) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'pos' | 'settings'>('products');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedBio, setCopiedBio] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Kimlik Doğrulama Durumu (HttpOnly Çerez ile yönetilir)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Zorunlu PIN Değiştirme Durumu (En az 6 hane kuralı)
  const [mustChangePin, setMustChangePin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Yeni Ürün Ekleme State'i
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

  // Ayarlar Form State'i
  const [settings, setSettings] = useState({
    name: publicStore.name,
    tagline: '',
    whatsappPhone: '',
    instagramHandle: '',
    shippingFee: 49.9,
    freeShippingThreshold: 750,
    address: '',
    allowStorePickup: true,
    ibanInfo: '',
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Yetkili API'den panel verilerini çekme
  const fetchPanelData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/store/${slug}/panel-data`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const data: StoreData = await res.json();
        setStore(data);
        setIsAuthenticated(true);
        setMustChangePin(data.mustChangePin);
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
        });
      } else {
        setIsAuthenticated(false);
        setStore(null);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      setCheckingSession(false);
    }
  }, [slug]);

  // Sayfa açıldığında sunucu çerezini kontrol et
  useEffect(() => {
    fetchPanelData();
  }, [fetchPanelData]);

  // Sunucu taraflı PIN ile giriş (POST /api/store/[slug]/login)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch(`/api/store/${slug}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Geçersiz PIN kodu.');
        return;
      }

      setEnteredPin('');
      setIsAuthenticated(true);
      if (data.mustChangePin) {
        setMustChangePin(true);
      }
      fetchPanelData();
    } catch {
      setPinError('Bağlantı hatası oluştu.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Zorunlu 6+ Hane Yeni PIN Belirleme (POST /api/store/[slug]/change-pin)
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError(null);

    if (newPin.trim().length < 6) {
      setChangePinError('Yeni PIN kodu en az 6 haneli olmalıdır.');
      return;
    }

    if (newPin !== newPinConfirm) {
      setChangePinError('Girdiğiniz PIN kodları birbiriyle uyuşmuyor.');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await fetch(`/api/store/${slug}/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin: newPin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setChangePinError(data.error || 'PIN güncellenemedi.');
        return;
      }

      showToast('Yeni PIN kodunuz başarıyla kaydedildi! 🔒');
      setMustChangePin(false);
      setNewPin('');
      setNewPinConfirm('');
      fetchPanelData();
    } catch {
      setChangePinError('PIN güncellenirken hata oluştu.');
    } finally {
      setIsChangingPin(false);
    }
  };

  // Güvenli Çıkış (POST /api/auth/logout)
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    setStore(null);
    setMustChangePin(false);
  };

  // Yükleme öncesi istemci tarafında fotoğrafı max 1600px'e küçültme (Bant genişliği & bellek optimizasyonu)
  const resizeImageBeforeUpload = (file: File, maxDim = 1600): Promise<File | Blob> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        return resolve(file);
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width <= maxDim && height <= maxDim) {
          return resolve(file);
        }

        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resized = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resized);
            } else {
              resolve(file);
            }
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.88
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // 1600px boyutuna küçült
      const optimizedFile = await resizeImageBeforeUpload(file, 1600);
      const formData = new FormData();
      formData.append('file', optimizedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProdImageUrl(data.url);
        showToast('Fotoğraf başarıyla yüklendi! 📸');
      } else {
        const err = await res.json();
        showToast(err.error || 'Fotoğraf yüklenemedi');
      }
    } catch {
      showToast('Yükleme sırasında hata oluştu');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodImageUrl) {
      showToast('Lütfen ürün adı, fiyat ve fotoğraf ekleyin.');
      return;
    }

    const validVariants = prodVariants.filter((v) => v.name.trim() !== '');

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      showToast('Ürün başarıyla vitrine eklendi!');
      setShowAddProduct(false);
      setProdName('');
      setProdPrice('');
      setProdComparePrice('');
      setProdImageUrl('');
      fetchPanelData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Ürün eklenemedi');
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
      fetchPanelData();
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
      fetchPanelData();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`/api/store/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (res.ok) {
      showToast('Mağaza ayarları kaydedildi!');
      fetchPanelData();
    } else {
      const err = await res.json();
      showToast(err.error || 'Ayarlar kaydedilemedi');
    }
  };

  // Sayfa ilk kontrol edilirken minik zarif yükleyici
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee]">
        <RefreshCw className="w-8 h-8 text-[#78695e] animate-spin" />
      </div>
    );
  }

  // 1. EKRAN: GÜVENLİ PIN GİRİŞİ (SSR Sızıntısı Yok, Şifre İpucu Yok)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] flex items-center justify-center p-4 font-sans text-[#33261f]">
        <div className="bg-white border border-[#e5dcce] rounded-3xl max-w-sm w-full p-7 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#f2ece1] text-[#8c5f4a] flex items-center justify-center mx-auto border border-[#e5dcce] shadow-xs">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#33261f]">{publicStore.name}</h2>
            <p className="text-xs text-[#78695e] mt-1">
              Satıcı yönetim paneline erişmek için PIN kodunuzu girin.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={10}
                autoFocus
                placeholder="PIN Kodunuz"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full text-center text-2xl font-mono font-bold tracking-widest py-3 px-4 bg-[#fdfcf9] border border-[#e5dcce] rounded-2xl text-[#33261f] outline-none focus:border-[#8c5f4a] shadow-inner"
              />
              {pinError && (
                <p className="text-xs text-[#783e35] mt-2 font-semibold">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !enteredPin}
              className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] shadow-xs cursor-pointer transition disabled:opacity-50"
            >
              {isLoggingIn ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="pt-2 border-t border-[#f2ece1] text-[11px] text-[#9e8e82]">
            <Link href={`/${publicStore.slug}`} className="hover:underline text-[#78695e]">
              ← Vitrine Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. EKRAN: ZORUNLU YENİ PIN BELİRLEME (Eski sızan PIN'ler için zorunlu kural)
  if (mustChangePin) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] flex items-center justify-center p-4 font-sans text-[#33261f]">
        <div className="bg-white border border-[#e8dfcf] rounded-3xl max-w-md w-full p-7 sm:p-8 space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#fdf0ee] text-[#b94a38] flex items-center justify-center mx-auto border border-[#f5c7c1]">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#b94a38] bg-[#fdf0ee] px-2.5 py-0.5 rounded-full border border-[#f5c7c1]">
              Güvenlik Güncellemesi
            </span>
            <h2 className="text-xl font-bold text-[#33261f] mt-3">Yeni Güvenli PIN Belirleyin</h2>
            <p className="text-xs text-[#78695e] mt-1.5 leading-relaxed">
              Hesap güvenliğinizi korumak amacıyla eski varsayılan PIN kodları geçersiz kılınmıştır. Lütfen yalnızca sizin bileceğiniz <strong>en az 6 haneli</strong> yeni bir PIN kodu belirleyin.
            </p>
          </div>

          <form onSubmit={handleChangePin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                Yeni PIN Kodu (En az 6 karakter) *
              </label>
              <input
                type="password"
                required
                maxLength={12}
                placeholder="Örn: 582941"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full text-center text-xl font-mono font-bold tracking-widest py-2.5 px-4 bg-[#fdfcf9] border border-[#ded4c3] rounded-2xl text-[#33261f] outline-none focus:border-[#8b634d]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                Yeni PIN Kodu (Tekrar) *
              </label>
              <input
                type="password"
                required
                maxLength={12}
                placeholder="Tekrar girin"
                value={newPinConfirm}
                onChange={(e) => setNewPinConfirm(e.target.value)}
                className="w-full text-center text-xl font-mono font-bold tracking-widest py-2.5 px-4 bg-[#fdfcf9] border border-[#ded4c3] rounded-2xl text-[#33261f] outline-none focus:border-[#8b634d]"
              />
            </div>

            {changePinError && (
              <p className="text-xs text-[#b94a38] font-semibold text-center">
                {changePinError}
              </p>
            )}

            <button
              type="submit"
              disabled={isChangingPin || newPin.length < 6}
              className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-[#312925] hover:bg-[#1e1916] text-[#f7f4ee] shadow-xs cursor-pointer transition disabled:opacity-50"
            >
              {isChangingPin ? 'Kaydediliyor...' : 'Yeni PIN Kodunu Kaydet ve Panele Geç'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. EKRAN: YETKİLİ VE GÜVENLİ SATICI PANELİ
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee]">
        <RefreshCw className="w-8 h-8 text-[#78695e] animate-spin" />
      </div>
    );
  }

  const newOrdersCount = store.orders.filter((o) => o.status === 'NEW').length;
  const isDemoPhone = store.whatsappPhone === '905551234567' || !store.whatsappPhone;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#33261f] pb-20 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#3e312b] text-[#f7f4ee] px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-[#524139]">
          <CheckCircle2 className="w-4 h-4 text-[#cfbeab]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Demo Phone Alert Banner */}
      {isDemoPhone && (
        <div className="bg-[#faf2ea] border-b border-[#ebd7c5] py-2 px-4 text-xs text-[#784d33] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 max-w-3xl">
            <AlertCircle className="w-4 h-4 text-[#bf6d37] shrink-0" />
            <span>
              <strong>Dikkat: Test WhatsApp Numarası Kayıtlı.</strong> Sipariş mesajlarının gerçek telefonunuza ulaşması için Mağaza Ayarları sekmesinden numaranızı kaydedin.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="font-bold underline text-[#bf6d37] hover:text-[#914d20] cursor-pointer whitespace-nowrap"
          >
            Telefonumu Gir →
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-[#e5dcce] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
              style={{ backgroundColor: store.themeColor || '#3e312b' }}
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base text-[#33261f] leading-tight">
                  {store.name}
                </h1>
                <span className="bg-[#f2ece1] text-[#78695e] text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                  Panel
                </span>
              </div>
              <p className="text-[11px] text-[#78695e] font-mono">
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
              className="inline-flex items-center gap-1 text-xs font-semibold bg-[#f2ece1] hover:bg-[#eae3d6] text-[#33261f] px-3 py-2 rounded-xl transition cursor-pointer border border-[#e5dcce]"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedBio ? 'Kopyalandı ✓' : 'Bio Linkini Kopyala'}
            </button>

            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-semibold bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] px-3 py-2 rounded-xl transition shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Vitrini Gör
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-xs text-[#9e8e82] hover:text-[#783e35] px-2.5 py-2 rounded-xl hover:bg-[#fdf0ee] transition cursor-pointer"
              title="Güvenli Çıkış"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 border-t border-[#f2ece1] overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === 'products'
                ? 'border-[#3e312b] text-[#33261f]'
                : 'border-transparent text-[#78695e]'
            }`}
          >
            <Package className="w-4 h-4" />
            Ürünler ({store.products.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === 'orders'
                ? 'border-[#3e312b] text-[#33261f]'
                : 'border-transparent text-[#78695e]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Siparişler ({store.orders.length})
            {newOrdersCount > 0 && (
              <span className="bg-[#8c5f4a] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {newOrdersCount} Yeni
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === 'pos'
                ? 'border-[#3e312b] text-[#33261f]'
                : 'border-transparent text-[#78695e]'
            }`}
          >
            <Barcode className="w-4 h-4" />
            Dükkan / Kasa Satışı
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
              activeTab === 'settings'
                ? 'border-[#3e312b] text-[#33261f]'
                : 'border-transparent text-[#78695e]'
            }`}
          >
            <Settings className="w-4 h-4" />
            Mağaza Ayarları
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* TAB 1: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#33261f]">Katalogdaki Ürünler</h2>
                <p className="text-xs text-[#78695e]">
                  Vitrinde sergilenen ve stokta olan tüm ürünler.
                </p>
              </div>

              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] shadow-xs cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                {showAddProduct ? 'Kapat' : 'Yeni Ürün Ekle'}
              </button>
            </div>

            {/* Direct Camera / Photo Product Upload Modal */}
            {showAddProduct && (
              <form
                onSubmit={handleCreateProduct}
                className="bg-white rounded-3xl border border-[#e5dcce] p-5 sm:p-6 shadow-xs space-y-4"
              >
                <h3 className="font-bold text-sm sm:text-base text-[#33261f] border-b border-[#f2ece1] pb-3">
                  📸 Telefondan Fotoğraflı Yeni Ürün Girişi
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      Ürün Adı *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Kuşaklı Keten Elbise"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8c5f4a] text-[#33261f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      placeholder="Elbise, Üst Giyim, Çanta..."
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8c5f4a] text-[#33261f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      Satış Fiyatı (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="790"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8c5f4a] text-[#33261f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                      İndirimsiz Liste Fiyatı (₺ - Opsiyonel)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="990"
                      value={prodComparePrice}
                      onChange={(e) => setProdComparePrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none focus:border-[#8c5f4a] text-[#33261f]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold text-[#4a3f39]">
                      Ürün Fotoğrafı (Kameradan Çek veya Galeriden Seç) *
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f2ece1] hover:bg-[#eae3d6] text-[#33261f] border border-[#e5dcce] text-xs font-semibold cursor-pointer transition">
                        <Camera className="w-4 h-4 text-[#8c5f4a]" />
                        <span>{uploadingImage ? 'Yükleniyor...' : 'Kamera / Fotoğraf Seç'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>

                      <input
                        type="url"
                        placeholder="veya fotoğraf linki (URL) yapıştırın..."
                        value={prodImageUrl}
                        onChange={(e) => setProdImageUrl(e.target.value)}
                        className="w-full flex-1 px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs outline-none focus:border-[#8c5f4a] text-[#33261f]"
                      />
                    </div>

                    {prodImageUrl && (
                      <div className="mt-2 flex items-center gap-3 p-2 bg-[#f9f7f2] rounded-xl border border-[#ede5d8]">
                        <img
                          src={prodImageUrl}
                          alt="Önizleme"
                          className="w-12 h-12 object-cover rounded-lg border border-[#e5dcce]"
                        />
                        <span className="text-xs text-[#415e58] font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fotoğraf hazır
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-[#f2ece1]">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78695e] hover:bg-[#f2ece1] transition cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] shadow-xs cursor-pointer transition"
                  >
                    Ürünü Vitrine Ekle
                  </button>
                </div>
              </form>
            )}

            {/* Products List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {store.products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#e5dcce] p-4 flex gap-3 shadow-xs"
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-20 h-24 object-cover rounded-xl bg-[#f2ece1] shrink-0 border border-[#e5dcce]"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-xs sm:text-sm text-[#33261f] line-clamp-1">
                          {p.name}
                        </h4>
                        <span className="text-[10px] bg-[#f2ece1] text-[#78695e] px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-sm font-bold text-[#8c5f4a]">
                          {formatCurrency(p.price)}
                        </span>
                        {p.compareAtPrice && (
                          <span className="text-xs line-through text-[#a89a90]">
                            {formatCurrency(p.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Quick Editor */}
                    <div className="pt-2 border-t border-[#f2ece1] flex items-center justify-between">
                      <span className="text-xs text-[#78695e]">
                        Toplam Stok: <strong>{p.stock}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStockQuickChange(p.id, null, p.stock - 1)}
                          className="w-6 h-6 rounded-lg bg-[#f2ece1] hover:bg-[#eae3d6] text-[#33261f] flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleStockQuickChange(p.id, null, p.stock + 1)}
                          className="w-6 h-6 rounded-lg bg-[#f2ece1] hover:bg-[#eae3d6] text-[#33261f] flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
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
              <div>
                <h2 className="text-base font-bold text-[#33261f]">Siparişler</h2>
                <p className="text-xs text-[#78695e]">
                  WhatsApp veya Instagram DM ile gelen sipariş kayıtları.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                {['ALL', 'NEW', 'PREPARING', 'SHIPPED', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#3e312b] text-[#f7f4ee]'
                        : 'bg-white text-[#78695e] border border-[#e5dcce]'
                    }`}
                  >
                    {st === 'ALL' ? 'Tümü' : STATUS_META[st]?.label || st}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Cards */}
            <div className="space-y-3">
              {store.orders
                .filter((o) => statusFilter === 'ALL' || o.status === statusFilter)
                .map((order) => {
                  const meta = STATUS_META[order.status] || STATUS_META.NEW;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-[#e5dcce] p-4 sm:p-5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#f2ece1] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#33261f]">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-right sm:text-right">
                          <span className="text-sm font-bold text-[#33261f]">
                            {formatCurrency(order.totalAmount)}
                          </span>
                          <span className="text-[11px] text-[#9e8e82] block">
                            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="text-xs space-y-1 text-[#665a52]">
                        <p>
                          <strong>Müşteri:</strong> {order.customerName} &bull;{' '}
                          <a
                            href={`https://wa.me/${cleanPhoneForWhatsApp(order.customerPhone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[#8c5f4a] hover:underline"
                          >
                            {order.customerPhone}
                          </a>
                        </p>
                        <p>
                          <strong>Teslimat:</strong>{' '}
                          {order.deliveryType === 'STORE_PICKUP' ? '🏪 Mağazadan Gel-Al' : '🚚 Kargo Adresi: ' + order.customerAddress}
                        </p>
                      </div>

                      {/* Items */}
                      <div className="bg-[#fdfcf9] rounded-xl p-2.5 border border-[#ede5d8] text-xs space-y-1">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between text-[#33261f]">
                            <span>
                              {it.quantity}x {it.productName}{' '}
                              {it.variantName && `(${it.variantName})`}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(it.unitPrice * it.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f2ece1]">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-[11px] text-[#78695e]">Durum:</span>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="px-2 py-1 bg-[#fdfcf9] border border-[#e5dcce] rounded-lg text-xs font-semibold text-[#33261f] outline-none"
                          >
                            <option value="NEW">Yeni</option>
                            <option value="PREPARING">Hazırlanıyor</option>
                            <option value="SHIPPED">Kargoya Verildi</option>
                            <option value="COMPLETED">Tamamlandı</option>
                            <option value="CANCELLED">İptal</option>
                          </select>
                        </div>

                        {/* WhatsApp Customer Update Button */}
                        <a
                          href={buildCustomerStatusWhatsAppUrl(
                            order.customerPhone,
                            order.customerName,
                            order.orderNumber,
                            store.name,
                            order.status,
                            order.totalAmount
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#25d366]/10 text-[#128c7e] hover:bg-[#25d366]/20 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Müşteriye WhatsApp Bildirimi
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 3: POS / QUICK PHYSICAL STORE SELL */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-[#e5dcce] p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-[#8c5f4a]" />
                <h3 className="font-bold text-sm sm:text-base text-[#33261f]">
                  Dükkanda / Kasada Hızlı Satış
                </h3>
              </div>
              <p className="text-xs text-[#78695e]">
                Fiziksel butiğinizde yapılan satışları anında stoktan düşürün, Instagram vitrininizle
                eşzamanlı tutun.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                {store.products.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl border border-[#e5dcce] bg-[#fdfcf9] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#33261f] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#8c5f4a] font-semibold">
                        {formatCurrency(p.price)} &bull; Stok: {p.stock}
                      </p>
                    </div>

                    <button
                      onClick={() => handleStockQuickChange(p.id, null, p.stock - 1)}
                      disabled={p.stock <= 0}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] disabled:opacity-40 cursor-pointer transition shrink-0"
                    >
                      -1 Sat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="bg-white rounded-3xl border border-[#e5dcce] p-5 sm:p-6 shadow-xs max-w-2xl space-y-4"
          >
            <h2 className="text-base font-bold text-[#33261f] border-b border-[#f2ece1] pb-3">
              Mağaza & İletişim Ayarları
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Mağaza Adı
                </label>
                <input
                  type="text"
                  required
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#33261f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  WhatsApp Sipariş Numarası *
                </label>
                <input
                  type="text"
                  required
                  placeholder="905xxxxxxxxx"
                  value={settings.whatsappPhone}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm font-mono outline-none text-[#33261f] focus:border-[#8c5f4a]"
                />
                <p className="text-[10px] text-[#78695e] mt-1 flex items-center justify-between">
                  <span>Başında 90 olacak şekilde (Örn: 905321234567)</span>
                  {settings.whatsappPhone && (
                    <a
                      href={`https://wa.me/${cleanPhoneForWhatsApp(settings.whatsappPhone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8c5f4a] font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      Test Et <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </p>
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
                  className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#33261f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Kargo Ücreti (₺)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.shippingFee}
                  onChange={(e) =>
                    setSettings({ ...settings, shippingFee: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#33261f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Ücretsiz Kargo Limiti (₺)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.freeShippingThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#33261f]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                  Mağaza Adresi (Gel-Al için)
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#33261f]"
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
                  className="w-full px-3 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm outline-none text-[#33261f]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#3e312b] hover:bg-[#2b221d] text-[#f7f4ee] cursor-pointer shadow-xs transition"
            >
              Ayarları Kaydet
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
