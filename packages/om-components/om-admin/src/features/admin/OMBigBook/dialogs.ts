/**
 * Dialog state machine for OMBigBook.
 *
 * Replaces 7 separate useStates (4 dialog open flags + 3 payload states)
 * with a single discriminated union (STATE_EXPLOSION refactor — OMD-840).
 */
import type { FileUpload } from './types';

export type BigBookDialogState =
  | { kind: 'none' }
  | { kind: 'questionnairePreview'; file: FileUpload }
  | { kind: 'tsxWizard'; file: File | null }
  | { kind: 'training' }
  | { kind: 'foundationDetails'; foundation: any };

export type BigBookDialogAction =
  | { type: 'open'; dialog: Exclude<BigBookDialogState, { kind: 'none' }> }
  | { type: 'close' };

export const initialBigBookDialogState: BigBookDialogState = { kind: 'none' };

export function bigBookDialogReducer(
  _state: BigBookDialogState,
  action: BigBookDialogAction,
): BigBookDialogState {
  switch (action.type) {
    case 'open':
      return action.dialog;
    case 'close':
      return { kind: 'none' };
  }
}
