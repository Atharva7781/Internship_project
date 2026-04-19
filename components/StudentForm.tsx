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
  const fields: FormField[] = JSON.parse(form.fields);

  const buildInitialData = () => {
    const initialData: Record<string, any> = {};
    fields.forEach((field) => {
      if (field.type === 'checkbox') {
        initialData[field.id] = [];
      } else if (field.type === 'number' || (field as any).type === 'rating') {
        initialData[field.id] = null;
      } else {
        initialData[field.id] = '';
      }
    });
    return initialData;
  };

  const [submissionData, setSubmissionData] = useState<Record<string, any>>(() => buildInitialData());
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFileName, setAiFileName] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiRelationship, setAiRelationship] = useState<string>('');
  const [aiMeta, setAiMeta] = useState<{ provider?: string; model?: string } | null>(null);
  const [aiMatches, setAiMatches] = useState<
    { fieldId: string; label: string; value: unknown; reason: string; confidence: number }[]
  >([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);

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
    } catch {
      setError('Failed to upload file');
    }
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('formId', form.id);
    try {
      setError('');
      setAiLoading(true);
      setAiFileName(file.name);
      setAiSummary('');
      setAiRelationship('');
      setAiMatches([]);
      setAiMeta(null);
      setShowAiPanel(true);
      setAiPanelCollapsed(false);
      const res = await fetch('/api/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (data?.error) {
        setError(data.error || 'Failed to extract data from file');
        return;
      }

      if (data?.answers && typeof data.answers === 'object') {
        setSubmissionData((prev) => ({ ...prev, ...data.answers }));
        setAiSummary(typeof data?.summary === 'string' ? data.summary : '');
        setAiRelationship(typeof data?.relationship === 'string' ? data.relationship : '');
        setAiMatches(Array.isArray(data?.matchedFields) ? data.matchedFields : []);
        setAiMeta(data?.meta && typeof data.meta === 'object' ? data.meta : null);
      } else {
        setSubmissionData((prev) => ({ ...prev, ...data }));
        setAiSummary('');
        setAiRelationship('');
        setAiMatches([]);
        setAiMeta(data?.meta && typeof data.meta === 'object' ? data.meta : null);
      }
    } catch {
      setError('Failed to extract data from file');
    } finally {
      setAiLoading(false);
      if (e?.target) e.target.value = '';
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
          <div className="mb-6 rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-5 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/25 via-purple-400/20 to-indigo-400/25 blur-2xl ai-float" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/20 via-sky-400/15 to-purple-400/20 blur-2xl ai-float" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">Auto-fill using Resume</p>
                    <p className="text-xs text-slate-600">Upload PDF and we’ll match your fields automatically</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showAiPanel && aiPanelCollapsed && (
                  <button
                    type="button"
                    onClick={() => setAiPanelCollapsed(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md shadow-slate-900/15 hover:bg-slate-800 active:scale-[0.99] transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">dock_to_right</span>
                    Expand panel
                  </button>
                )}
              </div>
            </div>

            <div className="relative mt-4">
              <input
                id={`ai-upload-${form.id}`}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={aiLoading}
              />
              <label
                htmlFor={`ai-upload-${form.id}`}
                className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-purple-200/60 bg-white/70 px-4 py-4 shadow-sm backdrop-blur transition hover:bg-white ${aiLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {aiFileName ? aiFileName : 'Choose PDF document'}
                    </div>
                    <div className="text-xs text-slate-600 truncate">PDF only • The AI will fill matching fields</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {aiLoading ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs text-white">
                      <span className="h-3 w-3 rounded-full bg-white/70 ai-shimmer" />
                      Analyzing…
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs text-white group-hover:bg-slate-800 transition">
                      Upload
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
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
                  value={submissionData[field.id] ?? ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  required={field.required}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Your answer"
                  value={submissionData[field.id] ?? ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  required={field.required}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Your answer"
                  value={submissionData[field.id] ?? ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
              )}

              {field.type === 'select' && field.options && (
                <select
                  required={field.required}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white"
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  value={submissionData[field.id] ?? ''}
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
                        checked={submissionData[field.id] === opt}
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
              onClick={() => {
                setSubmissionData(buildInitialData());
                setAiSummary('');
                setAiRelationship('');
                setAiMatches([]);
              }} 
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

      {showAiPanel && (
        <div className="fixed right-4 top-24 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
          {aiPanelCollapsed ? (
            <button
              type="button"
              onClick={() => setAiPanelCollapsed(false)}
              className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white px-3 py-3 shadow-2xl hover:bg-slate-50 transition"
              aria-label="Expand AI panel"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white shadow-md">
                <span className={`material-symbols-outlined text-[18px] ${aiLoading ? 'ai-shimmer' : ''}`}>
                  auto_awesome
                </span>
              </span>
              <div className="text-left min-w-0">
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {aiLoading ? 'Analyzing…' : 'AI Panel'}
                </div>
                <div className="text-xs text-slate-600 truncate">
                  {aiLoading ? (aiFileName || 'Working…') : aiMatches.length ? `${aiMatches.length} fields matched` : (aiFileName || 'Ready')}
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-slate-500 group-hover:text-slate-900">
                open_in_full
              </span>
            </button>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-4 py-3 text-white">
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-15 ai-shimmer" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    <div className="font-semibold leading-tight">AI Summary</div>
                  </div>
                  <div className="text-xs text-white/80 truncate mt-0.5">
                    {aiLoading ? 'Analyzing document…' : aiFileName ? aiFileName : 'Upload a PDF to start'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(aiMeta?.provider || aiMeta?.model) && (
                    <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] max-w-[220px]">
                      <span className="material-symbols-outlined text-[14px]">memory</span>
                      <span className="font-medium">{aiMeta.provider || 'ai'}</span>
                      {aiMeta.model && <span className="text-white/70">•</span>}
                      {aiMeta.model && <span className="truncate">{aiMeta.model}</span>}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setAiPanelCollapsed(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition"
                    aria-label="Shrink"
                  >
                    <span className="material-symbols-outlined text-[20px]">minimize</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4 space-y-3">
              {aiLoading && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="h-4 w-40 rounded bg-slate-200 ai-shimmer" />
                    <div className="h-4 w-16 rounded bg-slate-200 ai-shimmer" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full rounded bg-slate-200 ai-shimmer" />
                    <div className="h-3 w-11/12 rounded bg-slate-200 ai-shimmer" />
                    <div className="h-3 w-4/5 rounded bg-slate-200 ai-shimmer" />
                  </div>
                </div>
              )}

              {!aiLoading && aiMatches.length > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Matched fields</span>
                    <span className="text-slate-500">{aiMatches.length}</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {aiMatches.map((m) => (
                      <div key={m.fieldId} className="px-4 py-3 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{m.label}</div>
                            <div className="text-xs text-slate-600 whitespace-pre-wrap mt-1">{String(m.value ?? '')}</div>
                          </div>
                          <div className="text-xs text-slate-600 tabular-nums shrink-0">
                            {Math.round((m.confidence ?? 0) * 100)}%
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            style={{ width: `${Math.round((m.confidence ?? 0) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 whitespace-pre-wrap">{m.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!aiLoading && (aiRelationship || aiSummary) && (
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 text-sm text-slate-700 shadow-sm">
                  {aiRelationship && <div className="font-medium text-slate-900 mb-1">{aiRelationship}</div>}
                  {aiSummary && <div className="whitespace-pre-wrap">{aiSummary}</div>}
                </div>
              )}

              {!aiLoading && !aiSummary && !aiRelationship && aiMatches.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Upload a PDF from the auto-fill section to see extracted details here.
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
