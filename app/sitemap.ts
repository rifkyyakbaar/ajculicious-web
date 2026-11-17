import type { MetadataRoute } from 'next';
import { getAllCategories, getCatalogProducts } from '../actions/catalog-actions';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://ajculicious.vercel.app';

  const [categories, products] = await Promise.all([
    getAllCategories(),
    getCatalogProducts('all'),
  ]);

  const categoryUrls: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/kategori/${cat.slug}`,
    lastModified: new Date(cat.created_at || Date.now()),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const productUrls: MetadataRoute.Sitemap = products.map((prod) => ({
    url: `${baseUrl}/?menu=${prod.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cek-pesanan`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    ...categoryUrls,
    ...productUrls,
  ];
}
