import React from 'react';
import { Box, Typography, List } from '@mui/material';

interface JobListProps {
  jobs?: any[];
  onSelectJob?: (jobId: string) => void;
  [key: string]: any;
}

const JobList: React.FC<JobListProps> = ({ jobs = [], onSelectJob, ...props }) => {
  return (
    <Box {...props}>
      <Typography variant="subtitle2" gutterBottom>OCR Jobs</Typography>
      {jobs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No jobs yet</Typography>
      ) : (
        <List>{/* Job items render here */}</List>
      )}
    </Box>
  );
};

export default JobList;
