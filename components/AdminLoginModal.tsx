'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { loginAdmin } from '../actions/admin-actions';
import { AdminUserProfile } from '../types/database';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (adminProfile?: AdminUserProfile) => void;
}

export default function AdminLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await loginAdmin(email, password);
      if (!res.success || !res.data) {
        setErrorMsg(res.error || 'Email atau password tidak sesuai.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess(res.data);
      onClose();
    } catch {
      setErrorMsg('Terjadi kesalahan saat memverifikasi akun.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#5C3A21] text-white flex items-center justify-center font-bold">
              <Lock className="w-4 h-4 text-[#FAF6F0]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#3B2618]">
                Login Admin
              </h3>
              <p className="text-xs text-[#8C6D53]">
                Khusus pengelola AJCUlicious
              </p>
            </div>
          </div>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#FAF6F0] text-[#3B2618] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Login Tanpa Menampilkan Kredensial */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3B2618] mb-1.5">
              Email Admin
            </label>
            <input
              type="email"
              suppressHydrationWarning
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email admin"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3B2618] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                required
              />
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#5C3A21] transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            suppressHydrationWarning
            className="w-full py-3 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] disabled:opacity-60 transition active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk Dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
