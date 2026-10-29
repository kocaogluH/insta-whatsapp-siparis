'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  MessageCircle,
  Instagram,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Store as StoreIcon,
  Truck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  cleanPhoneForWhatsApp,
  buildOrderMessage,
  buildProductQuestionWhatsAppUrl,
} from '@/lib/format';

export interface StoryType {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

export interface VariantType {
  id: string;
  name: string;
  priceDiff: number;
  inStock: boolean;
  lowStock: boolean;
}

export interface ProductType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string;
  category: string;
  isActive: boolean;
  hideWhenOutOfStock: boolean;
  instagramPostUrl: string | null;
  inStock: boolean;
  lowStock: boolean;
  variants: VariantType[];
}

export interface StoreType {
  id?: string;
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
  ibanInfo?: string | null;
  stories: StoryType[];
  products: ProductType[];
}

interface CartItem {
  cartItemId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  maxLimit: number;
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
  const [activeStory, setActiveStory] = useState<StoryType | null>(null);

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

  // Completed Order Modal State
  const [completedOrderModal, setCompletedOrderModal] = useState<{
    orderNumber: string;
    channel: 'WHATSAPP' | 'INSTAGRAM_DM';
    messageText: string;
    targetUrl: string;
    copied: boolean;
    ibanInfo?: string | null;
  } | null>(null);

