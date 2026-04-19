import React from 'react';
import { getTeacherForms } from '../actions';
import Link from 'next/link';
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/")
  }

  const forms = await getTeacherForms();
  
  const totalForms = forms.length;
  const totalSubmissions = forms.reduce((acc, form) => acc + form._count.submissions, 0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Dashboard Overview</h2>
              <p className="mt-2 text-sm text-gray-500">Welcome back to the administrative control center.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-gray-50">
                <span className="material-symbols-outlined text-lg">download</span>
                Export Report
              </button>
              <Link href="/create-form" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90">
                <span className="material-symbols-outlined text-lg">add</span>
                Create New Form
              </Link>
            </div>
          </header>
        </section>

      <section className="mb-8 rounded-xl bg-white p-6 shadow-md">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Overview</h3>
          <p className="mt-1 text-sm text-gray-500">A quick snapshot of your forms activity.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-primary/10 p-2">
                <span className="material-symbols-outlined text-primary">description</span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Total Forms Created</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{totalForms}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-primary/10 p-2">
                <span className="material-symbols-outlined text-primary">groups</span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Total Responses</p>
            <p className="mt-1 text-2xl font-bold text-violet-600">{totalSubmissions}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-primary/10 p-2">
                <span className="material-symbols-outlined text-primary">timelapse</span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">Active Forms</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{totalForms}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Forms</h3>
            <p className="mt-1 text-sm text-gray-500">Review the latest forms and their current status.</p>
          </div>
          <Link href="/teacher-dashboard/history" className="text-sm font-semibold text-primary hover:text-primary/80">View All</Link>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Form Title</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Responses</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {forms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No forms created yet. Click &quot;Create New Form&quot; to get started.
                    </td>
                  </tr>
                ) : (
                  forms.map((form) => (
                    <tr key={form.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link href={`/teacher-dashboard/forms/${form.id}`} className="flex items-center gap-3 transition-colors hover:text-primary">
                          <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                          </div>
                          {form.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">{new Date(form.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {form._count.submissions}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          form.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${form.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                          {form.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/teacher-dashboard/forms/${form.id}/dashboard`} className="p-2 text-slate-400 transition-colors hover:text-primary" title="Analytics Dashboard">
                            <span className="material-symbols-outlined text-[20px]">analytics</span>
                          </Link>
                          <Link href={`/teacher-dashboard/forms/${form.id}`} className="p-2 text-slate-400 transition-colors hover:text-primary" title="View Details">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </Link>
                          <Link href={`/forms/${form.id}`} target="_blank" className="p-2 text-slate-400 transition-colors hover:text-primary" title="View Public Form">
                            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
