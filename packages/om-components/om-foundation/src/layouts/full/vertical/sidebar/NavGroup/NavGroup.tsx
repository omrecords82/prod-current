import { ListSubheader, styled, Theme } from '@mui/material';
import { IconDots } from '@tabler/icons-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

type NavGroup = {
  navlabel?: boolean;
  subheader?: string;
};

interface ItemType {
  item: NavGroup;
  hideMenu: string | boolean;
}

const NavGroup = ({ item, hideMenu }: ItemType) => {
  const ListSubheaderStyle = styled((props: Theme | any) => (
    <ListSubheader disableSticky {...props} />
  ))(({ theme }) => ({
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: '0.6875rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: theme.palette.mode === 'dark' ? '#6b7280' : '#9ca3af',
    lineHeight: '26px',
    marginTop: theme.spacing(2.5),
    marginBottom: theme.spacing(0.5),
    padding: '3px 12px',
    marginLeft: hideMenu ? '' : '-10px',
  }));

  return (
    <ListSubheaderStyle>{hideMenu ? <IconDots size="14" /> : item?.subheader}</ListSubheaderStyle>
  );
};

export default NavGroup;
