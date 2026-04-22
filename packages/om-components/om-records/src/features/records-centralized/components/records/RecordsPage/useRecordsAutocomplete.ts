/**
 * useRecordsAutocomplete — Custom hook encapsulating autocomplete state,
 * field mapping, fetch logic, and cache management for record form fields.
 * Extracted from RecordsPage.tsx
 */
import { apiClient } from '@/api/utils/axiosInstance';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface AutocompleteMapping {
  apiEndpoint: string;
  dbColumn: string;
}

interface UseRecordsAutocompleteParams {
  selectedRecordType: string;
  selectedChurch: number;
}

interface UseRecordsAutocompleteReturn {
  acLoading: Record<string, boolean>;
  fetchAutocompleteSuggestions: (formFieldKey: string, inputValue: string) => void;
  getAcOptions: (formFieldKey: string, currentValue: string) => string[];
  getAcSuggestionsWithCount: (formFieldKey: string, currentValue: string) => { value: string; count: number }[];
}

export function useRecordsAutocomplete({
  selectedRecordType,
  selectedChurch,
}: UseRecordsAutocompleteParams): UseRecordsAutocompleteReturn {

  const AUTOCOMPLETE_FIELD_MAP: Record<string, Record<string, AutocompleteMapping>> = useMemo(() => ({
    baptism: {
      firstName:      { apiEndpoint: 'baptism', dbColumn: 'first_name' },
      lastName:       { apiEndpoint: 'baptism', dbColumn: 'last_name' },
      placeOfBirth:   { apiEndpoint: 'baptism', dbColumn: 'birthplace' },
      fatherName:     { apiEndpoint: 'baptism', dbColumn: 'parents' },
      motherName:     { apiEndpoint: 'baptism', dbColumn: 'parents' },
      godparentNames: { apiEndpoint: 'baptism', dbColumn: 'sponsors' },
    },
    marriage: {
      groomFirstName: { apiEndpoint: 'marriage', dbColumn: 'fname_groom' },
      groomLastName:  { apiEndpoint: 'marriage', dbColumn: 'lname_groom' },
      brideFirstName: { apiEndpoint: 'marriage', dbColumn: 'fname_bride' },
      brideLastName:  { apiEndpoint: 'marriage', dbColumn: 'lname_bride' },
      witness1:       { apiEndpoint: 'marriage', dbColumn: 'witness' },
      witness2:       { apiEndpoint: 'marriage', dbColumn: 'witness' },
      marriageLocation: { apiEndpoint: 'marriage', dbColumn: 'mlicense' },
    },
    funeral: {
      deceasedFirstName: { apiEndpoint: 'funeral', dbColumn: 'name' },
      deceasedLastName:  { apiEndpoint: 'funeral', dbColumn: 'lastname' },
      burialLocation:    { apiEndpoint: 'funeral', dbColumn: 'burial_location' },
    },
  }), []);

  // Suggestion cache: key = "endpoint:column:prefix" → array of {value, count}
  const [acSuggestions, setAcSuggestions] = useState<Record<string, { value: string; count: number }[]>>({});
  const [acLoading, setAcLoading] = useState<Record<string, boolean>>({});
  const acTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchAutocompleteSuggestions = useCallback((formFieldKey: string, inputValue: string) => {
    const mapping = AUTOCOMPLETE_FIELD_MAP[selectedRecordType]?.[formFieldKey];
    if (!mapping) return;

    const cacheKey = `${mapping.apiEndpoint}:${mapping.dbColumn}:${inputValue}`;

    // Already cached
    if (acSuggestions[cacheKey]) return;

    // Debounce per field
    if (acTimerRef.current[formFieldKey]) clearTimeout(acTimerRef.current[formFieldKey]);

    acTimerRef.current[formFieldKey] = setTimeout(async () => {
      setAcLoading(prev => ({ ...prev, [formFieldKey]: true }));
      try {
        const params = new URLSearchParams({
          column: mapping.dbColumn,
          prefix: inputValue,
          ...(selectedChurch && selectedChurch !== 0 ? { church_id: selectedChurch.toString() } : {}),
        });
        const data = await apiClient.get<any>(`/${mapping.apiEndpoint}-records/autocomplete?${params}`);
        setAcSuggestions(prev => ({ ...prev, [cacheKey]: data.suggestions || [] }));
      } catch (err) {
        console.warn('Autocomplete fetch failed:', err);
      } finally {
        setAcLoading(prev => ({ ...prev, [formFieldKey]: false }));
      }
    }, 200);
  }, [selectedRecordType, selectedChurch, AUTOCOMPLETE_FIELD_MAP, acSuggestions]);

  // Helper: get current suggestions for a form field based on its current input value
  const getAcOptions = useCallback((formFieldKey: string, currentValue: string): string[] => {
    const mapping = AUTOCOMPLETE_FIELD_MAP[selectedRecordType]?.[formFieldKey];
    if (!mapping) return [];
    const cacheKey = `${mapping.apiEndpoint}:${mapping.dbColumn}:${currentValue}`;
    const suggestions = acSuggestions[cacheKey];
    if (!suggestions) return [];
    return suggestions.map(s => s.value);
  }, [selectedRecordType, AUTOCOMPLETE_FIELD_MAP, acSuggestions]);

  // Helper: get suggestion with count for rendering option label
  const getAcSuggestionsWithCount = useCallback((formFieldKey: string, currentValue: string): { value: string; count: number }[] => {
    const mapping = AUTOCOMPLETE_FIELD_MAP[selectedRecordType]?.[formFieldKey];
    if (!mapping) return [];
    const cacheKey = `${mapping.apiEndpoint}:${mapping.dbColumn}:${currentValue}`;
    return acSuggestions[cacheKey] || [];
  }, [selectedRecordType, AUTOCOMPLETE_FIELD_MAP, acSuggestions]);

  // Clear autocomplete cache when record type or church changes
  useEffect(() => {
    setAcSuggestions({});
  }, [selectedRecordType, selectedChurch]);

  return {
    acLoading,
    fetchAutocompleteSuggestions,
    getAcOptions,
    getAcSuggestionsWithCount,
  };
}
