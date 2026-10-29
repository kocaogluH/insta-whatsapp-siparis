import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import SuperAdminClient from './SuperAdminClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Ajans Yönetimi | InstaSipariş Süper Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SuperAdminPage() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    redirect('/admin/login');
  }

  return <SuperAdminClient />;
}
