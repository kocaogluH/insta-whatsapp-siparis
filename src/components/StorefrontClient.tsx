'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  MessageCircle,
  Instagram,
  MapPin,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Store as StoreIcon,
  Truck,
  Sparkles,
  X,
  Settings,
  Barcode,
} from 'lucide-react';
import {
  formatCurrency,
  cleanPhoneForWhatsApp,
  buildOrderMessage,
  buildProductQuestionWhatsAppUrl,
} from '@/lib/format';

export interface VariantType {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceDiff: number;
  stock: number;
}

export interface ProductType {
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
  variants: VariantType[];
}

export interface StoreType {
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
  products: ProductType[];
}

interface CartItem {
  cartItemId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku?: string | null;
  barcode?: string | null;
  unitPrice: number;
  quantity: number;
  maxStock: number;
  imageUrl: string;
}

export default function StorefrontClient({ store }: { store: StoreType }) {
  const storageKey = `insta_cart_${store.slug}`;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'SHIPPING' | 'STORE_PICKUP'>('SHIPPING');
  const [paymentMethod, setPaymentMethod] = useState<
    'IBAN_TRANSFER' | 'CASH_ON_DELIVERY' | 'PAY_AT_STORE'
  >('IBAN_TRANSFER');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Completed Order Modal State (for IG DM copy & WhatsApp confirmation)
  const [completedOrderModal, setCompletedOrderModal] = useState<{
    orderNumber: string;
    channel: 'WHATSAPP' | 'INSTAGRAM_DM';
    messageText: string;
    targetUrl: string;
    copied: boolean;
  } | null>(null);

  // Initialize default selected variants and load cart from localStorage
  useEffect(() => {
    const initialVars: Record<string, string> = {};
    store.products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        const firstInStock = p.variants.find((v) => v.stock > 0) || p.variants[0];
        initialVars[p.id] = firstInStock.id;
      }
    });
    setSelectedVariants(initialVars);

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to read cart from localStorage', e);
    }
  }, [store.products, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart, storageKey]);

  const categories = useMemo(() => {
    const set = new Set<string>(['Tümü']);
    store.products.forEach((p) => {
      if (p.isActive) set.add(p.category || 'Genel');
    });
    return Array.from(set);
  }, [store.products]);

  const visibleProducts = useMemo(() => {
    return store.products.filter((p) => {
      if (!p.isActive) return false;
      if (p.hideWhenOutOfStock && p.stock <= 0) return false;
      if (selectedCategory !== 'Tümü' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);
        const matchIg = p.instagramPostUrl?.toLowerCase().includes(q);
        return matchName || matchSku || matchBarcode || matchIg;
      }
      return true;
    });
  }, [store.products, selectedCategory, searchQuery]);

  const addToCart = (product: ProductType) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const chosenVariantId = selectedVariants[product.id];
    const variant = hasVariants
      ? product.variants.find((v) => v.id === chosenVariantId) || product.variants[0]
      : undefined;

    const availableStock = variant ? variant.stock : product.stock;
    if (availableStock <= 0) return;

    const cartItemId = variant ? `${product.id}_${variant.id}` : product.id;
    const unitPrice = product.price + (variant ? variant.priceDiff : 0);

    setCart((prev) => {
      const existing = prev.find((i) => i.cartItemId === cartItemId);
      if (existing) {
        if (existing.quantity >= availableStock) return prev;
        return prev.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          productId: product.id,
          variantId: variant?.id,
          productName: product.name,
          variantName: variant?.name,
          sku: variant?.sku || product.sku,
          barcode: variant?.barcode || product.barcode,
          unitPrice,
          quantity: 1,
          maxStock: availableStock,
          imageUrl: product.imageUrl,
        },
      ];
    });

    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1200);
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId !== cartItemId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.maxStock) return item;
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const shippingCost = useMemo(() => {
    if (cart.length === 0) return 0;
    if (deliveryType === 'STORE_PICKUP') return 0;
    if (store.freeShippingThreshold > 0 && subtotal >= store.freeShippingThreshold) {
      return 0;
    }
    return store.shippingFee;
  }, [cart.length, deliveryType, subtotal, store.freeShippingThreshold, store.shippingFee]);

  const totalAmount = subtotal + shippingCost;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteOrder = async (channel: 'WHATSAPP' | 'INSTAGRAM_DM') => {
    setFormError(null);
    if (cart.length === 0) {
      setFormError('Sepetiniz boş.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Lütfen Ad Soyad ve Telefon bilgilerinizi girin.');
      return;
    }
    if (deliveryType === 'SHIPPING' && !customerAddress.trim()) {
      setFormError('Kargo teslimatı için açık adresinizi girin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress:
            deliveryType === 'STORE_PICKUP'
              ? `Mağazadan Gel-Al (${store.address || store.name})`
              : customerAddress.trim(),
          deliveryType,
          paymentMethod,
          channel,
          subtotal,
          shippingCost,
          totalAmount,
          note: note.trim(),
          items: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            productName: i.productName,
            variantName: i.variantName,
            sku: i.sku,
            barcode: i.barcode,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Sipariş kaydedilemedi');
      }

      const savedOrder = await res.json();

      const messageText = buildOrderMessage({
        orderNumber: savedOrder.orderNumber,
        storeName: store.name,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress:
          deliveryType === 'STORE_PICKUP'
            ? `Mağazadan Gel-Al (${store.address || store.name})`
            : customerAddress.trim(),
        deliveryType,
        paymentMethod,
        items: cart,
        subtotal,
        shippingCost,
        totalAmount,
        note: note.trim(),
        ibanInfo: store.ibanInfo,
      });

      let targetUrl = '';
      let copied = false;

      if (channel === 'WHATSAPP') {
        const cleanPhone = cleanPhoneForWhatsApp(store.whatsappPhone);
        targetUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        const cleanIg = store.instagramHandle.replace(/^@/, '').trim();
        targetUrl = `https://ig.me/m/${cleanIg}`;
        try {
          await navigator.clipboard.writeText(messageText);
          copied = true;
        } catch {
          copied = false;
        }
      }

      setCart([]);
      setIsCartOpen(false);
      setCompletedOrderModal({
        orderNumber: savedOrder.orderNumber,
        channel,
        messageText,
        targetUrl,
        copied,
      });
    } catch (err) {
      console.error(err);
      setFormError('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Top Demo Bar for easy switching between Storefront & Seller Panel */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Canlı Mağaza Vitrini: <strong className="text-white">/{store.slug}</strong> (Instagram Bio Linki)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/panel"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-md font-medium transition"
            >
              <Settings className="w-3.5 h-3.5" />
              Satıcı Paneli & Barkod Stok
            </Link>
          </div>
        </div>
      </div>

      {/* Store Bio Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shrink-0">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-bold text-xl text-rose-600">
                  {store.name.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {store.name}
                </h1>
                {store.description && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5 line-clamp-2 max-w-xl">
                    {store.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <a
                    href={`https://instagram.com/${store.instagramHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-pink-600 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-full font-medium transition"
                  >
                    <Instagram className="w-3.5 h-3.5" />@{store.instagramHandle}
                  </a>
                  {store.allowStorePickup && store.address && (
                    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      Mağazadan Gel-Al Aktif
                    </span>
                  )}
                  {store.freeShippingThreshold > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                      <Truck className="w-3.5 h-3.5" />
                      {formatCurrency(store.freeShippingThreshold)} Üzeri Kargo Bedava
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl font-medium text-sm shadow-xs transition shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Sepetim</span>
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItemsCount}
              </span>
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ürün adı, stok kodu (SKU) veya IG post linki ile ara..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-xl text-sm outline-none transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Product Grid */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {visibleProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-slate-800">Ürün Bulunamadı</h2>
            <p className="text-sm text-slate-500 mt-1">
              Arama kriterlerinize uygun veya stokta olan ürün bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleProducts.map((product) => {
              const hasVariants = product.variants && product.variants.length > 0;
              const chosenVarId = selectedVariants[product.id];
              const currentVariant = hasVariants
                ? product.variants.find((v) => v.id === chosenVarId) || product.variants[0]
                : undefined;

              const effectivePrice =
                product.price + (currentVariant ? currentVariant.priceDiff : 0);
              const availableStock = currentVariant ? currentVariant.stock : product.stock;
              const isOutOfStock = availableStock <= 0;
              const effectiveSku = currentVariant?.sku || product.sku;

              const whatsappAskUrl = buildProductQuestionWhatsAppUrl(
                store.whatsappPhone,
                product.name,
                effectivePrice,
                effectiveSku,
                currentVariant?.name
              );

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                        {product.category}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > effectivePrice && (
                        <span className="bg-rose-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          İndirim
                        </span>
                      )}
                    </div>

                    {product.instagramPostUrl && (
                      <a
                        href={product.instagramPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Instagram paylaşımını gör"
                        className="absolute top-2.5 right-2.5 bg-white/90 hover:bg-white text-pink-600 text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-xs transition"
                      >
                        <Instagram className="w-3 h-3" />
                        Reels / Post
                      </a>
                    )}

                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-white text-slate-900 font-bold text-xs px-3 py-1.5 rounded-full shadow-sm">
                          Stokta Kalmadı
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {product.name}
                        </h3>
                      </div>

                      {effectiveSku && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Kod: {effectiveSku}
                        </p>
                      )}

                      {product.description && (
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* Price */}
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-slate-900">
                          {formatCurrency(effectivePrice)}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > effectivePrice && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] font-medium text-slate-500">
                          {availableStock > 0 ? `Stok: ${availableStock} adet` : 'Tükendi'}
                        </span>
                      </div>

                      {/* Variants Selector */}
                      {hasVariants && (
                        <div className="mt-3">
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Seçenek / Beden:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {product.variants.map((v) => {
                              const isSelected = currentVariant?.id === v.id;
                              const noStock = v.stock <= 0;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedVariants((prev) => ({
                                      ...prev,
                                      [product.id]: v.id,
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                                    isSelected
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : noStock
                                      ? 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                  }`}
                                >
                                  {v.name} {v.stock > 0 ? `(${v.stock})` : '(Tükendi)'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(product)}
                        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                          justAddedId === product.id
                            ? 'bg-emerald-600 text-white'
                            : isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {justAddedId === product.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Sepete Eklendi!
                          </>
                        ) : isOutOfStock ? (
                          'Bu Seçenek Tükendi'
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" />
                            Sepete Ekle
                          </>
                        )}
                      </button>

                      {/* Direct "WhatsApp'tan Sor" button */}
                      <a
                        href={whatsappAskUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-3 rounded-xl font-medium text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center gap-1.5 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Bu Ürünü WhatsApp&apos;tan Sor
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Mobile Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 text-white font-bold text-xs w-7 h-7 rounded-full flex items-center justify-center">
                {totalItemsCount}
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-300">Sepet Özeti</p>
                <p className="text-sm font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            <span className="bg-white text-slate-900 px-3.5 py-2 rounded-xl text-xs font-bold">
              Siparişi Tamamla →
            </span>
          </button>
        </div>
      )}

      {/* Slide-Over Cart & Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-slate-800" />
                <h2 className="font-bold text-slate-900 text-base">
                  Sepetim & Sipariş Gönderimi ({totalItemsCount})
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Progress */}
            {store.freeShippingThreshold > 0 && deliveryType === 'SHIPPING' && cart.length > 0 && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 text-xs text-emerald-800">
                {subtotal >= store.freeShippingThreshold ? (
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Tebrikler! Sepetiniz ücretsiz kargo limitini geçti.
                  </p>
                ) : (
                  <div>
                    <p>
                      Ücretsiz kargo için{' '}
                      <strong>
                        {formatCurrency(store.freeShippingThreshold - subtotal)}
                      </strong>{' '}
                      daha ürün ekleyebilirsiniz.
                    </p>
                    <div className="w-full h-1.5 bg-emerald-200 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (subtotal / store.freeShippingThreshold) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-semibold">Sepetiniz şu an boş</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Katalogdan beğendiğiniz ürünleri sepete ekleyerek WhatsApp veya Instagram DM
                    üzerinden sipariş verebilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.cartItemId}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-16 h-16 rounded-lg object-cover bg-slate-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-slate-900 truncate">
                            {item.productName}
                          </h4>
                          {item.variantName && (
                            <p className="text-xs text-slate-600 font-medium">
                              Seçenek: {item.variantName}
                            </p>
                          )}
                          {item.sku && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              Kod: {item.sku}
                            </p>
                          )}
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.cartItemId, -1)}
                            className="p-1 text-slate-600 hover:text-rose-600 cursor-pointer"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="text-xs font-bold w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.cartItemId, 1)}
                            className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery & Customer Form */}
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <h3 className="font-bold text-sm text-slate-900">
                      1. Teslimat Yöntemi (Online veya Fiziksel Mağaza)
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryType('SHIPPING');
                          if (paymentMethod === 'PAY_AT_STORE') {
                            setPaymentMethod('IBAN_TRANSFER');
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          deliveryType === 'SHIPPING'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-xs">
                          <Truck className="w-4 h-4" />
                          Adrese Kargo
                        </div>
                        <p className="text-[11px] opacity-80 mt-1">
                          {shippingCost === 0
                            ? 'Ücretsiz Kargo'
                            : `+${formatCurrency(store.shippingFee)} Kargo`}
                        </p>
                      </button>

                      {store.allowStorePickup && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeliveryType('STORE_PICKUP');
                            setPaymentMethod('PAY_AT_STORE');
                          }}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            deliveryType === 'STORE_PICKUP'
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold text-xs">
                            <StoreIcon className="w-4 h-4" />
                            Mağazadan Gel-Al
                          </div>
                          <p className="text-[11px] opacity-80 mt-1">
                            Dükkandan Ücretsiz Teslim
                          </p>
                        </button>
                      )}
                    </div>

                    {deliveryType === 'STORE_PICKUP' && store.address && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Mağaza Adresi:</strong> {store.address}
                        </div>
                      </div>
                    )}

                    <h3 className="font-bold text-sm text-slate-900 pt-2">
                      2. Alıcı & İletişim Bilgileri
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Ad Soyad *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Örn: Ayşe Yılmaz"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-slate-900 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Telefon Numarası (WhatsApp) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="05XX XXX XX XX"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-slate-900 outline-none"
                        />
                      </div>

                      {deliveryType === 'SHIPPING' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Açık Teslimat Adresi *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder="Mahalle, sokak, bina no, ilçe / il"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-slate-900 outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Ödeme Tercihi
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value as
                                | 'IBAN_TRANSFER'
                                | 'CASH_ON_DELIVERY'
                                | 'PAY_AT_STORE'
                            )
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:border-slate-900 outline-none"
                        >
                          <option value="IBAN_TRANSFER">Havale / EFT (IBAN ile Ödeme)</option>
                          <option value="CASH_ON_DELIVERY">Kapıda Nakit / Kart ile Ödeme</option>
                          {store.allowStorePickup && (
                            <option value="PAY_AT_STORE">
                              Fiziksel Mağazada Ödeme (Gel-Al)
                            </option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Sipariş Notu (Opsiyonel)
                        </label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Hediye paketi, teslimat saati vb."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    {/* Price Summary Box */}
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Ara Toplam</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kargo Ücreti</span>
                        <span>
                          {shippingCost === 0 ? (
                            <strong className="text-emerald-600">Ücretsiz</strong>
                          ) : (
                            formatCurrency(shippingCost)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-extrabold text-slate-900 text-base pt-1.5 border-t border-slate-200">
                        <span>Genel Toplam</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>

                    {formError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-medium">
                        {formError}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer: Dual Channel Submit Buttons */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-white space-y-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCompleteOrder('WHATSAPP')}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp ile Siparişi Gönder
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCompleteOrder('INSTAGRAM_DM')}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:opacity-95 text-white flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Instagram className="w-4 h-4" />
                  Siparişi Kopyala & Instagram DM Aç
                </button>
                <p className="text-[11px] text-center text-slate-400">
                  Siparişiniz aynı anda mağaza paneline kaydedilir ve stoktan düşülür.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed Order Confirmation & Copy-Paste Helper Modal */}
      {completedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Sipariş Kaydedildi ({completedOrderModal.orderNumber})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Stok ayrıldı ve satıcı paneline düştü.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompletedOrderModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {completedOrderModal.channel === 'INSTAGRAM_DM' ? (
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3.5 text-xs text-pink-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-pink-700">
                  <Instagram className="w-4 h-4" />
                  Instagram DM Adımı (Otomatik Kopyalandı!)
                </p>
                <p>
                  Instagram hazır metinle DM açmaya izin vermediği için sipariş özetiniz{' '}
                  <strong>panonuza kopyalandı</strong>. Aşağıdaki butonla mağaza DM ekranını açıp{' '}
                  <strong>Yapıştır (Paste)</strong> diyerek gönderebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900">
                Hazır sipariş mesajınızla WhatsApp penceresi açıldı. Eğer açılmadıysa aşağıdaki
                butona tıklayabilirsiniz.
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Hazırlanan Sipariş Mesajı:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(completedOrderModal.messageText);
                    setCompletedOrderModal({ ...completedOrderModal, copied: true });
                  }}
                  className="inline-flex items-center gap-1 text-slate-800 font-semibold hover:underline cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {completedOrderModal.copied ? 'Kopyalandı ✓' : 'Metni Kopyala'}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {completedOrderModal.messageText}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href={completedOrderModal.targetUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 ${
                  completedOrderModal.channel === 'WHATSAPP'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                {completedOrderModal.channel === 'WHATSAPP'
                  ? "WhatsApp'ı Aç ve Gönder"
                  : 'Instagram DM Ekranını Aç (ig.me)'}
              </a>
              <button
                type="button"
                onClick={() => setCompletedOrderModal(null)}
                className="py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Vitrine Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
