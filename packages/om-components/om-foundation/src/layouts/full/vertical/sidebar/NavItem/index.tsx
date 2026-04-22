// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';

// mui imports
import {
  ListItemIcon,
  List,
  styled,
  ListItemText,
  Chip,
  useTheme,
  Typography,
  ListItemButton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CustomizerContext } from '@/context/CustomizerContext';
import { HelpOutline } from '@mui/icons-material';
import StateBadge from '@/shared/ui/StateBadge';

type NavGroup = {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: NavGroup[];
  chip?: string;
  chipColor?: any;
  variant?: string | any;
  external?: boolean;
  level?: number;
  onClick?: React.MouseEvent<HTMLButtonElement, MouseEvent>;
};

interface ItemType {
  item: NavGroup;
  hideMenu?: any;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  level?: number | any;
  pathDirect: string;
  badgeMap?: Map<string, any>;
}

const NavItem = ({ item, level, pathDirect, hideMenu, onClick, badgeMap }: ItemType) => {
  const { isBorderRadius } = useContext(CustomizerContext);

  const Icon = item?.icon || HelpOutline; // fallback to prevent crashes
  const theme = useTheme();
  const { t } = useTranslation();
  const itemIcon =
    level > 1 ? <Icon stroke={1.5} size="1rem" /> : <Icon stroke={1.5} size="1.3rem" />;

  const isDark = theme.palette.mode === 'dark';
  const isActive = pathDirect === item?.href;
  const ListItemStyled = styled(ListItemButton)(() => ({
    whiteSpace: 'nowrap',
    marginBottom: '2px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color:
      level > 1 && isActive
        ? (isDark ? '#d4af37' : '#2d1b4e')
        : isDark ? '#9ca3af' : '#6b7280',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 400,
    paddingLeft: hideMenu ? '10px' : level > 2 ? `${level * 15}px` : '10px',
    transition: 'color 0.15s ease, background-color 0.15s ease',
    '&:hover': {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(45, 27, 78, 0.04)',
      color: isDark ? '#f3f4f6' : '#2d1b4e',
    },
    '&.Mui-selected': {
      color: isDark ? '#d4af37' : '#2d1b4e',
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(45, 27, 78, 0.05)',
      fontWeight: 500,
      borderLeft: '2.5px solid',
      borderLeftColor: isDark ? '#d4af37' : '#2d1b4e',
      borderRadius: '0 6px 6px 0',
      '&:hover': {
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(45, 27, 78, 0.08)',
        color: isDark ? '#d4af37' : '#2d1b4e',
      },
    },
  }));

  const listItemProps: {
    component: any;
    href?: string;
    target?: any;
    to?: any;
  } = {
    component: item?.external ? 'a' : NavLink,
    to: item?.href,
    href: item?.external ? item?.href : '',
    target: item?.external ? '_blank' : '',
  };

  return (
    <List component="li" disablePadding key={item?.id && item.title}>
      <ListItemStyled
        {...listItemProps}
        disabled={item?.disabled}
        selected={pathDirect === item?.href}
        onClick={onClick}
      >
        <ListItemIcon
          sx={{
            minWidth: '36px',
            p: '3px 0',
            color: 'inherit',
            opacity: isActive ? 1 : 0.6,
            transition: 'opacity 0.15s ease',
          }}
        >
          {itemIcon}
        </ListItemIcon>
        <ListItemText>
          {hideMenu ? '' : <>{t(`${item?.title}`)}</>}
          <br />
          {item?.subtitle ? (
            <Typography variant="caption">{hideMenu ? '' : item?.subtitle}</Typography>
          ) : (
            ''
          )}
        </ListItemText>

        {hideMenu ? null : item?.badgeKey && badgeMap ? (
          <StateBadge badgeData={badgeMap.get(item.badgeKey)} />
        ) : item?.chip ? (
          <Chip
            color={item?.chipColor}
            variant="outlined"
            size="small"
            label={item?.chip}
            sx={{
              height: '20px',
              fontSize: '0.625rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              borderRadius: '4px',
            }}
          />
        ) : null}
      </ListItemStyled>
    </List>
  );
};

export default NavItem;
