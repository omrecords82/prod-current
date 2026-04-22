/**
 * ChildCard Component
 * 
 * A simple card wrapper component for displaying content in a card layout.
 * Used for wrapping child components in a Material-UI Card.
 */

import React from 'react';
import { Card, CardHeader, CardContent, Divider } from '@mui/material';

interface ChildCardProps {
  title?: string;
  children: React.ReactNode;
  codeModel?: React.ReactNode;
}

const ChildCard: React.FC<ChildCardProps> = ({ title, children, codeModel }) => (
  <Card sx={{ padding: 0, borderColor: (theme: any) => theme.palette.divider }} variant="outlined">
    {title ? (
      <>
        <CardHeader title={title} action={codeModel} />
        <Divider />
      </>
    ) : null}
    <CardContent>{children}</CardContent>
  </Card>
);

export default ChildCard;
