import { Typography, Stack } from '@mui/material';
import * as dropdownData from './data';
import { Link } from 'react-router-dom';

const QuickLinks = () => {
  return (
    <>
      <Typography variant="h5">Quick Links</Typography>
      <Stack spacing={2} mt={2}>
        {dropdownData.pageLinks.map((pagelink, index) => {
          // [copilot-fix] Handle external URLs differently from internal routes
          const isExternalUrl = pagelink.href.startsWith('http://') || pagelink.href.startsWith('https://');
          
          if (isExternalUrl) {
            return (
              <a 
                href={pagelink.href} 
                key={index} 
                className="hover-text-primary"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Typography
                  variant="subtitle2"
                  color="textPrimary"
                  className="text-hover"
                  fontWeight={600}
                >
                  {pagelink.title}
                </Typography>
              </a>
            );
          } else {
            return (
              <Link to={pagelink.href} key={index} className="hover-text-primary">
                <Typography
                  variant="subtitle2"
                  color="textPrimary"
                  className="text-hover"
                  fontWeight={600}
                >
                  {pagelink.title}
                </Typography>
              </Link>
            );
          }
        })}
      </Stack>
    </>
  );
};

export default QuickLinks;