  useEffect(() => {
    const initialVars: Record<string, string> = {};
    store.products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        const firstInStock = p.variants.find((v) => v.inStock) || p.variants[0];
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
      console.error(e);
    }
  }, [store.products, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {
      console.error(e);
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
      if (p.hideWhenOutOfStock && !p.inStock) return false;
      if (selectedCategory !== 'Tümü' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ? p.description.toLowerCase().includes(q) : false)
        );
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

    const isInStock = variant ? variant.inStock : product.inStock;
    if (!isInStock) return;

    const isLow = variant ? variant.lowStock : product.lowStock;
    const maxLimit = isLow ? 3 : 10;

    const cartItemId = variant ? `${product.id}_${variant.id}` : product.id;
    const unitPrice = product.price + (variant ? variant.priceDiff : 0);

    setCart((prev) => {
      const existing = prev.find((i) => i.cartItemId === cartItemId);
      if (existing) {
        if (existing.quantity >= maxLimit) return prev;
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
          unitPrice,
          quantity: 1,
          maxLimit,
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
          if (nextQty > item.maxLimit) return item;
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
          storeSlug: store.slug,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress:
            deliveryType === 'STORE_PICKUP'
              ? `Mağazadan Gel-Al (${store.address || store.name})`
              : customerAddress.trim(),
          deliveryType,
          paymentMethod,
          channel,
          note: note.trim(),
          items: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId || null,
            quantity: i.quantity,
          })),
        }),
      });

      const orderRes = await res.json();
      if (!res.ok) throw new Error(orderRes.error || 'Sipariş kaydedilemedi');

      const savedOrder = orderRes.order || orderRes;
      const returnedIban = orderRes.ibanInfo || store.ibanInfo || null;

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
        subtotal: savedOrder.subtotal || subtotal,
        shippingCost: savedOrder.shippingCost !== undefined ? savedOrder.shippingCost : shippingCost,
        totalAmount: savedOrder.totalAmount || totalAmount,
        note: note.trim(),
        ibanInfo: returnedIban,
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
        ibanInfo: returnedIban,
      });
    } catch (err) {
      console.error(err);
      setFormError('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themePrimary = store.themeColor || '#3e312b';

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#33261f] pb-28 font-sans selection:bg-[#eae3d6] selection:text-[#33261f]">
      {/* Luxury Boutique Hero Header */}
      <div className="relative bg-white border-b border-[#e5dcce]">
        {/* Banner Cover Image */}
        <div className="h-36 sm:h-52 w-full bg-[#eae3d6] relative overflow-hidden">
          {store.bannerUrl ? (
            <img
              src={store.bannerUrl}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#dcd2c4]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Store Avatar & Profile Info */}
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 sm:-mt-16 gap-3 sm:gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 text-center sm:text-left">
              {/* Circular Boutique Logo */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-white shadow-md overflow-hidden shrink-0 relative">
                {store.logoUrl ? (
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-bold text-2xl text-white"
                    style={{ backgroundColor: themePrimary }}
                  >
                    {store.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#33261f] tracking-tight">
                    {store.name}
                  </h1>
                  <span className="bg-[#f2ece1] text-[#78695e] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#e5dcce]">
                    Resmi Mağaza ✓
                  </span>
                </div>

                {store.tagline && (
                  <p className="text-xs sm:text-sm text-[#78695e]">
                    {store.tagline}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs pt-1">
                  <a
                    href={`https://instagram.com/${store.instagramHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#8c5f4a] bg-[#f7ede5] hover:bg-[#eddcc8] px-2.5 py-1 rounded-full transition border border-[#e5dcce]"
                  >
                    <Instagram className="w-3.5 h-3.5" />@{store.instagramHandle}
                  </a>

                  {store.freeShippingThreshold > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-[#415e58] bg-[#edf2eb] px-2.5 py-1 rounded-full border border-[#d4e0d1]">
                      <Truck className="w-3.5 h-3.5" />
                      {formatCurrency(store.freeShippingThreshold)} Üzeri Kargo Bedava
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[#f7f4ee] font-semibold text-xs sm:text-sm shadow-xs transition cursor-pointer shrink-0"
              style={{ backgroundColor: themePrimary }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Sepetim</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {totalItemsCount}
              </span>
            </button>
          </div>

          {/* Instagram Stories / Highlights in Organic Earth Gradient */}
          {store.stories && store.stories.length > 0 && (
            <div className="pt-2 border-t border-[#f2ece1]">
              <div className="flex items-center gap-4 overflow-x-auto py-2 no-scrollbar">
                {store.stories.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveStory(st)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                  >
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2px] bg-gradient-to-tr from-[#ba9b81] via-[#a3b899] to-[#8c5f4a] shadow-xs group-hover:scale-105 transition">
                      <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-[#f2ece1]">
                        <img
                          src={st.imageUrl}
                          alt={st.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#4a3f39] max-w-[70px] truncate text-center">
                      {st.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Search & Category Bar */}
      <div className="bg-[#f7f4ee]/90 backdrop-blur border-b border-[#e5dcce] sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9e8e82] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün adı veya kod ile ara..."
              className="w-full pl-10 pr-4 py-2 bg-white focus:bg-white border border-[#e5dcce] focus:border-[#8c5f4a] rounded-xl text-xs sm:text-sm outline-none transition text-[#33261f]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'text-white shadow-xs'
                    : 'bg-[#f2ece1] text-[#78695e] hover:bg-[#eae3d6]'
                }`}
                style={
                  selectedCategory === cat
                    ? { backgroundColor: themePrimary }
                    : undefined
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Feed Grid */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {visibleProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e5dcce] p-12 text-center shadow-xs">
            <ShoppingBag className="w-12 h-12 text-[#cfbeab] mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#33261f]">Ürün Bulunamadı</h2>
            <p className="text-xs text-[#78695e] mt-1">
              Arama kriterlerinize uygun ürün bulunamadı.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {visibleProducts.map((product) => {
              const hasVariants = product.variants && product.variants.length > 0;
              const chosenVarId = selectedVariants[product.id];
              const currentVariant = hasVariants
                ? product.variants.find((v) => v.id === chosenVarId) || product.variants[0]
                : undefined;

              const effectivePrice =
                product.price + (currentVariant ? currentVariant.priceDiff : 0);
              const isOutOfStock = currentVariant ? !currentVariant.inStock : !product.inStock;
              const isLowStock = currentVariant ? currentVariant.lowStock : product.lowStock;

              const discountPercent =
                product.compareAtPrice && product.compareAtPrice > effectivePrice
                  ? Math.round(
                      ((product.compareAtPrice - effectivePrice) /
                        product.compareAtPrice) *
                        100
                    )
                  : null;

              const whatsappAskUrl = buildProductQuestionWhatsAppUrl(
                store.whatsappPhone,
                product.name,
                effectivePrice,
                null,
                currentVariant?.name
              );

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-[#e5dcce] overflow-hidden shadow-xs hover:border-[#ba9b81] transition flex flex-col justify-between group"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-3/4 bg-[#f2ece1] overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />

                    {discountPercent && (
                      <span className="absolute top-2.5 left-2.5 bg-[#8c5f4a] text-[#f7f4ee] font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                        %{discountPercent} İndirim
                      </span>
                    )}

                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-white text-[#33261f] font-bold text-xs px-3 py-1.5 rounded-full shadow-md">
                          Tükendi
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#9e8e82] tracking-wider">
                        {product.category}
                      </p>
                      <h3 className="font-bold text-xs sm:text-sm text-[#33261f] line-clamp-2 leading-snug mt-0.5">
                        {product.name}
                      </h3>

                      {/* Price Block */}
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-bold text-[#33261f]">
                          {formatCurrency(effectivePrice)}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > effectivePrice && (
                          <span className="text-xs text-[#9e8e82] line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                      </div>

                      {/* Variant Selector Pills */}
                      {hasVariants && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {product.variants.map((v) => {
                              const isSelected = currentVariant?.id === v.id;
                              const noStock = !v.inStock;
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
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#3e312b] border-[#3e312b] text-white'
                                      : noStock
                                      ? 'bg-[#f2ece1] border-[#e5dcce] text-[#9e8e82] line-through'
                                      : 'bg-white border-[#e5dcce] text-[#78695e] hover:border-[#8c5f4a]'
                                  }`}
                                >
                                  {v.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions in Earth Tones */}
                    <div className="pt-2 border-t border-[#f2ece1] space-y-1.5">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(product)}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                          justAddedId === product.id
                            ? 'bg-[#415e58] text-white'
                            : isOutOfStock
                            ? 'bg-[#f2ece1] text-[#9e8e82] cursor-not-allowed'
                            : 'text-[#f7f4ee] hover:opacity-95'
                        }`}
                        style={
                          justAddedId === product.id || isOutOfStock
                            ? undefined
                            : { backgroundColor: themePrimary }
                        }
                      >
                        {justAddedId === product.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Eklendi!
                          </>
                        ) : isOutOfStock ? (
                          'Tükendi'
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" /> Sepete Ekle
                          </>
                        )}
                      </button>

                      <a
                        href={whatsappAskUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-1.5 px-2 rounded-xl text-[11px] font-semibold text-[#415e58] bg-[#edf2eb] hover:bg-[#e4ede2] flex items-center justify-center gap-1 transition border border-[#d4e0d1]"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp&apos;tan Sor
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar in Natural Earth Tone */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full text-[#f7f4ee] p-4 rounded-3xl shadow-xl flex items-center justify-between transition cursor-pointer hover:scale-[1.01]"
            style={{ backgroundColor: themePrimary }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#f7f4ee] text-[#33261f] font-bold text-xs w-7 h-7 rounded-full flex items-center justify-center">
                {totalItemsCount}
              </div>
              <div className="text-left">
                <p className="text-[11px] text-[#e5dcce]">Sepet Toplamı</p>
                <p className="text-sm font-bold text-white">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            <span className="bg-[#f7f4ee] text-[#33261f] px-4 py-2 rounded-2xl text-xs font-bold shadow-xs">
              Siparişi Tamamla →
            </span>
          </button>
        </div>
      )}

      {/* Story View Modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative max-w-sm w-full bg-[#2b221d] rounded-3xl overflow-hidden shadow-2xl border border-[#3e312b]">
            <button
              onClick={() => setActiveStory(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-9/16 w-full relative">
              <img
                src={activeStory.imageUrl}
                alt={activeStory.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/60 to-transparent text-white">
                <h4 className="font-bold text-lg">{activeStory.title}</h4>
                <p className="text-xs text-[#cfbeab] mt-1">
                  Öne çıkan vitrin hikayesi
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Cart & Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-[#e5dcce] flex items-center justify-between bg-[#f7f4ee]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#33261f]" />
                <h2 className="font-bold text-[#33261f] text-base">
                  Sepetim ({totalItemsCount} Ürün)
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-[#78695e] hover:bg-[#eae3d6] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Progress */}
            {store.freeShippingThreshold > 0 && deliveryType === 'SHIPPING' && cart.length > 0 && (
              <div className="bg-[#edf2eb] border-b border-[#d4e0d1] px-5 py-2.5 text-xs text-[#415e58] font-medium">
                {subtotal >= store.freeShippingThreshold ? (
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Sparkles className="w-4 h-4 text-[#415e58]" />
                    Tebrikler! Ücretsiz kargo limitine ulaştınız.
                  </p>
                ) : (
                  <div>
                    <p>
                      Ücretsiz kargo için{' '}
                      <strong>{formatCurrency(store.freeShippingThreshold - subtotal)}</strong>{' '}
                      daha ürün ekleyebilirsiniz.
                    </p>
                    <div className="w-full h-1.5 bg-[#d4e0d1] rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-[#415e58] rounded-full transition-all"
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
                <div className="text-center py-16">
                  <ShoppingBag className="w-12 h-12 text-[#cfbeab] mx-auto mb-3" />
                  <p className="text-[#33261f] font-bold">Sepetiniz boş</p>
                  <p className="text-xs text-[#78695e] mt-1">
                    Ürünleri ekleyip WhatsApp veya DM ile kolayca sipariş verebilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.cartItemId}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-[#e5dcce] bg-[#f7f4ee]/60"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-16 h-16 rounded-xl object-cover bg-white shrink-0 border border-[#e5dcce]"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-[#33261f] truncate">
                            {item.productName}
                          </h4>
                          {item.variantName && (
                            <p className="text-xs text-[#78695e]">
                              Seçenek: {item.variantName}
                            </p>
                          )}
                          <p className="text-xs font-bold text-[#33261f] mt-1">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-[#e5dcce] rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.cartItemId, -1)}
                            className="p-1 text-[#78695e] hover:text-[#783e35] cursor-pointer"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="text-xs font-bold w-5 text-center text-[#33261f]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.cartItemId, 1)}
                            className="p-1 text-[#78695e] hover:text-[#33261f] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery & Form */}
                  <div className="space-y-4 pt-2 border-t border-[#e5dcce]">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#78695e]">
                      1. Teslimat Yöntemi
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
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          deliveryType === 'SHIPPING'
                            ? 'border-[#3e312b] bg-[#3e312b] text-white'
                            : 'border-[#e5dcce] bg-white text-[#78695e]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Truck className="w-4 h-4" />
                          Adrese Kargo
                        </div>
                        <p className="text-[10px] opacity-80 mt-1">
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
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                            deliveryType === 'STORE_PICKUP'
                              ? 'border-[#3e312b] bg-[#3e312b] text-white'
                              : 'border-[#e5dcce] bg-white text-[#78695e]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <StoreIcon className="w-4 h-4" />
                            Mağazadan Gel-Al
                          </div>
                          <p className="text-[10px] opacity-80 mt-1">Dükkandan Ücretsiz</p>
                        </button>
                      )}
                    </div>

                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#78695e] pt-2">
                      2. İletişim & Adres Bilgileri
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                          Adınız Soyadınız *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Örn: Zeynep Kaya"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm focus:border-[#8c5f4a] outline-none text-[#33261f]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                          Telefon Numaranız (WhatsApp) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="05XX XXX XX XX"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm focus:border-[#8c5f4a] outline-none text-[#33261f]"
                        />
                      </div>

                      {deliveryType === 'SHIPPING' && (
                        <div>
                          <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                            Açık Kargo Adresi *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder="Mahalle, sokak, bina no, ilçe/il"
                            className="w-full px-3.5 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm focus:border-[#8c5f4a] outline-none text-[#33261f]"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
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
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm focus:border-[#8c5f4a] outline-none text-[#33261f]"
                        >
                          <option value="IBAN_TRANSFER">Havale / EFT (IBAN)</option>
                          <option value="CASH_ON_DELIVERY">Kapıda Nakit / Kart</option>
                          {store.allowStorePickup && (
                            <option value="PAY_AT_STORE">Mağazada Gel-Al Öde</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#4a3f39] mb-1">
                          Sipariş Notu (Opsiyonel)
                        </label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Örn: Hediye paketi rica ediyorum"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#e5dcce] bg-[#fdfcf9] text-xs sm:text-sm focus:border-[#8c5f4a] outline-none text-[#33261f]"
                        />
                      </div>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-[#f2ece1] rounded-2xl p-4 border border-[#e5dcce] space-y-2 text-xs">
                      <div className="flex justify-between text-[#78695e]">
                        <span>Ara Toplam</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#78695e]">
                        <span>Kargo</span>
                        <span>
                          {shippingCost === 0 ? (
                            <strong className="text-[#415e58]">Ücretsiz</strong>
                          ) : (
                            formatCurrency(shippingCost)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-[#33261f] text-sm pt-2 border-t border-[#e5dcce]">
                        <span>Toplam Tutar</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>

                    {formError && (
                      <div className="bg-[#f7ece8] border border-[#edd5cd] text-[#783e35] px-3.5 py-2 rounded-xl text-xs font-semibold">
                        {formError}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Submit Buttons in Natural Irmak Adaçayı & Tan 155 */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-[#e5dcce] bg-white space-y-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCompleteOrder('WHATSAPP')}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-[#415e58] hover:bg-[#344d48] text-[#f7f4ee] flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp ile Siparişi Gönder
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCompleteOrder('INSTAGRAM_DM')}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-[#8c5f4a] hover:bg-[#754e3c] text-[#f7f4ee] flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Instagram className="w-4 h-4" />
                  Siparişi Kopyala & Instagram DM Aç
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {completedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 border border-[#e5dcce]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#edf2eb] text-[#415e58] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#33261f] text-base">
                  Sipariş Alındı ({completedOrderModal.orderNumber})
                </h3>
                <p className="text-xs text-[#78695e]">
                  Mağaza paneline kaydedildi ve hazırlandı.
                </p>
              </div>
            </div>

            {completedOrderModal.channel === 'INSTAGRAM_DM' ? (
              <div className="bg-[#f7ede5] border border-[#e5dcce] rounded-2xl p-3.5 text-xs text-[#783e35] space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-[#8c5f4a]">
                  <Instagram className="w-4 h-4" />
                  Instagram DM Adımı
                </p>
                <p>
                  Sipariş özetiniz <strong>panonuza kopyalandı</strong>. Aşağıdaki butondan mağaza
                  DM ekranına gidip yapıştırarak gönderebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="bg-[#edf2eb] border border-[#d4e0d1] rounded-2xl p-3.5 text-xs text-[#415e58]">
                Hazır sipariş özetiniz WhatsApp üzerinden satıcıya iletilmek üzere açıldı.
              </div>
            )}

            {completedOrderModal.ibanInfo && (
              <div className="bg-[#fdfcf9] border border-[#ded4c3] rounded-2xl p-3.5 text-xs text-[#312925] space-y-1.5">
                <p className="font-bold text-[#8b634d]">🏦 Havale / EFT Banka Bilgisi:</p>
                <p className="font-mono font-bold text-xs select-all bg-white p-2 rounded-xl border border-[#ded4c3]">
                  {completedOrderModal.ibanInfo}
                </p>
                <p className="text-[10px] text-[#786c64]">
                  Lütfen havale açıklamasına <strong>{completedOrderModal.orderNumber}</strong> sipariş numaranızı yazınız.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href={completedOrderModal.targetUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 ${
                  completedOrderModal.channel === 'WHATSAPP'
                    ? 'bg-[#415e58] hover:bg-[#344d48]'
                    : 'bg-[#8c5f4a] hover:bg-[#754e3c]'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                {completedOrderModal.channel === 'WHATSAPP'
                  ? "WhatsApp'ı Aç"
                  : 'Instagram DM Aç'}
              </a>
              <button
                type="button"
                onClick={() => setCompletedOrderModal(null)}
                className="py-3 px-4 rounded-xl font-semibold text-xs bg-[#f2ece1] hover:bg-[#eae3d6] text-[#33261f] cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
