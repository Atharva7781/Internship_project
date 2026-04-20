'use client';

import { toggleFormStatus } from '@/app/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FormStatusToggle({ formId, initialStatus }: { formId: string, initialStatus: boolean }) {
  const [isActive, setIsActive] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    const result = await toggleFormStatus(formId);
    if (result.success) {
      setIsActive(!isActive);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border shadow-sm transition-colors focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
        isActive
          ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-200"
      }`}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
      ) : (
        <span className="material-symbols-outlined text-[18px]">
          {isActive ? 'block' : 'check_circle'}
        </span>
      )}
      {isActive ? 'Deactivate Form' : 'Activate Form'}
    </button>
  );
}
