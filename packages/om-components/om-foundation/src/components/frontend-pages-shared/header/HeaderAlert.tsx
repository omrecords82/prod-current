import { useState } from 'react';
import { Box, Stack, Typography, Chip, IconButton } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { IconX } from '@tabler/icons-react';

const HeaderAlert = () => {
  const [isAlertVisible, setIsAlertVisible] = useState(true);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));

  const handleAlert = () => {
    setIsAlertVisible(false);
  };

  return (
    <>
      {isAlertVisible ? (
        <Box
          bgcolor="primary.main"
          borderRadius={0}
          textAlign="center"
          py="11px"
          position="relative"
          sx={{ overflow: 'hidden' }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing="16px"
            justifyContent="center"
            alignItems="center"
          >
            {lgUp ? (
              <Chip
                label="New"
                size="small"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  borderRadius: '8px',
                }}
              />
            ) : null}
            <Typography
              variant="body1"
              color="white"
              fontWeight={500}
              sx={{ opacity: '0.9' }}
              fontSize="13px"
            >
              Orthodox Metrics — Modern Church Record Management for Orthodox Parishes
            </Typography>
          </Stack>
          <IconButton
            onClick={handleAlert}
            color="secondary"
            sx={{
              zIndex: 1,
              position: 'absolute',
              right: '6px',
              top: '6px',
            }}
          >
            <IconX size={18} color="white" />
          </IconButton>
        </Box>
      ) : null}
    </>
  );
};

export default HeaderAlert;
