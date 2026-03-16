'use client';

import { useState, Fragment } from 'react';

interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  studentRoll: string;
  createdAt: string;
  data: any;
}

export default function SubmissionTable({ submissions }: { submissions: Submission[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Student Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Roll No.</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Submitted At</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No submissions yet.
                </td>
              </tr>
            ) : (
              submissions.map((submission) => (
                <Fragment key={submission.id}>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => toggleExpand(submission.id)}>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{submission.studentName}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{submission.studentRoll}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{submission.studentEmail}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(submission.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleExpand(submission.id); }}
                        className="text-primary hover:text-primary-dark transition-colors text-sm font-medium"
                      >
                        {expandedId === submission.id ? 'Hide Response' : 'View Response'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === submission.id && (
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Form Response</h4>
                          {(() => {
                            const payload = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data
                            const entries = Object.entries(payload || {})
                            const isUrl = (val: string) => {
                              return typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/uploads/') || /\.(pdf|docx?|xlsx?|png|jpg|jpeg|gif|pptx?)$/i.test(val))
                            }
                            return (
                              <div className="space-y-3">
                                {entries.length === 0 ? (
                                  <div className="text-slate-500 text-sm">No answers</div>
                                ) : (
                                  entries.map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-3">
                                      <div className="min-w-36 text-xs font-medium text-slate-500">{key}</div>
                                      <div className="text-sm text-slate-800 dark:text-slate-200">
                                        {Array.isArray(value) ? (
                                          value.length ? value.join(', ') : <span className="text-slate-500">Empty</span>
                                        ) : typeof value === 'string' ? (
                                          isUrl(value) ? (
                                            <a href={value} target="_blank" className="text-primary hover:underline">Open document</a>
                                          ) : (
                                            value || <span className="text-slate-500">Empty</span>
                                          )
                                        ) : typeof value === 'number' ? (
                                          value
                                        ) : value ? (
                                          JSON.stringify(value)
                                        ) : (
                                          <span className="text-slate-500">Empty</span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
