import { Suspense } from 'react';
import type { Metadata } from 'next';
import {
  getBatchSettingsFromDb,
  getCatalogProducts,
} from '@/actions/catalog-actions';
import AdminPortalClient from './AdminPortalClient';

export const metadata: Metadata = {
  title: 'Dashboard Admin — AJCUlicious',
  description: 'Portal manajemen pesanan, stok produk, dan laporan penjualan AJCUlicious.',
};

async function AdminPageLoader() {
  const [initialProducts, initialBatchConfig] = await Promise.all([
    getCatalogProducts('all'),
    getBatchSettingsFromDb(),
  ]);
  return (
    <AdminPortalClient
      initialProducts={initialProducts}
      initialBatchConfig={initialBatchConfig}
    />
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[#5C3A21] border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <AdminPageLoader />
    </Suspense>
  );
}
