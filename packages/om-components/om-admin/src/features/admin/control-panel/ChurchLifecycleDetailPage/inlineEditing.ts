/**
 * inlineEditing — small reducer for the inline edit slots in
 * ChurchLifecycleDetailPage (discovery notes + blockers).
 *
 * Drains 4 useStates (STATE_EXPLOSION refactor — OMD-842).
 */

export interface InlineEditingState {
  editingDiscovery: boolean;
  discoveryDraft: string;
  editingBlockers: boolean;
  blockersDraft: string;
}

export const initialInlineEditingState: InlineEditingState = {
  editingDiscovery: false,
  discoveryDraft: '',
  editingBlockers: false,
  blockersDraft: '',
};

export type InlineEditingAction =
  | { type: 'setEditingDiscovery'; value: boolean }
  | { type: 'setDiscoveryDraft'; value: string }
  | { type: 'setEditingBlockers'; value: boolean }
  | { type: 'setBlockersDraft'; value: string };

export function inlineEditingReducer(
  state: InlineEditingState,
  action: InlineEditingAction,
): InlineEditingState {
  switch (action.type) {
    case 'setEditingDiscovery':
      return { ...state, editingDiscovery: action.value };
    case 'setDiscoveryDraft':
      return { ...state, discoveryDraft: action.value };
    case 'setEditingBlockers':
      return { ...state, editingBlockers: action.value };
    case 'setBlockersDraft':
      return { ...state, blockersDraft: action.value };
  }
}
