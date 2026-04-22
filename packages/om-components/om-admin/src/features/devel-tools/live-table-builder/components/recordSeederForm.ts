/**
 * Form state machine for the RecordSeeder dev tool.
 *
 * Collapses 5 form-field useStates into a single reducer
 * (STATE_EXPLOSION refactor — OMD-839).
 */

export interface SeederFormState {
  expanded: boolean;
  recordType: string;
  count: number;
  yearStart: number;
  yearEnd: number;
}

export type SeederFormAction =
  | { type: 'toggleExpanded' }
  | { type: 'setExpanded'; value: boolean }
  | { type: 'setRecordType'; value: string }
  | { type: 'setCount'; value: number }
  | { type: 'setYearRange'; start: number; end: number };

export const initialSeederFormState: SeederFormState = {
  expanded: false,
  recordType: 'baptism',
  count: 25,
  yearStart: 1960,
  yearEnd: 2024,
};

export function seederFormReducer(state: SeederFormState, action: SeederFormAction): SeederFormState {
  switch (action.type) {
    case 'toggleExpanded':
      return { ...state, expanded: !state.expanded };
    case 'setExpanded':
      return { ...state, expanded: action.value };
    case 'setRecordType':
      return { ...state, recordType: action.value };
    case 'setCount':
      return { ...state, count: action.value };
    case 'setYearRange':
      return { ...state, yearStart: action.start, yearEnd: action.end };
  }
}
