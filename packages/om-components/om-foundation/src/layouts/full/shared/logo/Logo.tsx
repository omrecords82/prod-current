import { FC, useContext } from 'react';

import { Link } from 'react-router-dom';
import { Box, styled, useTheme } from '@mui/material';
import config from '@/context/config';
import { CustomizerContext } from '@/context/CustomizerContext';


const Logo: FC = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;
  const theme = useTheme();
  const isMini = isCollapse == "mini-sidebar" && !isSidebarHover;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isMini ? '40px' : '180px',
    overflow: 'hidden',
    display: 'block',
  }));

  const crossColor = theme.palette.mode === 'dark' ? '#c9a44a' : '#6d4c1d';

  return (
    <LinkStyled to="/" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <svg
        width="28"
        height="38"
        viewBox="0 0 28 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Vertical beam */}
        <rect x="12" y="0" width="4" height="38" rx="0.5" fill={crossColor} />
        {/* Top bar (shortest) */}
        <rect x="8" y="5" width="12" height="3" rx="0.5" fill={crossColor} />
        {/* Middle bar (longest) */}
        <rect x="4" y="13" width="20" height="3" rx="0.5" fill={crossColor} />
        {/* Bottom slanted bar */}
        <line x1="6" y1="30" x2="22" y2="26" stroke={crossColor} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {!isMini && (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            backgroundColor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#2d1b4e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontWeight: 700,
            fontSize: '16px',
            letterSpacing: '1px',
            color: '#c9a44a',
          }}>
            OM
          </span>
        </Box>
      )}
    </LinkStyled>
  );
};

export default Logo;
