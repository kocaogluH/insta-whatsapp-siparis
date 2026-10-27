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
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
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
  description: string | null;
  whatsappPhone: string;
  instagramHandle: string;
  shippingFee: number;
  freeShippingThreshold: number;
  address: string | null;
  allowStorePickup: boolean;
  ibanInfo: string | null;
  products: Product[];
  orders: Order[];
}

const STATUS_META: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  NEW: {
    label: 'Yeni Sipariş',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
  },
  PREPARING: {
    label: 'Hazırlanıyor',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Package,
  },
  SHIPPED: {
    label: 'Kargoda / Yolda',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Tamamlandı',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'İptal Edildi',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: XCircle,
  },
};

const SAMPLE_IMAGES = [
  {
    label: 'Keten Gömlek',
    url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Deri Çanta',
    url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Elbise / Triko',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Spor Ayakkabı',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  },
];

export default function SellerPanelPage() {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'pos' | 'settings'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedBio, setCopiedBio] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // New Product Modal / Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Üst Giyim');
  const [newProdPrice, setNewProdPrice] = useState('599.90');
  const [newProdComparePrice, setNewProdComparePrice] = useState('750.00');
  const [newProdImage, setNewProdImage] = useState(SAMPLE_IMAGES[2].url);
  const [newProdSku, setNewProdSku] = useState('URN-105');
  const [newProdBarcode, setNewProdBarcode] = useState('8690001005012');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdHideOOS, setNewProdHideOOS] = useState(true);
  const [newProdIgUrl, setNewProdIgUrl] = useState('');
  const [newProdVariants, setNewProdVariants] = useState<
    { name: string; sku: string; barcode: string; stock: number }[]
  >([
    { name: 'S Beden', sku: 'URN-105-S', barcode: '8690001005029', stock: 5 },
    { name: 'M Beden', sku: 'URN-105-M', barcode: '8690001005036', stock: 5 },
  ]);

  // Barcode / POS state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posHistory, setPosHistory] = useState<
    { time: string; title: string; code: string; remaining: number }[]
  >([]);

  // Store Settings state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    whatsappPhone: '',
    instagramHandle: '',
    shippingFee: 0,
    freeShippingThreshold: 0,
    address: '',
    allowStorePickup: true,
    ibanInfo: '',
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStoreData = useCallback(async () => {
    try {
      const res = await fetch('/api/store/butikmoda', { cache: 'no-store' });
      if (res.ok) {
        const data: StoreData = await res.json();
        setStore(data);
        setSettingsForm({
          name: data.name,
          description: data.description || '',
          whatsappPhone: data.whatsappPhone,
          instagramHandle: data.instagramHandle,
          shippingFee: data.shippingFee,
          freeShippingThreshold: data.freeShippingThreshold,
          address: data.address || '',
          allowStorePickup: data.allowStorePickup,
          ibanInfo: data.ibanInfo || '',
        });
      }
    } catch (e) {
      console.error('Error loading store panel:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      showToast(`Sipariş durumu "${STATUS_META[newStatus]?.label || newStatus}" olarak güncellendi.`);
      fetchStoreData();
    }
  };

  const handleVariantStockChange = async (
    productId: string,
    variantId: string,
    newStock: number
  ) => {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId, variantStock: Math.max(0, newStock) }),
    });
    if (res.ok) {
      fetchStoreData();
    }
  };

  const handleProductStockChange = async (productId: string, newStock: number) => {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: Math.max(0, newStock) }),
    });
    if (res.ok) {
      fetchStoreData();
    }
  };

  const handleToggleProductField = async (
    productId: string,
    field: 'isActive' | 'hideWhenOutOfStock',
    value: boolean
  ) => {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      showToast('Ürün ayarı güncellendi.');
      fetchStoreData();
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast('Ürün silindi.');
      fetchStoreData();
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    const validVariants = newProdVariants.filter((v) => v.name.trim() !== '');
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: store.id,
        name: newProdName,
        description: newProdDesc,
        category: newProdCategory,
        price: Number(newProdPrice),
        compareAtPrice: newProdComparePrice ? Number(newProdComparePrice) : null,
        imageUrl: newProdImage,
        sku: newProdSku,
        barcode: newProdBarcode,
        stock: Number(newProdStock),
        hideWhenOutOfStock: newProdHideOOS,
        instagramPostUrl: newProdIgUrl,
        variants: validVariants,
      }),
    });

    if (res.ok) {
      setShowAddProduct(false);
      setNewProdName('');
      setNewProdDesc('');
      showToast('Yeni ürün vitrine eklendi!');
      fetchStoreData();
    }
  };

  const handleBarcodeQuickDeduct = async (codeToProcess?: string) => {
    if (!store) return;
    const query = (codeToProcess ?? barcodeInput).trim().toLowerCase();
    if (!query) return;

    for (const product of store.products) {
      for (const variant of product.variants) {
        if (
          variant.barcode?.toLowerCase() === query ||
          variant.sku?.toLowerCase() === query
        ) {
          const nextStock = Math.max(0, variant.stock - 1);
          await handleVariantStockChange(product.id, variant.id, nextStock);
          setPosHistory((prev) => [
            {
              time: new Date().toLocaleTimeString('tr-TR'),
              title: `${product.name} (${variant.name})`,
              code: variant.barcode || variant.sku || query,
              remaining: nextStock,
            },
            ...prev,
          ]);
          setBarcodeInput('');
          showToast(
            `Fiziksel Mağaza Satışı: ${product.name} (${variant.name}) stoğu 1 düşüldü. Kalan: ${nextStock}`
          );
          return;
        }
      }

      if (
        product.barcode?.toLowerCase() === query ||
        product.sku?.toLowerCase() === query
      ) {
        const nextStock = Math.max(0, product.stock - 1);
        await handleProductStockChange(product.id, nextStock);
        setPosHistory((prev) => [
          {
            time: new Date().toLocaleTimeString('tr-TR'),
            title: product.name,
            code: product.barcode || product.sku || query,
            remaining: nextStock,
          },
          ...prev,
        ]);
        setBarcodeInput('');
        showToast(
          `Fiziksel Mağaza Satışı: ${product.name} stoğu 1 düşüldü. Kalan: ${nextStock}`
        );
        return;
      }
    }

    showToast('Bu barkod veya stok koduna (SKU) ait ürün/varyant bulunamadı.');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const res = await fetch(`/api/store/${store.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    if (res.ok) {
      showToast('Mağaza ayarları ve Instagram Bio bilgileri kaydedildi!');
      fetchStoreData();
    }
  };

  if (loading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <RefreshCw className="w-8 h-8 text-slate-700 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Satıcı Paneli Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const totalRevenue = store.orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const newOrdersCount = store.orders.filter((o) => o.status === 'NEW').length;
  const lowStockCount = store.products.filter((p) => p.stock <= 3).length;

  const filteredOrders = store.orders.filter((o) =>
    statusFilter === 'ALL' ? true : o.status === statusFilter
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              IS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base">{store.name}</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  Satıcı Paneli
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Instagram Bio Linki:{' '}
                <strong className="text-slate-700 font-mono">site.com/{store.slug}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/${store.slug}`;
                navigator.clipboard.writeText(url);
                setCopiedBio(true);
                setTimeout(() => setCopiedBio(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedBio ? 'Bio Linki Kopyalandı ✓' : 'Bio Linkini Kopyala'}
            </button>

            <Link
              href={`/${store.slug}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mağaza Vitrinini Gör
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'orders'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Siparişler ({store.orders.length})
            {newOrdersCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {newOrdersCount} Yeni
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'products'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Ürünler & Varyantlar ({store.products.length})
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'pos'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Barcode className="w-4 h-4" />
            Fiziksel Dükkan / Barkod Stok Düşümü
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Mağaza & WhatsApp/IG Ayarları
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Bekleyen Yeni Sipariş</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{newOrdersCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              WhatsApp & IG DM Senkronize
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Toplam Sipariş Tutarı</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Toplam {store.orders.length} sipariş
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Aktif Ürün & Varyant</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {store.products.length} Ürün
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Toplam{' '}
              {store.products.reduce((acc, p) => acc + p.variants.length, 0)} alt varyant
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Kritik Stok (&le;3 Adet)</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{lowStockCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Fiziksel + Online ortak stok
            </p>
          </div>
        </div>

        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Tümü' },
                  { id: 'NEW', label: 'Yeni' },
                  { id: 'PREPARING', label: 'Hazırlanıyor' },
                  { id: 'SHIPPED', label: 'Kargoda' },
                  { id: 'COMPLETED', label: 'Tamamlandı' },
                  { id: 'CANCELLED', label: 'İptal' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchStoreData}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Listeyi Yenile
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Bu filtrede sipariş bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const st = STATUS_META[order.status] || STATUS_META.NEW;
                  const StatusIcon = st.icon;
                  const customerNotifyUrl = buildCustomerStatusWhatsAppUrl(
                    order.customerPhone,
                    order.customerName,
                    order.orderNumber,
                    store.name,
                    order.status,
                    order.totalAmount
                  );

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-base text-slate-900">
                              #{order.orderNumber}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${st.badgeClass}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {st.label}
                            </span>
                            {order.channel === 'WHATSAPP' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full">
                                <MessageCircle className="w-3.5 h-3.5" />
                                WhatsApp Siparişi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-pink-50 text-pink-700 px-2.5 py-0.5 rounded-full">
                                <Instagram className="w-3.5 h-3.5" />
                                Instagram DM Siparişi
                              </span>
                            )}
                            <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                              {order.deliveryType === 'STORE_PICKUP'
                                ? '🏪 Mağazadan Gel-Al'
                                : '🚚 Adrese Kargo'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleString('tr-TR')} • Ödeme:{' '}
                            <strong className="text-slate-600">{order.paymentMethod}</strong>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-400">Toplam Tutar</p>
                          <p className="text-lg font-extrabold text-slate-900">
                            {formatCurrency(order.totalAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Customer & Items Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-1.5">
                          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                            Müşteri & Teslimat Bilgisi
                          </p>
                          <p>
                            <strong>Alıcı:</strong> {order.customerName}
                          </p>
                          <p>
                            <strong>Telefon:</strong> {order.customerPhone}
                          </p>
                          <p>
                            <strong>Adres:</strong> {order.customerAddress}
                          </p>
                          {order.note && (
                            <p className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                              <strong>Not:</strong> {order.note}
                            </p>
                          )}
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-2">
                          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                            Sipariş Kalemleri ({order.items.length})
                          </p>
                          <div className="space-y-1.5">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-1.5 last:border-0 last:pb-0"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">
                                    {item.quantity}x {item.productName}
                                  </span>
                                  {item.variantName && (
                                    <span className="text-slate-600"> ({item.variantName})</span>
                                  )}
                                  {(item.sku || item.barcode) && (
                                    <div className="text-[10px] font-mono text-slate-400">
                                      {item.sku && `SKU: ${item.sku} `}
                                      {item.barcode && `| Barkod: ${item.barcode}`}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-slate-800">
                                  {formatCurrency(item.unitPrice * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Order Actions Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-500 mr-1">
                            Durumu Değiştir:
                          </span>
                          {(['NEW', 'PREPARING', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const).map(
                            (stKey) => (
                              <button
                                key={stKey}
                                onClick={() => handleUpdateOrderStatus(order.id, stKey)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                  order.status === stKey
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {STATUS_META[stKey].label}
                              </button>
                            )
                          )}
                        </div>

                        <a
                          href={customerNotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Müşteriye WhatsApp&apos;tan Durum Bildir
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTS & VARIANTS */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Ürün Katalog & Varyant/Barkod Yönetimi
                </h2>
                <p className="text-xs text-slate-500">
                  Hem online vitrin hem fiziksel dükkan stoklarınızı tek yerden yönetin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {showAddProduct ? 'Formu Kapat' : 'Yeni Ürün Ekle'}
              </button>
            </div>

            {/* Add New Product Form */}
            {showAddProduct && (
              <form
                onSubmit={handleCreateProduct}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
              >
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                  Yeni Ürün ve Varyant Tanımla
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ürün Adı *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="Örn: İpek Karışımlı Kruvaze Bluz"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                      placeholder="Üst Giyim, Elbise, Çanta..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Satış Fiyatı (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      İndirim Öncesi Fiyat (Opsiyonel)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProdComparePrice}
                      onChange={(e) => setNewProdComparePrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ana Stok Kodu (SKU) / Barkod
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newProdSku}
                        onChange={(e) => setNewProdSku(e.target.value)}
                        placeholder="SKU"
                        className="w-1/2 px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                      <input
                        type="text"
                        value={newProdBarcode}
                        onChange={(e) => setNewProdBarcode(e.target.value)}
                        placeholder="Barkod"
                        className="w-1/2 px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ürün Görsel URL
                    </label>
                    <input
                      type="url"
                      value={newProdImage}
                      onChange={(e) => setNewProdImage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {SAMPLE_IMAGES.map((img) => (
                        <button
                          key={img.label}
                          type="button"
                          onClick={() => setNewProdImage(img.url)}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          Örnek: {img.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Instagram Gönderi / Reels Linki (Opsiyonel)
                    </label>
                    <input
                      type="url"
                      value={newProdIgUrl}
                      onChange={(e) => setNewProdIgUrl(e.target.value)}
                      placeholder="https://instagram.com/p/..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                    <label className="inline-flex items-center gap-2 mt-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProdHideOOS}
                        onChange={(e) => setNewProdHideOOS(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Stokta kalmadığında vitrinde otomatik gizle
                    </label>
                  </div>
                </div>

                {/* Variants Builder */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Beden / Renk Varyantları & Barkodları
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewProdVariants([
                          ...newProdVariants,
                          {
                            name: '',
                            sku: `${newProdSku}-V${newProdVariants.length + 1}`,
                            barcode: `86900010050${40 + newProdVariants.length}`,
                            stock: 5,
                          },
                        ])
                      }
                      className="text-xs font-semibold text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Varyant Satırı Ekle
                    </button>
                  </div>

                  {newProdVariants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Varyant Adı (Örn: M / Siyah)"
                        value={v.name}
                        onChange={(e) => {
                          const copy = [...newProdVariants];
                          copy[idx].name = e.target.value;
                          setNewProdVariants(copy);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Varyant SKU"
                        value={v.sku}
                        onChange={(e) => {
                          const copy = [...newProdVariants];
                          copy[idx].sku = e.target.value;
                          setNewProdVariants(copy);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Varyant Barkodu"
                        value={v.barcode}
                        onChange={(e) => {
                          const copy = [...newProdVariants];
                          copy[idx].barcode = e.target.value;
                          setNewProdVariants(copy);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Stok"
                          value={v.stock}
                          onChange={(e) => {
                            const copy = [...newProdVariants];
                            copy[idx].stock = Number(e.target.value);
                            setNewProdVariants(copy);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewProdVariants(newProdVariants.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    Ürünü Kaydet ve Yayınla
                  </button>
                </div>
              </form>
            )}

            {/* Existing Products List */}
            <div className="space-y-4">
              {store.products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row gap-4 justify-between"
                >
                  <div className="flex gap-4">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-20 h-24 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {prod.name}
                        </h3>
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {formatCurrency(prod.price)}
                        </span>
                        {!prod.isActive && (
                          <span className="text-[11px] bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded-full">
                            Pasif (Gizli)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 font-mono">
                        Ana SKU: {prod.sku || '-'} | Barkod: {prod.barcode || '-'} | Toplam Stok:{' '}
                        <strong className={prod.stock <= 3 ? 'text-rose-600' : 'text-slate-900'}>
                          {prod.stock} adet
                        </strong>
                      </p>

                      {/* Variant Stock Quick Controls */}
                      {prod.variants.length > 0 ? (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {prod.variants.map((v) => (
                            <div
                              key={v.id}
                              className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">{v.name}</span>
                                {v.barcode && (
                                  <span className="block text-[10px] font-mono text-slate-400">
                                    {v.barcode}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVariantStockChange(prod.id, v.id, v.stock - 1)
                                  }
                                  className="p-0.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span
                                  className={`font-bold w-5 text-center ${
                                    v.stock === 0 ? 'text-rose-600' : 'text-slate-900'
                                  }`}
                                >
                                  {v.stock}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVariantStockChange(prod.id, v.id, v.stock + 1)
                                  }
                                  className="p-0.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-600">Stok Adedi:</span>
                          <button
                            type="button"
                            onClick={() => handleProductStockChange(prod.id, prod.stock - 1)}
                            className="p-1 bg-slate-100 rounded-lg"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold">{prod.stock}</span>
                          <button
                            type="button"
                            onClick={() => handleProductStockChange(prod.id, prod.stock + 1)}
                            className="p-1 bg-slate-100 rounded-lg"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex md:flex-col items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleProductField(prod.id, 'isActive', !prod.isActive)
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        {prod.isActive ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" /> Vitrinde Açık
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" /> Gizli
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
                        title="Ürünü Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prod.hideWhenOutOfStock}
                        onChange={(e) =>
                          handleToggleProductField(
                            prod.id,
                            'hideWhenOutOfStock',
                            e.target.checked
                          )
                        }
                        className="rounded border-slate-300"
                      />
                      Stok bitince gizle
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HYBRID PHYSICAL STORE BARCODE / POS STOCK DEDUCTION */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Barcode className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Fiziksel Mağaza Hızlı Barkod / SKU Stok Düşümü
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dükkanda kasada satılan ürünün barkodunu okutun veya aşağıdan seçin. Stok anında
                    düşer, Instagram müşterisi tükenen ürünü sipariş edemez.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBarcodeQuickDeduct();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Barkod okutun veya SKU yazın (Örn: 8690001001021 veya KTN-GML-001-S-EKR)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:border-slate-900 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shrink-0 cursor-pointer"
                >
                  Dükkanda Satıldı (-1 Stok)
                </button>
              </form>

              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tek Tıkla Test Etmek İçin Kayıtlı Varyant Barkodları:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {store.products.flatMap((p) =>
                    p.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {p.name} — {v.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500">
                            Barkod: {v.barcode || '-'} | SKU: {v.sku || '-'}
                          </p>
                          <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                            Mevcut Stok: {v.stock} adet
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={v.stock <= 0}
                          onClick={() =>
                            handleBarcodeQuickDeduct(v.barcode || v.sku || '')
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          -1 Satış Yap
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* POS Recent Log */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">
                Son Fiziksel Kasa Hareketleri
              </h3>
              {posHistory.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Henüz bu oturumda barkodla hızlı stok düşümü yapılmadı.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {posHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1"
                    >
                      <div className="flex justify-between text-emerald-900 font-bold">
                        <span>{item.title}</span>
                        <span>-1 Adet</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-emerald-700 font-mono">
                        <span>Kod: {item.code}</span>
                        <span>Kalan Stok: {item.remaining}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{item.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-3xl space-y-5"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Mağaza, WhatsApp & Instagram DM Ayarları
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bu bilgiler vitrin başlığında ve müşterinin gönderdiği sipariş mesajlarında yer alır.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mağaza Adı
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.name}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Sipariş Numarası (905XXXXXXXXX)
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.whatsappPhone}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsappPhone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instagram Kullanıcı Adı (ig.me/m/kullaniciadi için)
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.instagramHandle}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, instagramHandle: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sabit Kargo Ücreti (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.shippingFee}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      shippingFee: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ücretsiz Kargo Alt Limiti (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.freeShippingThreshold}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Havale / EFT için IBAN Bilgisi
                </label>
                <input
                  type="text"
                  value={settingsForm.ibanInfo}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, ibanInfo: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mağaza Bio Açıklaması
                </label>
                <input
                  type="text"
                  value={settingsForm.description}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fiziksel Dükkan Adresi (Mağazadan Gel-Al için)
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, address: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <label className="inline-flex items-center gap-2 mt-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.allowStorePickup}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        allowStorePickup: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300"
                  />
                  Müşterilere &quot;Fiziksel Mağazadan Gel-Al (Ücretsiz Teslimat)&quot; seçeneği sun
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
            >
              Ayarları Kaydet
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
