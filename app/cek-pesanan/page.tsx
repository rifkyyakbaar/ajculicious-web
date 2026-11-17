import { Suspense } from 'react';
import type { Metadata } from 'next';
import AjculiciousInteractiveStore from '@/components/ajculicious_interactive_store';
import { getStorefrontInitialData } from '@/actions/catalog-actions';

export const metadata: Metadata = {
  title: 'Cek Status Pesanan — AJCUlicious',
  description:
    'Cek status pesanan Pre-Order AJCUlicious Anda secara real-time menggunakan Kode Invoice (AJC-YYMMDD-XXX) atau Nama Pemesan.',
};

async function TrackerLoader() {
  const { products, reviews, batchConfig } = await getStorefrontInitialData();
  return (
    <AjculiciousInteractiveStore
      initialProducts={products}
      initialReviews={reviews}
      initialBatchConfig={batchConfig}
      openTrackerInitially={true}
    />
  );
}

export default function CekPesananPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[#5C3A21] border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <TrackerLoader />
    </Suspense>
  );
}
