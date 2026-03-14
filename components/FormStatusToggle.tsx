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
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
        isActive 
          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' 
          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
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
