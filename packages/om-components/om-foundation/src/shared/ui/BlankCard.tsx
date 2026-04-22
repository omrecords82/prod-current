/**
 * BlankCard Component
 * 
 * A simple card wrapper component with no padding or default content.
 * Used for wrapping content in a Material-UI Card without default styling.
 */

import React, { useContext } from 'react';
import { useTheme } from '@mui/material/styles';
import { Card } from '@mui/material';
import { CustomizerContext } from '@/context/CustomizerContext';

interface BlankCardProps {
  className?: string;
  children: React.ReactNode;
  sx?: any;
}

const BlankCard: React.FC<BlankCardProps> = ({ children, className, sx }) => {
  const { isCardShadow } = useContext(CustomizerContext);
  const theme = useTheme();
  const borderColor = theme.palette.grey[200];

  return (
    <Card
      sx={{ 
        p: 0, 
        border: !isCardShadow ? `1px solid ${borderColor}` : 'none', 
        position: 'relative',
        ...sx 
      }}
      className={className}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default BlankCard;
