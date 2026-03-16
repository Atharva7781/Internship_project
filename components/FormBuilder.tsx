'use client';

import React, { useState, useTransition } from 'react';
import { createForm, FieldType, FormField } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { FORM_TEMPLATES } from '@/lib/templates';

export default function FormBuilder() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isPending, startTransition] = useTransition();
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const router = useRouter();

  const handleTemplateSelect = (templateId: string) => {
    const template = FORM_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      // Create deep copy of fields with new IDs to avoid reference issues
      const newFields = template.fields.map(f => ({
        ...f,
        id: crypto.randomUUID()
      }));
      setTitle(template.title);
      setDescription(template.description);
      setFields(newFields);
    }
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
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
      } else {
        alert(result.message || 'Failed to create form');
      }
    });
  };

  if (createdFormId) {
    const formLink = `${window.location.origin}/forms/${createdFormId}`;
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Form Created Successfully!</h2>
        <p className="text-slate-600 dark:text-slate-400">Share this link with your students:</p>
        
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <input 
            readOnly 
            value={formLink} 
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-mono text-sm"
          />
          <button 
            onClick={() => navigator.clipboard.writeText(formLink)}
            className="text-primary hover:text-primary/80 font-medium text-sm"
          >
            Copy
          </button>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button 
            onClick={() => {
              setCreatedFormId(null);
              setTitle('');
              setDescription('');
              setFields([]);
            }}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Create Another
          </button>
          <a 
            href={formLink}
            target="_blank"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            View Form
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
              <div className="text-xs text-slate-500 line-clamp-2">
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
        {fields.map((field, index) => (
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
          <span className="w-full text-center text-sm text-slate-500 mb-2">Add a new question:</span>
          <button onClick={() => addField('text')} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">short_text</span> Short Answer
          </button>
          <button onClick={() => addField('textarea')} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">notes</span> Paragraph
          </button>
          <button onClick={() => addField('radio')} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">radio_button_checked</span> Multiple Choice
          </button>
          <button onClick={() => addField('checkbox')} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">check_box</span> Checkboxes
          </button>
          <button onClick={() => addField('select')} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">arrow_drop_down_circle</span> Dropdown
          </button>
          <button onClick={() => addField('file')} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:border-primary hover:text-primary transition-colors shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">attach_file</span> File Upload
          </button>
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
