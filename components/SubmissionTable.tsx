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

interface VisibleColumn {
  id: string;
  label: string;
  getValue: (submission: NormalizedSubmission) => unknown;
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
      const payloadSearch = Object.values(payload).map((value) => stringifyValue(value)).join(' ');
      return {
        ...submission,
        payload,
        submittedAtMs: new Date(submission.createdAt).getTime(),
        searchText: `${submission.studentName} ${submission.studentEmail} ${submission.studentRoll} ${payloadSearch}`.toLowerCase(),
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

    const { field: sortField, direction } = parseSortBy(sortBy);
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

  const visibleColumns = useMemo<VisibleColumn[]>(() => {
    const selectedFields = selectImportantFields(formFields, formTitle, normalizedSubmissions).slice(0, 6);
    return selectedFields.map((field) => ({
      id: field.id,
      label: field.label,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
    }));
  }, [formFields, formTitle, normalizedSubmissions]);

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
        const fallback = parseLocalStructuredFilters(query, aiFilterDefinitions);
        if (fallback && fallback.filters.length > 0) {
          const fallbackSearch = fallback.filters.find(
            (filter) => filter.field === 'search' && typeof filter.value === 'string'
          );
          const fallbackNonSearch = fallback.filters.filter((filter) => filter.field !== 'search');
          setFilters(fallbackNonSearch);
          setSearchInput(fallbackSearch?.value ? String(fallbackSearch.value) : '');
          setAiSummary(fallback.summary);
          setIsFilterComposerOpen(false);
          return;
        }

        const hintLabels = filterDefinitions
          .filter((definition) => definition.id !== 'submittedAt' && definition.id !== 'studentRoll')
          .slice(0, 6)
          .map((definition) => definition.label);
        const hintText = hintLabels.length ? ` Try mentioning one of these fields: ${hintLabels.join(', ')}.` : '';
        setAiError(`I couldn't map that request to the available filters.${hintText}`);
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
              {visibleColumns.map((column) => (
                <th key={column.id} className="px-6 py-4 text-sm font-semibold text-slate-700">
                  {column.label}
                </th>
              ))}
              <th className="px-6 py-4 text-sm font-semibold text-slate-700">Submitted At</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={5 + visibleColumns.length} className="px-6 py-12 text-center text-sm text-slate-500">
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
                    {visibleColumns.map((column) => {
                      const value = column.getValue(submission);
                      return (
                        <td key={`${submission.id}-${column.id}`} className="px-6 py-4 text-sm text-slate-700">
                          {formatCellValue(value)}
                        </td>
                      );
                    })}
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
                      <td colSpan={5 + visibleColumns.length} className="px-6 py-4">
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
  const label = normalizeKey(field.label);
  if (field.type === 'textarea' || field.type === 'file' || isLinkLikeField(label)) return null;

  const values = submissions
    .map((submission) => getSubmissionFieldValue(submission.payload, field))
    .filter((value) => value !== undefined && value !== null);

  const stringValues = values
    .map((value) => stringifyValue(value))
    .map((value) => value.trim())
    .filter(Boolean);
  if (stringValues.length === 0) return null;

  const uniqueTextOptions = Array.from(new Set(stringValues)).slice(0, 20);

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

  if (field.type === 'checkbox') {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'text',
      operators: TEXT_FILTER_OPERATORS,
      options: field.options?.length ? field.options : uniqueTextOptions,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
    };
  }

