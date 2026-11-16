'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function AdminLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === 'admin@ajculicious.com' && password === 'admin123') {
      setErrorMsg('');
      onLoginSuccess();
      onClose();
    } else {
      setErrorMsg('Email atau password tidak sesuai. Silakan gunakan kredensial demo.');
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@ajculicious.com');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#5C3A21] text-white flex items-center justify-center font-bold">
              <Lock className="w-5 h-5 text-[#FAF6F0]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#3B2618]">
                Login Admin AJCUlicious
              </h3>
              <p className="text-xs text-[#7D5E46]">
                Portal manajemen operasional &amp; keuangan
              </p>
            </div>
          </div>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onClose}
            className="p-1.5 rounded-full bg-white hover:bg-[#F2E8DC] text-[#3B2618] border border-[#E6D8C7] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3B2618] mb-1">
              Email Admin
            </label>
            <input
              type="email"
              suppressHydrationWarning
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ajculicious.com"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] shadow-2xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#3B2618] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password admin..."
                className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] shadow-2xs"
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
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            suppressHydrationWarning
            className="w-full py-3 rounded-2xl bg-[#5C3A21] text-white font-extrabold text-xs hover:bg-[#462B18] transition shadow-sm active:scale-95"
          >
            Masuk ke Dashboard Admin
          </button>

          {/* Petunjuk Kredensial Demo */}
          <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6D8C7] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#7D5E46]">
              <span className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5C3A21]" />
                Akun Demo Pengujian:
              </span>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleFillDemo}
                className="text-[11px] font-bold text-[#5C3A21] hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Isi Otomatis</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-[#3B2618] space-y-0.5 bg-white p-2 rounded-xl border border-[#E6D8C7]/50">
              <p>Email: <strong>admin@ajculicious.com</strong></p>
              <p>Password: <strong>admin123</strong></p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
