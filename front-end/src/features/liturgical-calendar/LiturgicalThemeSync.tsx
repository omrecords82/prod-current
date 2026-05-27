/**
 * LiturgicalThemeSync — thin component that syncs site theme with liturgical color.
 * Must be rendered inside both AuthProvider and CustomizerContextProvider.
 */

import { useAuth } from '@/context/AuthContext';
import React from 'react';
import { useLiturgicalAutoTheme } from './hooks/useLiturgicalAutoTheme';

const LiturgicalThemeSync: React.FC = () => {
  const { authenticated } = useAuth();
  useLiturgicalAutoTheme(authenticated);
  return null;
};

export default LiturgicalThemeSync;
