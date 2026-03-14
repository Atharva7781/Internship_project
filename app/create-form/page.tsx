import React from 'react';
import FormBuilder from '@/components/FormBuilder';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TeacherSidebar from '@/components/TeacherSidebar';

export default async function CreateForm() {
  const session = await getServerSession(authOptions);

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
      <div className="flex min-h-screen">
        <TeacherSidebar user={session?.user || {}} />
        
        {/* Main Content */}
        <main className="ml-72 flex-1 p-8">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create New Form</h2>
              <p className="text-slate-500 dark:text-slate-400">Design and publish new forms for students and staff.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50">
                <span className="material-symbols-outlined text-xl">download</span>
                Import Template
              </button>
            </div>
          </header>
          
          {/* Form Builder Component */}
          <FormBuilder />

        </main>
      </div>
    </div>
  );
}
