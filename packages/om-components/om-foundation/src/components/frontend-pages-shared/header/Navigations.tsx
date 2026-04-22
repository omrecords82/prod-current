import { Chip } from '@mui/material';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import { NavLink, useLocation } from 'react-router-dom';
import { PUBLIC_NAV_LINKS } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';

export const NavLinks = PUBLIC_NAV_LINKS.map((link) => ({
  tKey: link.tKey,
  to: link.to,
  new: false as boolean,
}));

const StyledButton = styled(Button)(({ theme }) => ({
  fontSize: '15px',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  '&.active': {
    backgroundColor: 'rgba(200, 162, 75, 0.12)',
    color: theme.palette.primary.main,
  },
}));

const Navigations = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { t } = useLanguage();

  return (
    <>
      {NavLinks.map((navlink, i) => (
        <StyledButton
          className={pathname === navlink.to ? 'active' : 'not-active'}
          variant="text"
          key={i}
          component={NavLink}
          to={navlink.to}
        >
          {t(navlink.tKey)}
          {navlink.new ? (
            <Chip
              label="New"
              size="small"
              sx={{
                ml: '6px',
                borderRadius: '8px',
                color: 'primary.main',
                backgroundColor: 'rgba(200, 162, 75, 0.12)',
              }}
            />
          ) : null}
        </StyledButton>
      ))}
    </>
  );
};

export default Navigations;
