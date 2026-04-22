import { Box, Typography } from '@mui/material';
import 'slick-carousel/slick/slick.css';
import { useTheme } from '@mui/material/styles';

import user1 from '@/assets/images/frontend-pages/homepage/user1.jpg';

const LeaderShipCarousel = () => {
  const theme = useTheme();

  return (
    <Box display="flex" justifyContent="center">
      <Box sx={{ maxWidth: 270 }}>
        <img src={user1} alt="Nectarios Parsells" width={270} height={290} style={{ borderRadius: '16px' }} />
        <Box
          sx={{
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : 'white',
            maxWidth: 'calc(100% - 51px)',
            marginLeft: '15px',
            borderRadius: '8px',
            marginTop: '-30px !important',
            boxShadow: '0px 6px 12px rgba(127, 145, 156, 0.12)',
            marginBottom: '10px',
            px: '10px',
            py: '16px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Typography variant="h5" mb={1}>
            Nectarios Parsells
          </Typography>
          <Typography variant="body1">Founder</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LeaderShipCarousel;
