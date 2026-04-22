/**
 * Bind dialog form state machine for PageImageIndex.
 *
 * Replaces 7 separate useStates (open + 6 form fields) with a single
 * reducer (STATE_EXPLOSION refactor — OMD-841).
 */

export interface BindFormState {
  open: boolean;
  pageKey: string;
  imageKey: string;
  scope: 'global' | 'church';
  churchId: number | null;
  imagePath: string;
  notes: string;
}

export type BindFormAction =
  | { type: 'open'; pageKey: string }
  | { type: 'close' }
  | { type: 'setPageKey'; value: string }
  | { type: 'setImageKey'; value: string }
  | { type: 'setScope'; value: 'global' | 'church' }
  | { type: 'setChurchId'; value: number | null }
  | { type: 'setImagePath'; value: string }
  | { type: 'setNotes'; value: string };

export const initialBindFormState: BindFormState = {
  open: false,
  pageKey: '',
  imageKey: '',
  scope: 'global',
  churchId: null,
  imagePath: '',
  notes: '',
};

export function bindFormReducer(state: BindFormState, action: BindFormAction): BindFormState {
  switch (action.type) {
    case 'open':
      return {
        open: true,
        pageKey: action.pageKey,
        imageKey: '',
        scope: 'global',
        churchId: null,
        imagePath: '',
        notes: '',
      };
    case 'close':
      return { ...state, open: false };
    case 'setPageKey':
      return { ...state, pageKey: action.value };
    case 'setImageKey':
      return { ...state, imageKey: action.value };
    case 'setScope':
      return { ...state, scope: action.value };
    case 'setChurchId':
      return { ...state, churchId: action.value };
    case 'setImagePath':
      return { ...state, imagePath: action.value };
    case 'setNotes':
      return { ...state, notes: action.value };
  }
}
