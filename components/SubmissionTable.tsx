'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

type FieldType = 'text' | 'number' | 'checkbox' | 'radio' | 'select' | 'textarea' | 'file';
type FilterOperator = 'contains' | 'equals' | '>' | '<' | '>=' | '<=' | 'between';
type Filter = { field: string; operator: FilterOperator; value: any };
type FilterKind = 'text' | 'select' | 'number' | 'date';
type DraftValue = string | { start?: string; end?: string; min?: string; max?: string };
type SortDirection = 'asc' | 'desc';

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  studentRoll: string;
  createdAt: string;
  data: unknown;
}

interface NormalizedSubmission extends Submission {
  payload: Record<string, unknown>;
  submittedAtMs: number;
  searchText: string;
}

interface FilterDefinition {
  id: string;
  label: string;
  kind: FilterKind;
  operators: FilterOperator[];
  options?: string[];
  getValue: (submission: NormalizedSubmission) => unknown;
  sortable?: boolean;
}

interface SortOption {
  value: string;
  label: string;
}

const TEXT_FILTER_OPERATORS: FilterOperator[] = ['contains', 'equals'];
const SELECT_FILTER_OPERATORS: FilterOperator[] = ['equals'];
const NUMBER_FILTER_OPERATORS: FilterOperator[] = ['equals', '>', '<', '>=', '<=', 'between'];
const DATE_FILTER_OPERATORS: FilterOperator[] = ['between', '>=', '<='];

