import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import AdminLoginClient from './AdminLoginClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Süper Admin Girişi | InstaSipariş',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage() {
  const isAdmin = await getAdminSession();
  if (isAdmin) {
    redirect('/admin');
  }

  return <AdminLoginClient />;
}
