'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-slate-400 hover:text-red-500 transition-colors"
      title="Sign Out"
    >
      <span className="material-symbols-outlined text-xl">logout</span>
    </button>
  );
}
