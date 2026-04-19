'use client';

import React, { useState, useTransition } from 'react';
import { FormField, submitForm } from '@/app/actions';

interface StudentDetails {
  name: string;
  email: string;
  roll: string;
}

export default function FormRenderer({ formId, fields }: { formId: string, fields: FormField[] }) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [studentDetails, setStudentDetails] = useState<StudentDetails>({
    name: '',
    email: '',
    roll: '',
  });

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = async (fieldId: string, file?: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data?.url) {
        setFormData(prev => ({ ...prev, [fieldId]: data.url }));
      }
    } catch {
      alert('File upload failed');
    }
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const currentValues = (formData[fieldId] as string[]) || [];
    let newValues;
    if (checked) {
      newValues = [...currentValues, option];
    } else {
      newValues = currentValues.filter(v => v !== option);
    }
    handleChange(fieldId, newValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          alert(`Please fill out "${field.label}"`);
          return;
        }
      }
    }

    startTransition(async () => {
      const result = await submitForm(formId, formData, studentDetails);
      if (result.success) {
        setSubmitted(true);
      } else {
        alert(result.message || 'Submission failed');
      }
    });
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl">check</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Thank You!</h2>
        <p className="text-slate-600 dark:text-slate-400">Your response has been recorded successfully.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 text-primary hover:underline font-medium"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Student Details</h2>
              <p className="text-sm text-slate-600 mt-1">Enter your details to submit this form</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (studentDetails.name && studentDetails.email && studentDetails.roll) setShowModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
                  value={studentDetails.roll}
                  onChange={(e) => setStudentDetails({ ...studentDetails, roll: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-8 ${showModal ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900 dark:text-white">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'text' && (
            <input
              type="text"
              required={field.required}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
              placeholder="Your answer"
            />
          )}

          {field.type === 'textarea' && (
            <textarea
              required={field.required}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow min-h-[120px]"
              placeholder="Your answer"
            />
          )}

          {field.type === 'number' && (
            <input
              type="number"
              required={field.required}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
              placeholder="0"
            />
          )}

          {field.type === 'select' && (
            <select
              required={field.required}
              onChange={(e) => handleChange(field.id, e.target.value)}
              defaultValue=""
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
            >
              <option value="" disabled>Select an option</option>
              {field.options?.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          )}

          {field.type === 'radio' && (
            <div className="space-y-3">
              {field.options?.map((option, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    required={field.required}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="w-5 h-5 text-primary border-slate-300 focus:ring-primary"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{option}</span>
                </label>
              ))}
            </div>
          )}

          {field.type === 'checkbox' && (
            <div className="space-y-3">
              {field.options?.map((option, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    value={option}
                    onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{option}</span>
                </label>
              ))}
            </div>
          )}

          {field.type === 'file' && (
            <div className="space-y-2">
              <input
                type="file"
                required={field.required}
                onChange={(e) => handleFileChange(field.id, e.target.files?.[0] ?? null)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white text-slate-900 dark:text-white"
              />
              {formData[field.id] && (
                <a href={formData[field.id]} target="_blank" className="text-primary text-sm hover:underline">
                  Open uploaded file
                </a>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {isPending ? (
            <>
              <span className="animate-spin material-symbols-outlined">refresh</span>
              Submitting...
            </>
          ) : (
            <>
              <span>Submit Form</span>
              <span className="material-symbols-outlined">send</span>
            </>
          )}
        </button>
      </div>
      </form>
    </div>
  );
}
