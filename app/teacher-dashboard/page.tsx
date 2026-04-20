import React from 'react';
import { getTeacherForms, getTeacherOverviewStats } from '../actions';
import Link from 'next/link';
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/signin")
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/")
  }

  const forms = await getTeacherForms();
  const stats = await getTeacherOverviewStats();

  const recentForms = forms.slice(0, 8);
  const totalForms = stats?.totalForms ?? forms.length;
  const activeForms = stats?.activeForms ?? forms.filter((f) => f.isActive).length;
  const totalResponses = stats?.totalResponses ?? forms.reduce((acc, form) => acc + form._count.submissions, 0);
  const responsesLast7Days = stats?.responsesLast7Days ?? 0;
  const avgResponsesPerForm = stats?.avgResponsesPerForm ?? (totalForms === 0 ? 0 : totalResponses / totalForms);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
            <p className="mt-1 text-slate-600">Your forms, responses, and recent activity at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher-dashboard/history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              History
            </Link>
            <Link
              href="/create-form"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Form
            </Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium">Total Forms</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{totalForms}</p>
          <p className="text-xs text-slate-600 mt-2">Includes active and inactive forms.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium">Active Forms</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{activeForms}</p>
          <p className="text-xs text-slate-600 mt-2">Accepting responses right now.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium">Total Responses</p>
          <p className="text-3xl font-bold text-primary mt-1">{totalResponses}</p>
          <p className="text-xs text-slate-600 mt-2">Across all your forms.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-sm font-medium">Responses (7 days)</p>
          <p className="text-3xl font-bold text-violet-600 mt-1">{responsesLast7Days}</p>
          <p className="text-xs text-slate-600 mt-2">
            Avg {avgResponsesPerForm.toFixed(1)} per form overall.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Forms</h2>
              <p className="mt-1 text-sm text-slate-600">Latest {Math.min(8, forms.length)} forms by created date.</p>
            </div>
            <Link href="/teacher-dashboard/history" className="text-sm font-semibold text-primary hover:text-primary/80">
              View all
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-6 py-4">Form</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Responses</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentForms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-slate-700 font-semibold">No forms yet</p>
                      <p className="text-sm text-slate-600 mt-1">Create your first form using a template to get started.</p>
                      <div className="mt-4 flex justify-center">
                        <Link
                          href="/create-form"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white shadow-sm hover:bg-primary/90 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          Create Form
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentForms.map((form) => (
                    <tr key={form.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <Link href={`/teacher-dashboard/forms/${form.id}`} className="hover:text-primary transition-colors">
                          {form.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{new Date(form.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {form._count.submissions}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            form.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${form.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                          {form.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/teacher-dashboard/forms/${form.id}`} className="p-2 text-slate-500 hover:text-primary transition-colors" title="View details">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </Link>
                          <Link
                            href={`/teacher-dashboard/forms/${form.id}/dashboard`}
                            className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="View analytics"
                          >
                            <span className="material-symbols-outlined text-[20px]">analytics</span>
                          </Link>
                          <Link href={`/forms/${form.id}`} target="_blank" className="p-2 text-slate-500 hover:text-primary transition-colors" title="Open public form">
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

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-600">Most used actions in one place.</p>

          <div className="mt-4 space-y-2">
            <Link
              href="/create-form"
              className="w-full inline-flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Create a form</p>
                  <p className="text-xs text-slate-600">Use a template or build from scratch.</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-500">chevron_right</span>
            </Link>

            <Link
              href="/teacher-dashboard/history"
              className="w-full inline-flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <span className="material-symbols-outlined">history</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Browse history</p>
                  <p className="text-xs text-slate-600">Search and manage previous forms.</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-500">chevron_right</span>
            </Link>

            {stats?.topForm && (
              <Link
                href={`/teacher-dashboard/forms/${stats.topForm.id}`}
                className="w-full inline-flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-slate-900 truncate">Top form</p>
                    <p className="text-xs text-slate-600 truncate">{stats.topForm.title}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-500">chevron_right</span>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
