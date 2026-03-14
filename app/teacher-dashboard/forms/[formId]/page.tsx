
import { getFormDetails } from '@/app/actions';
import { notFound } from 'next/navigation';
import FormStatusToggle from '@/components/FormStatusToggle';
import SubmissionTable from '@/components/SubmissionTable';
import Link from 'next/link';

interface FormDetailsPageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormDetailsPage({ params }: FormDetailsPageProps) {
  const { formId } = await params;
  const form = await getFormDetails(formId);

  if (!form) {
    notFound();
  }

  // Format submissions for client component
  const submissions = form.submissions.map(sub => ({
    id: sub.id,
    studentName: sub.studentName,
    studentEmail: sub.studentEmail,
    studentRoll: sub.studentRoll,
    createdAt: sub.createdAt.toISOString(),
    data: sub.data
  }));

  return (
    <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Link href="/teacher-dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <Link href="/teacher-dashboard/history" className="hover:text-primary transition-colors">History</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-[200px]">{form.title}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{form.title}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{form.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <FormStatusToggle formId={form.id} initialStatus={form.isActive} />
              <Link 
                href={`/forms/${form.id}`} 
                target="_blank"
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                View Public Form
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Responses</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{form.submissions.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Status</p>
            <p className={`text-3xl font-bold mt-1 ${form.isActive ? 'text-green-600' : 'text-slate-500'}`}>
              {form.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Created On</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {new Date(form.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Submissions</h2>
          </div>
          <SubmissionTable submissions={submissions} />
        </div>
      </div>
  );
}
