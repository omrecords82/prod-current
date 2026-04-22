/**
 * LiturgicalThemeSync — thin component that syncs site theme with liturgical color.
 * Must be rendered inside both AuthProvider and CustomizerContextProvider.
 */

import { useAuth } from '@/context/AuthContext';
import { useLiturgicalAutoTheme } from './hooks/useLiturgicalAutoTheme';

export function LiturgicalThemeSync() {
  const { authenticated } = useAuth();
  useLiturgicalAutoTheme(authenticated);
  return null;
}
