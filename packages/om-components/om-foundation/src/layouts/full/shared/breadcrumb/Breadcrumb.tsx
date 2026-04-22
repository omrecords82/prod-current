import React from 'react';
import { Box, Breadcrumbs } from '@mui/material';
import { NavLink } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';

interface BreadCrumbType {
  subtitle?: string;
  items?: any[];
  title: string;
  children?: any;
}

const Breadcrumb = ({ subtitle, items, title, children }: BreadCrumbType) => (
  <div className="om-breadcrumb">
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box>
        <h2 className="om-page-title">{title}</h2>
        {subtitle && <p className="om-page-subtitle">{subtitle}</p>}
        <Breadcrumbs
          separator={
            <IconChevronRight
              size={14}
              style={{ opacity: 0.4 }}
            />
          }
          sx={{ mt: items ? '0.5rem' : 0 }}
          aria-label="breadcrumb"
        >
          {items
            ? items.map((item) => (
              <span key={item.title}>
                {item.to ? (
                  <NavLink to={item.to} className="om-breadcrumb-link">
                    {item.title}
                  </NavLink>
                ) : (
                  <span className="om-breadcrumb-active">{item.title}</span>
                )}
              </span>
            ))
            : ''}
        </Breadcrumbs>
      </Box>
      {children && (
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
          {children}
        </Box>
      )}
    </Box>
  </div>
);

export default Breadcrumb;
