/**
 * DashboardCard Component
 * 
 * Card component for displaying dashboard content with title, subtitle, and actions.
 * Used for consistent card styling across dashboard pages.
 */

import React, { useContext } from 'react';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import { CustomizerContext } from '@/context/CustomizerContext';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  cardheading?: boolean;
  headtitle?: string;
  headsubtitle?: string;
  children?: React.ReactNode;
  middlecontent?: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  children,
  action,
  footer,
  cardheading,
  headtitle,
  headsubtitle,
  middlecontent,
}) => {
  const { isCardShadow } = useContext(CustomizerContext);
  const theme = useTheme();
  const borderColor = theme.palette.grey[200];

  return (
    <Card
      sx={{ padding: 0, border: !isCardShadow ? `1px solid ${borderColor}` : 'none' }}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      {cardheading ? (
        <CardContent>
          <Typography variant="h5">{headtitle}</Typography>
          <Typography variant="subtitle2" color="textSecondary">
            {headsubtitle}
          </Typography>
        </CardContent>
      ) : (
        <CardContent sx={{ p: '30px' }}>
          {title ? (
            <Stack
              direction="row"
              spacing={2}
              justifyContent="space-between"
              alignItems={'center'}
              mb={3}
            >
              <Box>
                {title ? <Typography variant="h5">{title}</Typography> : ''}
                {subtitle ? (
                  <Typography variant="subtitle2" color="textSecondary">
                    {subtitle}
                  </Typography>
                ) : null}
              </Box>
              {action}
            </Stack>
          ) : null}
          {children}
        </CardContent>
      )}
      {middlecontent}
      {footer}
    </Card>
  );
};

export default DashboardCard;
