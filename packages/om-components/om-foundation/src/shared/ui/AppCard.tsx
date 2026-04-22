/**
 * AppCard Component
 * 
 * Card component for app layouts with flex display.
 * Used for wrapping app content in a flexible card layout.
 */

import React, { useContext } from 'react';
import { Card } from '@mui/material';
import { CustomizerContext } from '@/context/CustomizerContext';

interface AppCardProps {
  children: React.ReactNode;
}

const AppCard: React.FC<AppCardProps> = ({ children }) => {
  const { isCardShadow } = useContext(CustomizerContext);

  return (
    <Card
      sx={{ display: 'flex', p: 0 }}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default AppCard;
