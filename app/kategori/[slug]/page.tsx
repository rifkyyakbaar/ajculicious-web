import { Suspense } from 'react';
import type { Metadata } from 'next';
import AjculiciousInteractiveStore from '@/components/ajculicious_interactive_store';
import {
  getAllCategories,
  getStorefrontInitialData,
} from '@/actions/catalog-actions';
import { CategorySlug } from '@/types/ajculicious';

interface KategoriPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: KategoriPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getAllCategories();
  const matched = categories.find((c) => c.slug === slug);
  const categoryName = matched?.name || 'Katalog Menu';

  return {
    title: `${categoryName} — AJCUlicious`,
    description: `Pesan menu ${categoryName} segar dari AJCUlicious dengan pembayaran COD atau QRIS Statis.`,
  };
}

async function CategoryStoreLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { products, reviews, batchConfig } = await getStorefrontInitialData();

  return (
    <AjculiciousInteractiveStore
      initialProducts={products}
      initialReviews={reviews}
      initialBatchConfig={batchConfig}
      initialCategory={slug as CategorySlug}
    />
  );
}

export default function KategoriPage({ params }: KategoriPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[#5C3A21] border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <CategoryStoreLoader params={params} />
    </Suspense>
  );
}
