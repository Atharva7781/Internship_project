'use client';

import { useState } from 'react';
import { submitForm, FormField } from '@/app/actions';

interface StudentDetails {
  name: string;
  email: string;
  roll: string;
}

export default function StudentForm({ form }: { form: any }) {
  const [showModal, setShowModal] = useState(true);
  const [studentDetails, setStudentDetails] = useState<StudentDetails>({
    name: '',
    email: '',
    roll: '',
  });
  const [submissionData, setSubmissionData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fields: FormField[] = JSON.parse(form.fields);

  // Initialize form state
  useState(() => {
    const initialData: Record<string, any> = {};
    fields.forEach((field) => {
      if (field.type === 'checkbox') {
        initialData[field.id] = [];
      } else if (field.type === 'number' || field.type === 'rating') {
        initialData[field.id] = null;
      } else {
        initialData[field.id] = '';
      }
    });
    setSubmissionData(initialData);
  });

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentDetails.name && studentDetails.email && studentDetails.roll) {
      setShowModal(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    for (const field of fields) {
      if (field.required && !submissionData[field.id]) {
        setError(`Please fill in required field: ${field.label}`);
        setLoading(false);
        return;
      }
    }

    const result = await submitForm(form.id, submissionData, studentDetails);
    
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.message || 'Failed to submit form');
    }
    setLoading(false);
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setSubmissionData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = async (fieldId: string, file?: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data?.url) {
        setSubmissionData(prev => ({ ...prev, [fieldId]: data.url }));
      }
    } catch (e) {
      setError('Failed to upload file');
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
            <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-slate-600">Your response has been recorded successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Modal for Student Details */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Welcome</h2>
              <p className="text-slate-500 mt-2">Please enter your details to proceed</p>
            </div>
            
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="John Doe"
                  value={studentDetails.name}
                  onChange={(e) => setStudentDetails({ ...studentDetails, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="john@example.com"
                  value={studentDetails.email}
                  onChange={(e) => setStudentDetails({ ...studentDetails, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="e.g. 12345"
                  value={studentDetails.roll}
                  onChange={(e) => setStudentDetails({ ...studentDetails, roll: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors mt-2"
              >
                Start Form
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className={`mx-auto max-w-3xl transition-opacity duration-300 ${showModal ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="bg-indigo-600 h-2 w-full"></div>
          <div className="p-8 border-b border-slate-100">
            <h1 className="text-3xl font-bold text-slate-900 mb-3">{form.title}</h1>
            <p className="text-slate-600 whitespace-pre-wrap">{form.description}</p>
          </div>
          
          <div className="bg-slate-50 px-8 py-3 text-sm text-slate-500 flex items-center justify-between border-b border-slate-200">
             <span>Logged in as: <span className="font-medium text-slate-900">{studentDetails.name}</span> ({studentDetails.email})</span>
             <button 
               onClick={() => setShowModal(true)}
               className="text-indigo-600 hover:text-indigo-700 font-medium"
             >
               Change
             </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
            <div className="text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-shadow hover:shadow-md">
              <label className="block text-base font-medium text-slate-900 mb-3">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'text' && (
                <input
                  type="text"
                  required={field.required}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Your answer"
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  required={field.required}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Your answer"
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  required={field.required}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Your answer"
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}

              {field.type === 'select' && field.options && (
                <select
                  required={field.required}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white"
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Select an option</option>
                  {field.options.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'file' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    required={field.required}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 bg-white"
                    onChange={(e) => handleFileChange(field.id, e.target.files?.[0] ?? null)}
                  />
                  {submissionData[field.id] && (
                    <a href={submissionData[field.id]} target="_blank" className="text-indigo-600 text-sm">
                      Uploaded file
                    </a>
                  )}
                </div>
              )}

              {field.type === 'radio' && field.options && (
                <div className="space-y-2">
                  {field.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center">
                      <input
                        type="radio"
                        id={`${field.id}-${idx}`}
                        name={field.id}
                        value={opt}
                        required={field.required}
                        className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                      <label htmlFor={`${field.id}-${idx}`} className="ml-3 block text-sm font-medium text-slate-700">
                        {opt}
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {field.type === 'checkbox' && field.options && (
                <div className="space-y-2">
                  {field.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`${field.id}-${idx}`}
                        value={opt}
                        checked={(submissionData[field.id] || []).includes(opt)}
                        onChange={(e) => {
                          const current = (submissionData[field.id] as string[]) || [];
                          if (e.target.checked) {
                            handleInputChange(field.id, [...current, opt]);
                          } else {
                            handleInputChange(
                              field.id,
                              current.filter((o) => o !== opt)
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor={`${field.id}-${idx}`} className="ml-3 block text-sm font-medium text-slate-700">
                        {opt}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between items-center pt-4">
             <button
              type="button"
              onClick={() => setSubmissionData({})} 
              className="text-slate-500 hover:text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-8 py-3 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
