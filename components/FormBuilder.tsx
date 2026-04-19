'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { createForm, FieldType, FormField } from '@/app/actions';
import { FORM_TEMPLATES } from '@/lib/templates';
import { generateId } from '@/lib/id';

export default function FormBuilder() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isPending, startTransition] = useTransition();
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showMoreFieldTypes, setShowMoreFieldTypes] = useState(false);

  const formLink = useMemo(() => {
    if (!createdFormId) return '';
    return `${window.location.origin}/forms/${createdFormId}`;
  }, [createdFormId]);

  const qrUrl = useMemo(() => {
    if (!formLink) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(formLink)}`;
  }, [formLink]);

  useEffect(() => {
    if (!successOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSuccessOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [successOpen]);

  const handleTemplateSelect = (templateId: string) => {
    const template = FORM_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      // Create deep copy of fields with new IDs to avoid reference issues
      const newFields = template.fields.map(f => ({
        ...f,
        id: generateId()
      }));
      setTitle(template.title);
      setDescription(template.description);
      setFields(newFields);
    }
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: generateId(),
      label: `New ${type} question`,
      type,
      required: false,
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleOptionChange = (fieldId: string, index: number, value: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field && field.options) {
      const newOptions = [...field.options];
      newOptions[index] = value;
      updateField(fieldId, { options: newOptions });
    }
  };

  const addOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field && field.options) {
      updateField(fieldId, { options: [...field.options, `Option ${field.options.length + 1}`] });
    }
  };

  const removeOption = (fieldId: string, index: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field && field.options && field.options.length > 1) {
      const newOptions = field.options.filter((_, i) => i !== index);
      updateField(fieldId, { options: newOptions });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Please enter a form title');
    if (fields.length === 0) return alert('Please add at least one field');

    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('fields', JSON.stringify(fields));

      const result = await createForm(null, formData);
      if (result.success && result.formId) {
        setCreatedFormId(result.formId);
        setSuccessOpen(true);
        setCopied(false);
      } else {
        alert(result.message || 'Failed to create form');
      }
    });
  };

  return (
    <div className="space-y-8">
      {createdFormId && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Form created</p>
              <button
                type="button"
                onClick={() => setSuccessOpen(true)}
                className="text-sm text-primary hover:underline"
              >
                Copy link & QR code
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={formLink}
              target="_blank"
              className="px-4 py-2 bg-primary text-white rounded-lg font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              View Form
            </a>
            <button
              type="button"
              onClick={() => {
                setCreatedFormId(null);
                setSuccessOpen(false);
                setCopied(false);
                setTitle('');
                setDescription('');
                setFields([]);
              }}
              className="px-4 py-2 rounded-lg font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      )}

      {successOpen && createdFormId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setSuccessOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-created-title"
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div>
                  <h2 id="form-created-title" className="text-lg font-bold text-slate-900 dark:text-white">
                    Success
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Copy the link or share via QR.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuccessOpen(false)}
                className="size-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                aria-label="Close dialog"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Form Link</p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input
                    readOnly
                    value={formLink}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(formLink);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1200);
                      } catch {
                        alert('Copy failed. Please copy manually.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={formLink}
                    target="_blank"
                    className="text-sm text-primary hover:underline"
                  >
                    Open form
                  </a>
                  <a
                    href={qrUrl}
                    target="_blank"
                    className="text-sm text-primary hover:underline"
                  >
                    Open QR image
                  </a>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">QR Code</p>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <img src={qrUrl} alt="QR code for the form link" className="w-[220px] h-[220px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">dashboard</span>
          Start from a Template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FORM_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className="p-4 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
            >
              <div className="font-medium text-slate-900 dark:text-white group-hover:text-primary mb-1">
                {template.title}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {template.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Form Details */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Form Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="e.g., Mid-term Feedback Survey"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary h-24 resize-none"
            placeholder="Enter form description..."
          />
        </div>
      </div>

      {/* Fields List */}
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button 
                onClick={() => removeField(field.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Field"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>

            <div className="grid gap-4">
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Question Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="text">Short Answer</option>
                    <option value="textarea">Paragraph</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown</option>
                    <option value="radio">Multiple Choice</option>
                    <option value="checkbox">Checkboxes</option>
                    <option value="file">File Upload</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`required-${field.id}`}
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`required-${field.id}`} className="text-sm text-slate-700 dark:text-slate-300">Required field</label>
              </div>

              {/* Options for Select/Radio/Checkbox */}
              {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                <div className="mt-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Options</label>
                  {field.options?.map((option, optIndex) => (
                    <div key={optIndex} className="flex gap-2 items-center">
                      <span className="material-symbols-outlined text-slate-400 text-sm">radio_button_unchecked</span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(field.id, optIndex, e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
                      />
                      <button 
                        onClick={() => removeOption(field.id, optIndex)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => addOption(field.id)}
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Add Option
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Field Buttons */}
        <div className="flex flex-wrap gap-2 justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary/50 transition-colors bg-slate-50 dark:bg-slate-800/50">
          <div className="w-full flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setAddMenuOpen((v) => !v)}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">{addMenuOpen ? 'close' : 'add'}</span>
              Add Question
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {addMenuOpen ? 'Choose a type to add.' : 'Keep the form simple until you need more.'}
            </span>
          </div>

          {addMenuOpen && (
            <div className="w-full mt-3 flex flex-col items-center gap-3">
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => addField('text')}
                  className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">short_text</span> Short Answer
                </button>
                <button
                  type="button"
                  onClick={() => addField('textarea')}
                  className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">notes</span> Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => addField('radio')}
                  className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">radio_button_checked</span> Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => addField('select')}
                  className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">arrow_drop_down_circle</span> Dropdown
                </button>
                <button
                  type="button"
                  onClick={() => setShowMoreFieldTypes((v) => !v)}
                  className="px-3 py-1.5 rounded-full bg-transparent border border-transparent text-sm text-primary hover:underline transition-colors"
                >
                  {showMoreFieldTypes ? 'Less types' : 'More types'}
                </button>
              </div>

              {showMoreFieldTypes && (
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => addField('checkbox')}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">check_box</span> Checkboxes
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('number')}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">pin</span> Number
                  </button>
                  <button
                    type="button"
                    onClick={() => addField('file')}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">attach_file</span> File Upload
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button 
          type="button" 
          onClick={() => setFields([])}
          className="px-6 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={handleSubmit}
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <span className="animate-spin material-symbols-outlined">refresh</span>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              Publish Form
            </>
          )}
        </button>
      </div>
    </div>
  );
}
