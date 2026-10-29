'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function AdminLoginClient() {
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

      // Başarılı giriş -> Admin paneline yönlendir
      window.location.href = '/admin';
    } catch {
      setAuthError('Giriş sırasında bağlantı hatası oluştu.');
    } finally {
      setIsLoggingIn(false);
    }
  };

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
              maxLength={64}
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
