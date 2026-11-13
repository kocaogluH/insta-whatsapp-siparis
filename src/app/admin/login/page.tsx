import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { SITE_NAME } from '@/lib/constants';
import AdminLoginClient from './AdminLoginClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: {
    absolute: `Süper Admin Girişi | ${SITE_NAME}`,
  },
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