export default function SubmissionTable({
  submissions,
  formFields,
  formTitle,
  formDescription,
}: {
  submissions: Submission[];
  formFields: FormField[];
  formTitle: string;
  formDescription?: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('submittedAt:desc');
  const [isFilterComposerOpen, setIsFilterComposerOpen] = useState(false);
  const [draftField, setDraftField] = useState('submittedAt');
  const [draftOperator, setDraftOperator] = useState<FilterOperator>('between');
  const [draftValue, setDraftValue] = useState<DraftValue>({ start: '', end: '' });
  const [aiQuery, setAiQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSummary, setAiSummary] = useState('');

  const normalizedSubmissions = useMemo<NormalizedSubmission[]>(() => {
    return submissions.map((submission) => {
      const payload = parsePayload(submission.data);
      return {
        ...submission,
        payload,
        submittedAtMs: new Date(submission.createdAt).getTime(),
        searchText: `${submission.studentName} ${submission.studentEmail}`.toLowerCase(),
      };
    });
  }, [submissions]);

  const formFieldLabelMap = useMemo(() => {
    return new Map(formFields.map((field) => [field.id, field.label]));
  }, [formFields]);

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const definitions: FilterDefinition[] = [
      {
        id: 'submittedAt',
        label: 'Submitted Date',
        kind: 'date',
        operators: DATE_FILTER_OPERATORS,
        getValue: (submission) => submission.createdAt,
        sortable: true,
      },
      {
        id: 'studentRoll',
        label: 'Roll Number',
        kind: 'number',
        operators: NUMBER_FILTER_OPERATORS,
        getValue: (submission) => submission.studentRoll,
        sortable: true,
      },
    ];

    for (const field of formFields) {
      const descriptor = buildFieldDefinition(field, normalizedSubmissions);
      if (descriptor) {
        definitions.push(descriptor);
      }
    }

    return definitions;
  }, [formFields, normalizedSubmissions]);

  const filterDefinitionMap = useMemo(
    () => new Map(filterDefinitions.map((definition) => [definition.id, definition])),
    [filterDefinitions]
  );

  const aiFilterDefinitions = useMemo(
    () =>
      filterDefinitions.map(({ id, label, kind, operators, options, sortable }) => ({
        id,
        label,
        kind,
        operators,
        options,
        sortable,
      })),
    [filterDefinitions]
  );

  const sortOptions = useMemo<SortOption[]>(() => {
    const options: SortOption[] = [
      { value: 'submittedAt:desc', label: 'Newest First' },
      { value: 'submittedAt:asc', label: 'Oldest First' },
      { value: 'studentRoll:asc', label: 'Roll Number Low to High' },
      { value: 'studentRoll:desc', label: 'Roll Number High to Low' },
    ];

    for (const definition of filterDefinitions) {
      if (!definition.sortable || definition.id === 'submittedAt' || definition.id === 'studentRoll') {
        continue;
      }

      if (definition.kind === 'number') {
        options.push(
          { value: `${definition.id}:desc`, label: `${definition.label} High to Low` },
          { value: `${definition.id}:asc`, label: `${definition.label} Low to High` }
        );
      }

      if (definition.kind === 'date') {
        options.push(
          { value: `${definition.id}:desc`, label: `${definition.label} Newest First` },
          { value: `${definition.id}:asc`, label: `${definition.label} Oldest First` }
        );
      }
    }

    return options;
  }, [filterDefinitions]);

  const filteredSubmissions = useMemo(() => {
    const visible = normalizedSubmissions.filter((submission) =>
      filters.every((filter) => evaluateFilter(submission, filter, filterDefinitionMap))
    );

    const [sortField, direction] = sortBy.split(':') as [string, SortDirection];
    const sortDefinition = filterDefinitionMap.get(sortField);
    const sorted = [...visible];

    sorted.sort((leftSubmission, rightSubmission) => {
      const leftValue = getSortableValue(leftSubmission, sortField, sortDefinition);
      const rightValue = getSortableValue(rightSubmission, sortField, sortDefinition);

      if (leftValue === rightValue) {
        return 0;
      }

      if (direction === 'asc') {
        return leftValue > rightValue ? 1 : -1;
      }

      return leftValue < rightValue ? 1 : -1;
    });

    return sorted;
  }, [filterDefinitionMap, filters, normalizedSubmissions, sortBy]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const withoutSearch = current.filter((filter) => filter.field !== 'search');
        const value = searchInput.trim();
        return value ? [...withoutSearch, { field: 'search', operator: 'contains', value }] : withoutSearch;
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const definition = filterDefinitionMap.get(draftField);
    const nextOperator = definition?.operators[0] || 'equals';
    setDraftOperator(nextOperator);
    setDraftValue(getEmptyDraftValue(definition?.kind || 'text', nextOperator, definition?.options));
  }, [draftField, filterDefinitionMap]);

  useEffect(() => {
    const definition = filterDefinitionMap.get(draftField);
    if (!definition) return;
    setDraftValue(getEmptyDraftValue(definition.kind, draftOperator, definition.options));
  }, [draftField, draftOperator, filterDefinitionMap]);

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const addFilter = () => {
    const definition = filterDefinitionMap.get(draftField);
    if (!definition) return;

    const nextFilter = buildDraftFilter(definition, draftOperator, draftValue);
    if (!nextFilter) return;

    setFilters((current) => {
      const alreadyExists = current.some(
        (filter) =>
          filter.field === nextFilter.field &&
          filter.operator === nextFilter.operator &&
          JSON.stringify(filter.value) === JSON.stringify(nextFilter.value)
      );

      return alreadyExists ? current : [...current, nextFilter];
    });

    setDraftValue(getEmptyDraftValue(definition.kind, draftOperator, definition.options));
    setIsFilterComposerOpen(true);
  };

  const removeFilter = (indexToRemove: number) => {
    setFilters((current) => {
      const filterToRemove = current[indexToRemove];
      if (filterToRemove?.field === 'search') {
        setSearchInput('');
      }
      return current.filter((_, index) => index !== indexToRemove);
    });
  };

  const clearAllFilters = () => {
    setFilters([]);
    setSearchInput('');
  };

  const applyAiSearch = async () => {
    const query = aiQuery.trim();
    if (!query) return;

    setIsAiSearching(true);
    setAiError('');
    setAiSummary('');

    try {
      const response = await fetch('/api/submission-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          formTitle,
          formDescription,
          filterDefinitions: aiFilterDefinitions,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        filters?: Filter[];
        sort?: { field?: string; direction?: SortDirection } | null;
        summary?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse the AI search query.');
      }

      const nextFilters = Array.isArray(data.filters) ? data.filters : [];
      const searchFilter = nextFilters.find(
        (filter) => filter.field === 'search' && typeof filter.value === 'string'
      );
      const nonSearchFilters = nextFilters.filter((filter) => filter.field !== 'search');
      const hasMeaningfulResult =
        nonSearchFilters.length > 0 ||
        Boolean(searchFilter?.value) ||
        Boolean(data.sort?.field && data.sort?.direction);

      if (!hasMeaningfulResult) {
        setAiError("I couldn't map that request to the current form fields. Try mentioning exact field concepts like year, category, status, CGPA, budget, or date.");
        return;
      }

      setFilters(nonSearchFilters);
      setSearchInput(searchFilter?.value ? String(searchFilter.value) : '');

      if (data.sort?.field && (data.sort.direction === 'asc' || data.sort.direction === 'desc')) {
        setSortBy(`${data.sort.field}:${data.sort.direction}`);
      }

      setAiSummary(
        typeof data.summary === 'string' && data.summary.trim()
          ? data.summary
          : `Applied ${nonSearchFilters.length + (searchFilter?.value ? 1 : 0)} AI filter${nonSearchFilters.length + (searchFilter?.value ? 1 : 0) === 1 ? '' : 's'}.`
      );
      setIsFilterComposerOpen(false);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to parse the AI search query.');
    } finally {
      setIsAiSearching(false);
    }
  };

  const hasFilters = filters.length > 0;
  const availableDraftDefinition = filterDefinitionMap.get(draftField);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                auto_awesome
              </span>
              <input
                value={aiQuery}
                onChange={(event) => setAiQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void applyAiSearch();
                  }
                }}
                placeholder="Search with AI, e.g. third year students with CGPA above 7.5"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <button
              type="button"
              onClick={() => void applyAiSearch()}
              disabled={isAiSearching || !aiQuery.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAiSearching ? 'Applying AI Search...' : 'Search With AI'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Uses your current AI provider to translate natural language into structured filters for this form.
          </p>
          {aiError ? (
            <p className="mt-2 text-sm text-red-600">{aiError}</p>
          ) : aiSummary ? (
            <p className="mt-2 text-sm text-emerald-600">{aiSummary}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
            <div className="relative w-full md:max-w-sm">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                search
              </span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by student name or email"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFilterComposerOpen((current) => !current)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                isFilterComposerOpen || hasFilters
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              Add Filter
            </button>

            <div className="w-full md:w-60">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              disabled={!hasFilters}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear All
            </button>
          </div>

          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900">{filteredSubmissions.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{submissions.length}</span> submissions
          </div>
        </div>

        {isFilterComposerOpen && availableDraftDefinition && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <select
                value={draftField}
                onChange={(event) => setDraftField(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                {filterDefinitions.map((definition) => (
                  <option key={definition.id} value={definition.id}>
                    {definition.label}
                  </option>
                ))}
              </select>

              <select
                value={draftOperator}
                onChange={(event) => setDraftOperator(event.target.value as FilterOperator)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                {availableDraftDefinition.operators.map((operator) => (
                  <option key={operator} value={operator}>
                    {getOperatorLabel(operator)}
                  </option>
                ))}
              </select>

              <div className="md:col-span-2">
                {renderDraftInput(availableDraftDefinition, draftOperator, draftValue, setDraftValue)}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Filters stack with AND logic, so you can keep adding multiple relevant conditions.
              </p>
              <button
                type="button"
                onClick={addFilter}
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
              >
                Add Filter
              </button>
            </div>
          </div>
        )}

        {hasFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((filter, index) => (
              <button
                key={`${filter.field}-${filter.operator}-${index}`}
                type="button"
                onClick={() => removeFilter(index)}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
              >
                <span>{formatChipLabel(filter, filterDefinitionMap)}</span>
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Student Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Roll No.</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Email</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Submitted At</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  {submissions.length === 0 ? 'No submissions yet.' : 'No submissions match the current filters.'}
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((submission) => (
                <Fragment key={submission.id}>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => toggleExpand(submission.id)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{submission.studentName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{submission.studentRoll}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{submission.studentEmail}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(submission.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpand(submission.id);
                        }}
                        className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {expandedId === submission.id ? 'Hide Response' : 'View Response'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === submission.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <h4 className="mb-3 font-semibold text-slate-900">Form Response</h4>
                          <div className="space-y-3">
                            {Object.entries(submission.payload).length === 0 ? (
                              <div className="text-sm text-slate-500">No answers</div>
                            ) : (
                              Object.entries(submission.payload).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3">
                                  <div className="min-w-36 text-xs font-medium text-slate-500">
                                    {formFieldLabelMap.get(key) || key}
                                  </div>
                                  <div className="text-sm text-slate-800">
                                    {Array.isArray(value) ? (
                                      value.length ? value.join(', ') : <span className="text-slate-500">Empty</span>
                                    ) : typeof value === 'string' ? (
                                      isUrl(value) ? (
                                        <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                          Open document
                                        </a>
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

function buildFieldDefinition(field: FormField, submissions: NormalizedSubmission[]): FilterDefinition | null {
  if (!isRelevantField(field)) {
    return null;
  }

  const values = submissions
    .map((submission) => getSubmissionFieldValue(submission.payload, field))
    .filter((value) => value !== undefined && value !== null);

  const uniqueTextOptions = Array.from(
    new Set(
      values
        .map((value) => stringifyValue(value))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).slice(0, 20);

  if (isDateField(field)) {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'date',
      operators: DATE_FILTER_OPERATORS,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
      sortable: true,
    };
  }

  if (field.type === 'number') {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'number',
      operators: NUMBER_FILTER_OPERATORS,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
      sortable: true,
    };
  }

  if (field.type === 'select' || field.type === 'radio') {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'select',
      operators: SELECT_FILTER_OPERATORS,
      options: field.options?.length ? field.options : uniqueTextOptions,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
    };
  }

  if (shouldUseSelectForTextField(field, uniqueTextOptions)) {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'select',
      operators: SELECT_FILTER_OPERATORS,
      options: uniqueTextOptions,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
    };
  }

  return {
    id: `field:${field.id}`,
    label: field.label,
    kind: 'text',
    operators: TEXT_FILTER_OPERATORS,
    getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
  };
}

function isRelevantField(field: FormField) {
  const label = normalizeKey(field.label);

  if (field.type === 'textarea' || field.type === 'file' || isLinkLikeField(label)) {
    return false;
  }

  if (field.type === 'number' || field.type === 'select' || field.type === 'radio') {
    return true;
  }

  if (isDateField(field)) {
    return true;
  }

  const relevantTextTokens = [
    'academic year',
    'year',
    'class',
    'specialization',
    'panel',
    'category',
    'status',
    'type',
    'meeting',
    'club',
    'faculty',
    'spoc',
    'prn',
    'erp',
    'student name',
    'name',
    'email',
    'contact',
    'title',
  ];

  return relevantTextTokens.some((token) => label.includes(token));
}

function isDateField(field: FormField) {
  const label = normalizeKey(field.label);
  return label.includes('date') || label.includes('dob');
}

function shouldUseSelectForTextField(field: FormField, options: string[]) {
  const label = normalizeKey(field.label);
  const categoricalTokens = ['academic year', 'year', 'class', 'specialization', 'panel', 'category', 'status', 'type'];
  return options.length > 0 && options.length <= 12 && categoricalTokens.some((token) => label.includes(token));
}

function isLinkLikeField(label: string) {
  const linkTokens = ['link', 'upload', 'document', 'proof', 'report', 'poster', 'website', 'evidence', 'synopsis'];
  return linkTokens.some((token) => label.includes(token));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePayload(data: unknown): Record<string, unknown> {
  if (isRecord(data)) return data;

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => stringifyValue(item)).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
}

function getSubmissionFieldValue(payload: Record<string, unknown>, field: Pick<FormField, 'id' | 'label'>) {
  if (field.id in payload) {
    return payload[field.id];
  }

  if (field.label in payload) {
    return payload[field.label];
  }

  const normalizedLabel = normalizeKey(field.label);

  for (const [key, value] of Object.entries(payload)) {
    if (normalizeKey(key) === normalizedLabel) {
      return value;
    }
  }

  return undefined;
}

function toComparableNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toComparableDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function getStartOfDay(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function getEndOfDay(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function getEmptyDraftValue(kind: FilterKind, operator: FilterOperator, options?: string[]): DraftValue {
  if (kind === 'date' && operator === 'between') {
    return { start: '', end: '' };
  }

  if (kind === 'number' && operator === 'between') {
    return { min: '', max: '' };
  }

  if (kind === 'select' && options?.length) {
    return options[0];
  }

  return '';
}

function buildDraftFilter(
  definition: FilterDefinition,
  operator: FilterOperator,
  draftValue: DraftValue
): Filter | null {
  if (definition.kind === 'date') {
    if (operator === 'between' && typeof draftValue !== 'string') {
      const start = draftValue.start?.trim();
      const end = draftValue.end?.trim();
      return start && end ? { field: definition.id, operator, value: { start, end } } : null;
    }

    return typeof draftValue === 'string' && draftValue.trim()
      ? { field: definition.id, operator, value: draftValue.trim() }
      : null;
  }

  if (definition.kind === 'number') {
    if (operator === 'between' && typeof draftValue !== 'string') {
      const min = draftValue.min?.trim();
      const max = draftValue.max?.trim();
      return min && max ? { field: definition.id, operator, value: { min, max } } : null;
    }

    return typeof draftValue === 'string' && draftValue.trim()
      ? { field: definition.id, operator, value: Number(draftValue) }
      : null;
  }

  if (typeof draftValue === 'string' && draftValue.trim()) {
    return { field: definition.id, operator, value: draftValue.trim() };
  }

  return null;
}

function evaluateFilter(
  submission: NormalizedSubmission,
  filter: Filter,
  filterDefinitionMap: Map<string, FilterDefinition>
) {
  if (filter.field === 'search') {
    const query = String(filter.value || '').toLowerCase().trim();
    return submission.searchText.includes(query);
  }

  const definition = filterDefinitionMap.get(filter.field);
  if (!definition) return true;

  const rawValue = definition.getValue(submission);

  if (definition.kind === 'text' || definition.kind === 'select') {
    const source = stringifyValue(rawValue).toLowerCase();
    const target = String(filter.value || '').toLowerCase();
    if (!target) return true;
    return filter.operator === 'equals' ? source === target : source.includes(target);
  }

  if (definition.kind === 'number') {
    const source = toComparableNumber(rawValue);
    if (source === null) return false;

    if (filter.operator === 'between' && isRecord(filter.value)) {
      const min = Number(filter.value.min);
      const max = Number(filter.value.max);
      if (Number.isNaN(min) || Number.isNaN(max)) return true;
      return source >= min && source <= max;
    }

    const target = Number(filter.value);
    if (Number.isNaN(target)) return true;
    return compareNumbers(source, filter.operator, target);
  }

  const source = filter.field === 'submittedAt' ? submission.submittedAtMs : toComparableDate(rawValue);
  if (source === null || Number.isNaN(source)) return false;

  if (filter.operator === 'between' && isRecord(filter.value)) {
    const start = getStartOfDay(String(filter.value.start || ''));
    const end = getEndOfDay(String(filter.value.end || ''));
    if (start === null || end === null) return true;
    return source >= start && source <= end;
  }

  const target = filter.operator === '>=' ? getStartOfDay(String(filter.value || '')) : getEndOfDay(String(filter.value || ''));
  if (target === null) return true;
  return compareNumbers(source, filter.operator, target);
}

function compareNumbers(source: number, operator: FilterOperator, target: number) {
  switch (operator) {
    case 'equals':
      return source === target;
    case '>':
      return source > target;
    case '<':
      return source < target;
    case '>=':
      return source >= target;
    case '<=':
      return source <= target;
    default:
      return true;
  }
}

function getSortableValue(
  submission: NormalizedSubmission,
  sortField: string,
  definition?: FilterDefinition
) {
  if (sortField === 'submittedAt') {
    return submission.submittedAtMs;
  }

  if (sortField === 'studentRoll') {
    return toComparableNumber(submission.studentRoll) ?? Number.NEGATIVE_INFINITY;
  }

  if (!definition) {
    return Number.NEGATIVE_INFINITY;
  }

  const value = definition.getValue(submission);

  if (definition.kind === 'number') {
    return toComparableNumber(value) ?? Number.NEGATIVE_INFINITY;
  }

  if (definition.kind === 'date') {
    return toComparableDate(value) ?? Number.NEGATIVE_INFINITY;
  }

  return stringifyValue(value).toLowerCase();
}

function getOperatorLabel(operator: FilterOperator) {
  const labels: Record<FilterOperator, string> = {
    contains: 'contains',
    equals: 'equals',
    '>': 'greater than',
    '<': 'less than',
    '>=': 'greater than or equal',
    '<=': 'less than or equal',
    between: 'between',
  };

  return labels[operator];
}

function formatChipLabel(filter: Filter, filterDefinitionMap: Map<string, FilterDefinition>) {
  if (filter.field === 'search') {
    return `Search: ${filter.value}`;
  }

  const definition = filterDefinitionMap.get(filter.field);
  const label = definition?.label || filter.field;

  if (filter.operator === 'between' && isRecord(filter.value)) {
    if ('start' in filter.value || 'end' in filter.value) {
      return `${label} between ${filter.value.start || '...'} and ${filter.value.end || '...'}`;
    }

    return `${label} between ${filter.value.min || '...'} and ${filter.value.max || '...'}`;
  }

  return `${label} ${getOperatorLabel(filter.operator)} ${String(filter.value)}`;
}

function renderDraftInput(
  definition: FilterDefinition,
  operator: FilterOperator,
  value: DraftValue,
  setValue: (value: DraftValue) => void
) {
  if (definition.kind === 'select') {
    return (
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        {definition.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (definition.kind === 'number' && operator === 'between' && typeof value !== 'string') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          value={value.min || ''}
          onChange={(event) => setValue({ ...value, min: event.target.value })}
          placeholder={`Min ${definition.label.toLowerCase()}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
        <input
          type="number"
          value={value.max || ''}
          onChange={(event) => setValue({ ...value, max: event.target.value })}
          placeholder={`Max ${definition.label.toLowerCase()}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>
    );
  }

  if (definition.kind === 'date' && operator === 'between' && typeof value !== 'string') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={value.start || ''}
          onChange={(event) => setValue({ ...value, start: event.target.value })}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
        <input
          type="date"
          value={value.end || ''}
          onChange={(event) => setValue({ ...value, end: event.target.value })}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>
    );
  }

  if (definition.kind === 'date') {
    return (
      <input
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    );
  }

  return (
    <input
      type={definition.kind === 'number' ? 'number' : 'text'}
      step={definition.kind === 'number' ? '0.01' : undefined}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => setValue(event.target.value)}
      placeholder={`Enter ${definition.label.toLowerCase()}`}
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
    />
  );
}

function isUrl(val: string) {
  return (
    typeof val === 'string' &&
    (val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('/uploads/') ||
      /\.(pdf|docx?|xlsx?|png|jpg|jpeg|gif|pptx?)$/i.test(val))
  );
}
