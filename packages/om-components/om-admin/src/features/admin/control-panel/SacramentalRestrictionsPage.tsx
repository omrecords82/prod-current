/**
 * SacramentalRestrictionsPage.tsx
 *
 * Admin wrapper for the sacramental date restrictions viewer.
 */

import React from 'react';
import { Box, IconButton } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import SacramentalRestrictionsViewer from '@/shared/components/SacramentalRestrictionsViewer';

const SacramentalRestrictionsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer title="Sacramental Date Restrictions" description="View Orthodox sacramental date restrictions">
      <Breadcrumb
        title="Sacramental Date Restrictions"
        items={[
          { to: '/admin/control-panel', title: 'Control Panel' },
          { to: '/admin/control-panel/church-management', title: 'Church Management' },
          { title: 'Sacramental Date Restrictions' },
        ]}
      />

      <Box sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/admin/control-panel/church-management')} size="small">
          <BackIcon />
        </IconButton>
      </Box>

      <SacramentalRestrictionsViewer />
    </PageContainer>
  );
};

export default SacramentalRestrictionsPage;