  const numericCandidates = stringValues.map((value) => toComparableNumber(value)).filter((value) => value !== null);
  const numericCoverage = numericCandidates.length / stringValues.length;
  if (numericCandidates.length >= 5 && numericCoverage >= 0.7) {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'number',
      operators: NUMBER_FILTER_OPERATORS,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
      sortable: true,
    };
  }

  const dateCandidates = stringValues.map((value) => toComparableDate(value)).filter((value) => value !== null);
  const dateCoverage = dateCandidates.length / stringValues.length;
  if (dateCandidates.length >= 5 && dateCoverage >= 0.7) {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'date',
      operators: DATE_FILTER_OPERATORS,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
      sortable: true,
    };
  }

  const uniqueCount = new Set(stringValues).size;
  const uniqueRatio = uniqueCount / stringValues.length;

  if (uniqueCount > 0 && uniqueCount <= 20 && uniqueRatio <= 0.75) {
    return {
      id: `field:${field.id}`,
      label: field.label,
      kind: 'select',
      operators: SELECT_FILTER_OPERATORS,
      options: uniqueTextOptions,
      getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
    };
  }

  if (stringValues.length >= 10 && uniqueRatio > 0.85 && uniqueCount > 20) {
    return null;
  }

  return {
    id: `field:${field.id}`,
    label: field.label,
    kind: 'text',
    operators: TEXT_FILTER_OPERATORS,
    getValue: (submission) => getSubmissionFieldValue(submission.payload, field),
  };
}

function isDateField(field: FormField) {
  const label = normalizeKey(field.label);
  return label.includes('date') || label.includes('dob');
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
    const normalized = value.toLowerCase().replace(/[,₹$]/g, ' ').trim();
    const match = normalized.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    let parsed = Number(match[0]);
    if (!Number.isFinite(parsed)) return null;
    if (/\bcrore\b|\bcr\b/.test(normalized)) parsed *= 100;
    else if (/\blakh\b|\blac\b|\blpa\b/.test(normalized)) parsed *= 1;
    return parsed;
  }
  return null;
}

function parseSortBy(value: string): { field: string; direction: SortDirection } {
  const lastColon = value.lastIndexOf(':');
  if (lastColon <= 0) {
    return { field: 'submittedAt', direction: 'desc' };
  }

  const field = value.slice(0, lastColon);
  const rawDirection = value.slice(lastColon + 1);
  const direction: SortDirection = rawDirection === 'asc' ? 'asc' : 'desc';
  return { field, direction };
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

function formatCellValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item)).join(', ') : '—';
  }
  if (typeof value === 'string') {
    if (!value.trim()) return '—';
    if (isUrl(value)) {
      return (
        <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Open
        </a>
      );
    }
    return value;
  }
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return '—';
  return JSON.stringify(value);
}

function selectImportantFields(
  formFields: FormField[],
  formTitle: string,
  submissions: NormalizedSubmission[]
) {
  const title = normalizeKey(formTitle || '');
  const labels = formFields.map((field) => ({ field, label: normalizeKey(field.label) }));
  const has = (tokens: string[]) => labels.some(({ label }) => tokens.some((token) => label.includes(token)));
  const pickByTokens = (tokens: string[]) => {
    const picked: FormField[] = [];
    for (const token of tokens) {
      const match = labels.find(({ field, label }) => label.includes(token) && !picked.some((p) => p.id === field.id));
      if (match) picked.push(match.field);
    }
    return picked;
  };

  let priorityTokens: string[] = [];
  if (title.includes('placement') || has(['package', 'ctc', 'job role'])) {
    priorityTokens = ['company', 'organization', 'job role', 'role', 'package', 'ctc', 'specialisation', 'specialization', 'offer date', 'placement type'];
  } else if (title.includes('academic') || has(['cgpa', 'backlog', 'attendance'])) {
    priorityTokens = ['cgpa', 'placement status', 'internship', 'backlog', 'attendance', 'skills', 'department'];
  } else if (title.includes('event') || has(['budget', 'revenue'])) {
    priorityTokens = ['event details', 'category', 'budget', 'revenue', 'duration', 'date', 'club'];
  } else if (title.includes('internship') || has(['stipend', 'internship mode'])) {
    priorityTokens = ['company', 'organization', 'role', 'domain', 'stipend', 'duration', 'start date', 'end date'];
  } else if (title.includes('research') || title.includes('seminar') || title.includes('capstone') || has(['keywords', 'abstract'])) {
    priorityTokens = ['project title', 'title', 'keywords', 'paper published', 'semester', 'specialisation', 'batch'];
  } else {
    priorityTokens = ['category', 'status', 'year', 'type', 'company', 'role', 'date'];
  }

  const selected: FormField[] = [];
  for (const field of pickByTokens(priorityTokens)) {
    if (!selected.some((item) => item.id === field.id) && !isLinkLikeField(normalizeKey(field.label)) && field.type !== 'file') {
      selected.push(field);
    }
  }

  if (selected.length < 5) {
    const withSignal = formFields
      .filter((field) => !selected.some((item) => item.id === field.id) && field.type !== 'file' && !isLinkLikeField(normalizeKey(field.label)))
      .map((field) => {
        const populated = submissions.filter((submission) => {
          const value = getSubmissionFieldValue(submission.payload, field);
          return value !== null && value !== undefined && stringifyValue(value).trim() !== '';
        }).length;
        return { field, populated };
      })
      .filter((row) => row.populated > 0)
      .sort((a, b) => b.populated - a.populated);

    for (const row of withSignal) {
      if (selected.length >= 7) break;
      selected.push(row.field);
    }
  }

  return selected.slice(0, 7);
}

