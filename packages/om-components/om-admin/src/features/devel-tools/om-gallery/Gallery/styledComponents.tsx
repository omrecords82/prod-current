import { Box, Card, CardMedia, Container, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';

export const GalleryContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  minHeight: '100vh',
}));

export const ThumbnailGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(2),
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(1),
  },
}));

export const ImageCard = styled(Card)<{ isUsed?: boolean }>(({ theme, isUsed }) => ({
  position: 'relative',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  ...(isUsed && {
    background: 'linear-gradient(90deg, rgba(200, 230, 201, 0.3) 0%, rgba(200, 230, 201, 0.1) 100%)',
    border: `2px solid rgba(76, 175, 80, 0.5)`,
  }),
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.shadows[8],
  },
}));

export const ImageThumbnail = styled(CardMedia)(({ theme }) => ({
  width: '100%',
  height: '150px',
  objectFit: 'cover',
  [theme.breakpoints.down('sm')]: {
    height: '120px',
  },
}));

export const CarouselContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  marginBottom: theme.spacing(4),
}));

export const CarouselButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#C8A24B' : '#C8A24B'}`,
  color: '#C8A24B',
  width: 56,
  height: 56,
  zIndex: 10,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(200, 162, 75, 0.2)' : 'rgba(200, 162, 75, 0.1)',
    borderColor: '#B8923A',
  },
  [theme.breakpoints.down('sm')]: {
    width: 44,
    height: 44,
  },
}));

export const CarouselImageContainer = styled(Box)<{ isUsed?: boolean }>(({ theme, isUsed }) => ({
  width: '100%',
  height: '400px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
  borderRadius: '8px',
  overflow: 'hidden',
  ...(isUsed && {
    background: 'linear-gradient(90deg, rgba(200, 230, 201, 0.3) 0%, rgba(200, 230, 201, 0.1) 100%)',
    border: `3px solid rgba(76, 175, 80, 0.6)`,
  }),
  [theme.breakpoints.down('md')]: {
    height: '300px',
  },
  [theme.breakpoints.down('sm')]: {
    height: '250px',
  },
}));
