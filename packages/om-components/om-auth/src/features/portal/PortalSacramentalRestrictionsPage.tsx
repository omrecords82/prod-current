/**
 * PortalSacramentalRestrictionsPage.tsx
 *
 * Portal wrapper for the sacramental date restrictions viewer.
 * Rendered inside ChurchPortalLayout (which provides HpHeader, footer, etc.).
 */

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import SacramentalRestrictionsViewer from '@/shared/components/SacramentalRestrictionsViewer';

const PortalSacramentalRestrictionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button
          startIcon={<IconArrowLeft size={18} />}
          onClick={() => navigate('/portal')}
          size="small"
        >
          {t('portal.restrictions_back')}
        </Button>
      </Box>

      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('portal.restrictions_title')}
      </Typography>

      <SacramentalRestrictionsViewer />
    </Box>
  );
};

export default PortalSacramentalRestrictionsPage;
