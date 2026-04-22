import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import { IconUser, IconLogout } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface PortalNavLink {
  title: string;
  to: string;
}

const portalLinks: PortalNavLink[] = [
  { title: 'Portal', to: '/portal' },
  { title: 'Church Records', to: '/portal/records/baptism' },
  { title: 'Analytics', to: '/portal/charts' },
  { title: 'Help', to: '/portal/guide' },
];

const PortalNavigations: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/auth/login');
  };

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || '?'
    : '?';

  return (
    <div className="flex items-center gap-8">
      {portalLinks.map((link) => {
        const isActive = link.to === '/portal'
          ? pathname === '/portal'
          : link.to.startsWith('/account')
            ? pathname.startsWith('/account')
            : pathname.startsWith(link.to);
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={`font-['Inter'] text-[15px] transition-colors no-underline relative pb-1 ${
              isActive
                ? 'text-[#2d1b4e] dark:text-white font-medium after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2d1b4e] dark:after:bg-[#d4af37] after:rounded-sm'
                : 'text-[#4a5565] dark:text-gray-400 hover:text-[#2d1b4e] dark:hover:text-white'
            }`}
          >
            {link.title}
          </NavLink>
        );
      })}

      {/* User menu */}
      <button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        className="flex items-center gap-2 font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 hover:text-[#2d1b4e] dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent p-0"
      >
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[0.75rem] font-medium bg-[rgba(45,27,78,0.08)] dark:bg-[rgba(212,175,55,0.15)] text-[#2d1b4e] dark:text-[#d4af37] border border-[rgba(45,27,78,0.12)] dark:border-[rgba(212,175,55,0.25)]">
          {initials}
        </span>
        User
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/account/profile'); }}>
          <ListItemIcon><IconUser size={18} /></ListItemIcon>
          My Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><IconLogout size={18} /></ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>
    </div>
  );
};

export default PortalNavigations;
