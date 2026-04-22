import {

  Close as CloseIcon,

} from '@mui/icons-material';

import {

  Box,

  Dialog,

  Drawer,

  Fab,

  IconButton,

  Stack,

  SvgIcon,

  Typography,

  useMediaQuery,

  useTheme,

} from '@mui/material';

import type { SvgIconProps } from '@mui/material';



/** Ichthys (ΙΧΘΥΣ) — early Christian fish symbol */

const IchthysIcon: React.FC<SvgIconProps> = (props) => (

  <SvgIcon viewBox="0 0 24 24" {...props}>

    <path

      d="M1 12 C6 6, 14 4, 23 12 C14 20, 6 18, 1 12 Z"

      fill="none"

      stroke="currentColor"

      strokeWidth={1.8}

      strokeLinejoin="round"

    />

    <circle cx="18" cy="11" r="1.2" fill="currentColor" />

    <path

      d="M23 12 L20 8 M23 12 L20 16"

      fill="none"

      stroke="currentColor"

      strokeWidth={1.8}

      strokeLinecap="round"

      strokeLinejoin="round"

    />

  </SvgIcon>

);

import React, { Component, useEffect, useState } from 'react';

import { apiClient } from '@/api/utils/axiosInstance';

import { useDraggableFab } from '@/hooks/useDraggableFab';

import type { OmAssistantProps } from './omAssistant.types';

import OmAssistantInput from './OmAssistantInput';

import OmAssistantMessages from './OmAssistantMessages';

import { useOmAssistant } from './useOmAssistant';



const DRAWER_WIDTH = 380;



/** Error boundary so a crash in OmAssistant never takes down the page */

class OmAssistantErrorBoundary extends Component<

  { children: React.ReactNode },

  { hasError: boolean }

> {

  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(err: Error) { console.error('[OmAssistant] render error:', err); }

  render() { return this.state.hasError ? null : this.props.children; }

}



function OmAssistantInner({ pageContext }: OmAssistantProps) {

  const [open, setOpen] = useState(false);

  const [enabled, setEnabled] = useState<boolean | null>(null);

  const { messages, isLoading, sendMessage } = useOmAssistant(pageContext);

  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));



  // Check feature flag on mount — default to showing the assistant

  useEffect(() => {

    if (!pageContext.churchId) {

      setEnabled(true);

      return;

    }

    let cancelled = false;

    apiClient

      .get<any>(`/churches/${pageContext.churchId}/features`)

      .then((res: any) => {

        const flags = res?.data?.effective || res?.effective || res?.features || {};

        if (!cancelled) setEnabled(flags.om_assistant_enabled !== false);

      })

      .catch((err: any) => {

        console.warn('[OmAssistant] Feature check failed, defaulting to enabled:', err?.message || err);

        if (!cancelled) setEnabled(true);

      });

    return () => { cancelled = true; };

  }, [pageContext.churchId]);



  const { dragProps, positionSx, wrapClick } = useDraggableFab({
    fabId: 'om-assistant',
    defaultRight: 24,
    defaultBottom: isMobile ? 80 : 88,
  });

  if (enabled === false) return null;



  const handleClose = () => setOpen(false);



  const chatContent = (

    <>

      {/* Header */}

      <Stack

        direction="row"

        alignItems="center"

        justifyContent="space-between"

        sx={{

          px: 2,

          py: 1.5,

          bgcolor: 'primary.main',

          color: 'primary.contrastText',

          flexShrink: 0,

        }}

      >

        <Stack direction="row" alignItems="center" spacing={1}>

          <IchthysIcon fontSize="small" />

          <Typography variant="subtitle2" fontWeight={600}>OM Assistant</Typography>

        </Stack>

        <IconButton size="small" onClick={handleClose} sx={{ color: 'inherit' }}>

          <CloseIcon fontSize="small" />

        </IconButton>

      </Stack>



      {/* Messages — fills remaining space */}

      <OmAssistantMessages messages={messages} isLoading={isLoading} context={pageContext} />



      {/* Input — pinned to bottom */}

      <OmAssistantInput onSend={sendMessage} disabled={isLoading} context={pageContext} />

    </>

  );



  return (

    <>

      {isMobile ? (

        <Dialog fullScreen open={open} onClose={handleClose}>

          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {chatContent}

          </Box>

        </Dialog>

      ) : (

        <Drawer

          anchor="right"

          open={open}

          onClose={handleClose}

          PaperProps={{

            sx: {

              width: DRAWER_WIDTH,

              display: 'flex',

              flexDirection: 'column',

            },

          }}

        >

          {chatContent}

        </Drawer>

      )}



      {/* FAB — draggable positioning */}

      <Box
        ref={dragProps.ref}
        onMouseDown={dragProps.onMouseDown}
        onTouchStart={dragProps.onTouchStart}
        sx={{ ...positionSx, zIndex: 1301 }}
      >

        <Fab

          color="primary"

          onClick={wrapClick(() => setOpen(prev => !prev))}

          aria-label="Open OM Assistant"

          size={isMobile ? 'small' : 'medium'}

        >

          <IchthysIcon />

        </Fab>

      </Box>

    </>

  );

}



export default function OmAssistant(props: OmAssistantProps) {

  return (

    <OmAssistantErrorBoundary>

      <OmAssistantInner {...props} />

    </OmAssistantErrorBoundary>

  );

}

