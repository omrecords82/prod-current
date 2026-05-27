import NoteContent from '@/components/apps/notes/NoteContent';
import NoteSidebar from '@/components/apps/notes/NoteSidebar';
import { NotesProvider } from '@/context/NotesContext';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from '@/shared/ui/AppCard';
import PageContainer from '@/shared/ui/PageContainer';
import { Box, useMediaQuery } from '@mui/material';
import { useState } from 'react';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Notes',
  },
];

const Notes = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));


  return (
    <NotesProvider>
      <PageContainer title="Note App" description="this is Note App">
        <Breadcrumb title="Note app" items={BCrumb} />
        <AppCard>
          {lgDown ?
            <NoteSidebar
              isMobileSidebarOpen={isMobileSidebarOpen}
              onSidebarClose={() => setMobileSidebarOpen(false)}
            />
            : <NoteSidebar
              isMobileSidebarOpen={true}
              onSidebarClose={() => setMobileSidebarOpen(false)}
            />}

          <Box flexGrow={1}>
            <NoteContent toggleNoteSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)} />
          </Box>
        </AppCard>
      </PageContainer>
    </NotesProvider>
  );
};

export default Notes;
