import { Suspense } from 'react';
import AjculiciousInteractiveStore from '@/components/ajculicious_interactive_store';

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-[#5C3A21] border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <AjculiciousInteractiveStore />
    </Suspense>
  );
}