function parseLocalStructuredFilters(
  query: string,
  filterDefinitions: Array<{
    id: string;
    label: string;
    kind: FilterKind;
    operators: FilterOperator[];
    options?: string[];
  }>
) {
  const raw = query.trim();
  if (!raw) return null;
  const q = raw.toLowerCase();
  const filters: Filter[] = [];

  const numMatch = q.match(/(-?\d+(\.\d+)?)/);
  const betweenMatch = q.match(/between\s+(-?\d+(\.\d+)?)\s+(and|to)\s+(-?\d+(\.\d+)?)/);
  const comparator: FilterOperator | null =
    betweenMatch
      ? 'between'
      : /(above|greater than|more than|over)\b/.test(q)
        ? '>'
        : /(below|less than|under)\b/.test(q)
          ? '<'
          : /(at least|minimum|>=)\b/.test(q)
            ? '>='
            : /(at most|maximum|<=)\b/.test(q)
              ? '<='
              : null;

  const sortedDefs = [...filterDefinitions].sort((a, b) => b.label.length - a.label.length);
  for (const definition of sortedDefs) {
    const label = definition.label.toLowerCase();
    const labelTokens = label.split(/\s+/).filter((token) => token.length > 2);
    const labelMatched =
      q.includes(label) ||
      labelTokens.some((token) => q.includes(token)) ||
      (label.includes('package') && q.includes('lpa')) ||
      (label.includes('ctc') && q.includes('lpa'));

    if (!labelMatched) continue;

    if (definition.kind === 'number' && comparator && definition.operators.includes(comparator)) {
      if (comparator === 'between' && betweenMatch && definition.operators.includes('between')) {
        filters.push({
          field: definition.id,
          operator: 'between',
          value: { min: Number(betweenMatch[1]), max: Number(betweenMatch[4]) },
        });
        continue;
      }
      if (numMatch) {
        filters.push({ field: definition.id, operator: comparator, value: Number(numMatch[1]) });
        continue;
      }
    }

    if ((definition.kind === 'select' || definition.kind === 'text') && definition.options?.length) {
      const matchedOption = definition.options.find((option) => q.includes(option.toLowerCase()));
      if (matchedOption) {
        filters.push({ field: definition.id, operator: 'equals', value: matchedOption });
      }
    }
  }

  if (filters.length === 0) {
    return {
      filters: [{ field: 'search', operator: 'contains', value: raw }],
      summary: 'Applied fallback text search filter.',
    };
  }

  return {
    filters,
    summary: `Applied ${filters.length} fallback structured filter${filters.length === 1 ? '' : 's'}.`,
  };
}
