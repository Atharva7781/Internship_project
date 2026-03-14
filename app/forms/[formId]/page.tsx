import { getForm } from '@/app/actions';
import StudentForm from '@/components/StudentForm';
import { notFound } from 'next/navigation';

export default async function FormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const form = await getForm(formId);

  if (!form) {
    notFound();
  }

  if (!form.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
            <span className="material-symbols-outlined text-3xl text-red-600">block</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Closed</h2>
          <p className="text-slate-600">This form is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  return <StudentForm form={form} />;
}
