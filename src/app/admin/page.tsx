import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { SITE_NAME } from '@/lib/constants';
import SuperAdminClient from './SuperAdminClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: {
    absolute: `Ajans Yönetimi | ${SITE_NAME} Süper Admin`,
  },
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
