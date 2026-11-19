'use client';

import { useEffect } from 'react';

let activeLockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

/**
 * Mengunci scroll halaman utama selama ada popup/modal terbuka
 * agar latar belakang tetap membeku dan tidak ikut ter-scroll.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    if (activeLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    activeLockCount += 1;

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
    };
  }, [locked]);
}
