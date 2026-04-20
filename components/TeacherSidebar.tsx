'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';

interface TeacherSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export default function TeacherSidebar({ user }: TeacherSidebarProps) {
  const pathname = usePathname();
  const analyticsHref = useMemo(() => {
    const match = pathname.match(/^\/teacher-dashboard\/forms\/([^/]+)/);
    if (match?.[1]) {
      return `/teacher-dashboard/forms/${match[1]}/dashboard`;
    }
    return '/teacher-dashboard/history';
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/teacher-dashboard' && pathname === '/teacher-dashboard') {
      return true;
    }
    if (path !== '/teacher-dashboard' && pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  const navItems = [
    {
      name: 'Overview',
      href: '/teacher-dashboard',
      icon: 'dashboard',
    },
    {
      name: 'Create Form',
      href: '/create-form',
      icon: 'add_box',
    },
    {
      name: 'History',
      href: '/teacher-dashboard/history',
      icon: 'history_edu',
    },
    {
      name: 'Analytics',
      href: analyticsHref,
      icon: 'analytics',
    },
  ];

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-10">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">
          <span className="material-symbols-outlined">school</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-900 dark:text-white leading-tight">College Admin</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">Academic Portal v2.0</p>
        </div>
      </div>
      
      <nav className="flex-1 mt-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={`${item.name}-${item.href}`}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="size-10 rounded-full bg-slate-300 overflow-hidden flex items-center justify-center text-slate-500">
            <span className="material-symbols-outlined text-2xl">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || 'Teacher'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
