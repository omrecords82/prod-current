import { useEffect, useRef, useState } from 'react';
import { IconArrowUp } from '@tabler/icons-react';
import { Box, Fab } from '@mui/material';
import { useDraggableFab } from '@/hooks/useDraggableFab';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { dragProps, positionSx, wrapClick } = useDraggableFab({
    fabId: 'scroll-to-top',
    defaultRight: 30,
    defaultBottom: 30,
  });

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <>
      {isVisible ? (
        <Box
          ref={dragProps.ref}
          onMouseDown={dragProps.onMouseDown}
          onTouchStart={dragProps.onTouchStart}
          sx={{ ...positionSx, zIndex: 1300 }}
        >
          <Fab
            color="primary"
            onClick={wrapClick(scrollToTop)}
          >
            <IconArrowUp size={24} />
          </Fab>
        </Box>
      ) : null}
    </>
  );
};

export default ScrollToTop;
