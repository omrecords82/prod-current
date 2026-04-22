/**
 * Dialog state machine for SessionsTab.
 *
 * Replaces 6 separate useState dialog flags with a single discriminated union
 * (STATE_EXPLOSION refactor — OMD-838).
 */
import type { SessionData } from './logSearchTypes';

export type DialogState =
  | { kind: 'none' }
  | { kind: 'terminate'; session: SessionData }
  | { kind: 'terminateAll'; session: SessionData }
  | { kind: 'lockout'; session: SessionData }
  | { kind: 'cleanup' }
  | { kind: 'killAll' }
  | { kind: 'message'; session: SessionData };

export type DialogAction =
  | { type: 'open'; dialog: Exclude<DialogState, { kind: 'none' }> }
  | { type: 'close' };

export const initialDialogState: DialogState = { kind: 'none' };

export function dialogReducer(_state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'open':
      return action.dialog;
    case 'close':
      return { kind: 'none' };
  }
}
