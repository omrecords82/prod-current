/**
 * PageContainer Component
 * 
 * Container component for page content with title and description metadata.
 * Wraps page content and sets page title and meta description.
 */

import React from 'react';
import { Helmet } from 'react-helmet';

interface PageContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div>
      <Helmet>
        {title && <title>{title}</title>}
        {description && <meta name="description" content={description} />}
      </Helmet>
      {children}
    </div>
  );
};

export default PageContainer;
