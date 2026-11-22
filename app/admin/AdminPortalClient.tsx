'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BatchPOConfig, Product } from '@/types/ajculicious';
import { AdminUserProfile } from '@/types/database';
import AdminDashboardView from '@/components/AdminDashboardView';
import AdminLoginModal from '@/components/AdminLoginModal';

export default function AdminPortalClient({
  initialProducts,
  initialBatchConfig,
}: {
  initialProducts: Product[];
  initialBatchConfig: BatchPOConfig;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [batchConfig, setBatchConfig] = useState<BatchPOConfig>(
    initialBatchConfig
  );
  const [adminProfile, setAdminProfile] = useState<AdminUserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const auth = localStorage.getItem('ajc_admin_auth');
      const prof = localStorage.getItem('ajc_admin_profile');
      if (auth === 'true') {
        setIsLoggedIn(true);
        if (prof) setAdminProfile(JSON.parse(prof));
      }
    } catch {}
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4">
        <AdminLoginModal
          isOpen={true}
          onClose={() => router.push('/')}
          onLoginSuccess={(profile) => {
            setIsLoggedIn(true);
            if (profile) setAdminProfile(profile);
            try {
              localStorage.setItem('ajc_admin_auth', 'true');
              if (profile) {
                localStorage.setItem('ajc_admin_profile', JSON.stringify(profile));
              }
            } catch {}
          }}
        />
      </div>
    );
  }

  return (
    <AdminDashboardView
      adminProfile={adminProfile}
      onBackToStore={() => router.push('/')}
      onLogout={() => {
        setIsLoggedIn(false);
        setAdminProfile(null);
        try {
          localStorage.removeItem('ajc_admin_auth');
          localStorage.removeItem('ajc_admin_profile');
        } catch {}
        router.push('/');
      }}
      products={products}
      onUpdateProducts={setProducts}
      batchConfig={batchConfig}
      onUpdateBatchConfig={setBatchConfig}
    />
  );
}
