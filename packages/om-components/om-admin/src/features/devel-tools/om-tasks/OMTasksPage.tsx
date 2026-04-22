/**
 * OMTasksPage.tsx
 * Main page for OMAI Task Assignment management
 * Located at /devel-tools/om-tasks
 */

import React from 'react';
import { Box } from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import OMAITaskAssignmentWidget from './components/OMAITaskAssignmentWidget';

const OMTasksPage: React.FC = () => {
  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/devel-tools', title: 'Developer Tools' },
    { title: 'OM Tasks' },
  ];

  return (
    <PageContainer title="OMAI Task Assignment" description="Manage OMAI task links, submissions, and activity logs">
      <Breadcrumb title="OMAI Task Assignment" items={BCrumb} />
      <Box p={3}>
        <Box sx={{ minHeight: '80vh' }}>
          <OMAITaskAssignmentWidget />
        </Box>
      </Box>
    </PageContainer>
  );
};

export default OMTasksPage;

