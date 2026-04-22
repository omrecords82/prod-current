import { apiClient } from './utils/axiosInstance';

export interface FabPosition {
  right: number;
  bottom: number;
}

export interface UiPreferences {
  fabPositions?: Record<string, FabPosition>;
}

export async function loadUiPreferences(): Promise<UiPreferences> {
  const res = await apiClient.get('/my/ui-preferences');
  return res.data?.data ?? {};
}

export async function saveUiPreferences(prefs: UiPreferences): Promise<void> {
  await apiClient.put('/my/ui-preferences', prefs);
}
