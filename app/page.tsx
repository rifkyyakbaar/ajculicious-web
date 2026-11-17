import { Suspense } from 'react';
import type { Metadata } from 'next';
import AjculiciousInteractiveStore from '@/components/ajculicious_interactive_store';
import { getStorefrontInitialData } from '@/actions/catalog-actions';

export const metadata: Metadata = {
  title: 'AJCUlicious — Cookies, Dubai Chewy Cookies, Brownies & Dimsum',
  description:
    'Pre-Order Cookies, Dubai Chewy Cookies Pistachio, Fudgy Shiny Crust Brownies, Dessert Box, dan Dimsum Hangat.',
  openGraph: {
    title: 'AJCUlicious — Homemade Cookies, Brownies & Dimsum',
    description:
      'Katalog Pre-Order Batch AJCUlicious: Dubai Chewy Cookies Pistachio, Soft Cookies, Fudgy Brownies, dan Dimsum Hangat.',
    images: ['/images/storefront-counter.jpg'],
  },
};

async function StorefrontLoader() {
  const { products, reviews, batchConfig } = await getStorefrontInitialData();
  return (
    <AjculiciousInteractiveStore
      initialProducts={products}
      initialReviews={reviews}
      initialBatchConfig={batchConfig}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[#5C3A21] border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <StorefrontLoader />
    </Suspense>
  );
}
