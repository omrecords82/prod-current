// project imports
import './DefaultColors';
import { Theme } from '@mui/material/styles';

const components: any = (theme: Theme) => {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          height: '100%',
          width: '100%',
        },
        a: {
          textDecoration: 'none',
        },
        body: {
          height: '100%',
          margin: 0,
          padding: 0,
        },
        '.ql-container.ql-snow, .ql-toolbar.ql-snow': {
          border: '0 !important', borderRadius: '7px'
        },
        '.ql-editor, .ql-snow *': {
          fontFamiy: 'inherit !important'
        },
        '#root': {
          height: '100%',
        },
        "*[dir='rtl'] .buyNowImg": {
          transform: 'scaleX(-1)',
        },
        '.border-none': {
          border: '0px',
          td: {
            border: '0px',
          },
        },
        'pre': {
          background: `${theme.palette.grey[100]} !important`,
        },
        '.btn-xs': {
          minWidth: '30px !important',
          width: '30px',
          height: '30px',
          borderRadius: '6px !important',
          padding: '0px !important',
        },
        '.hover-text-primary:hover .text-hover': {
          color: theme.palette.primary.main,
        },
        '.hoverCard:hover': {
          scale: '1.01',
          transition: ' 0.1s ease-in',
        },
        '.signup-bg': {
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
        },
        '.MuiBox-root': {
          borderRadius: theme.shape.borderRadius,
        },
        '.MuiCardHeader-action': {
          alignSelf: 'center !important',
        },
        '.emoji-picker-react .emoji-scroll-wrapper': {
          overflowX: 'hidden',
        },
        '.scrollbar-container': {
          borderRight: '0 !important',
        },
        '.theme-timeline .MuiTimelineOppositeContent-root': {
          minWidth: '90px',
        },
        '.MuiAlert-root .MuiAlert-icon': {
          color: 'inherit!important',
        },
        '.MuiTimelineConnector-root': {
          width: '1px !important',
        },
        ' .simplebar-scrollbar:before': {
          background: `${theme.palette.grey[300]} !important`,
        },
        '@keyframes gradient': {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: ' 100% 50%',
          },
          '100% ': {
            backgroundPosition: ' 0% 50%',
          },
        },
        '@keyframes slide': {
          '0%': {
            transform: 'translate3d(0, 0, 0)',
          },
          '100% ': {
            transform: 'translate3d(-2086px, 0, 0)',
          },
        },
        "@keyframes marquee": {
          "0%": {
            transform: "translateZ(0)",
          },
          "100%": {
            transform: "translate3d(-2086px,0,0)",
          },
        },
        "@keyframes marquee2": {
          "0%": {
            transform: "translate3d(-2086px,0,0)",
          },
          "100%": {
            transform: "translateZ(0)",
          },
        },
        "@keyframes marqueeRtl": {
          "0%": {
            transform: "translateZ(0)",
          },
          "100%": {
            transform: "translate3d(2086px,0,0)",
          },
        },
        "@keyframes marquee2Rtl": {
          "0%": {
            transform: "translate3d(2086px,0,0)",
          },
          "100%": {
            transform: "translateZ(0)",
          },
        },
      },
    },
    MuiButtonGroup: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          ':before': {
            backgroundColor: theme.palette.grey[100],
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 12,
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: theme.palette.divider,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
        sizeSmall: {
          width: 30,
          height: 30,
          minHeight: 30,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primary.main,
          },
        },
        colorPrimary: {
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: 'white',
          },
        },
        colorSecondary: {
          '&:hover': {
            backgroundColor: theme.palette.secondary.main,
            color: 'white',
          },
        },
        colorSuccess: {
          '&:hover': {
            backgroundColor: theme.palette.success.main,
            color: 'white',
          },
        },
        colorError: {
          '&:hover': {
            backgroundColor: theme.palette.error.main,
            color: 'white',
          },
        },
        colorWarning: {
          '&:hover': {
            backgroundColor: theme.palette.warning.main,
            color: 'white',
          },
        },
        colorInfo: {
          '&:hover': {
            backgroundColor: theme.palette.info.main,
            color: 'white',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: 'none',
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
        },
        text: {
          padding: '5px 15px',
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.04)',
          },
        },
        textPrimary: {
          color: theme.palette.primary.main,
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(93, 135, 255, 0.12)'
                : 'rgba(93, 135, 255, 0.08)',
          },
        },
        textSecondary: {
          color: theme.palette.secondary.main,
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(73, 190, 255, 0.12)'
                : 'rgba(73, 190, 255, 0.08)',
          },
        },
        textSuccess: {
          color: theme.palette.success.main,
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(19, 222, 185, 0.12)'
                : 'rgba(19, 222, 185, 0.08)',
          },
        },
        textError: {
          color: theme.palette.error.main,
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(250, 137, 107, 0.12)'
                : 'rgba(250, 137, 107, 0.08)',
          },
        },
        textInfo: {
          color: theme.palette.info.main,
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(83, 155, 255, 0.12)'
                : 'rgba(83, 155, 255, 0.08)',
          },
        },
        textWarning: {
          color: theme.palette.warning.main,
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255, 174, 31, 0.12)'
                : 'rgba(255, 174, 31, 0.08)',
          },
        },
        outlinedPrimary: {
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(93, 135, 255, 0.12)'
                : 'rgba(93, 135, 255, 0.08)',
          },
        },
        outlinedSecondary: {
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(73, 190, 255, 0.12)'
                : 'rgba(73, 190, 255, 0.08)',
          },
        },
        outlinedError: {
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(250, 137, 107, 0.12)'
                : 'rgba(250, 137, 107, 0.08)',
          },
        },
        outlinedSuccess: {
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(19, 222, 185, 0.12)'
                : 'rgba(19, 222, 185, 0.08)',
          },
        },
        outlinedInfo: {
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(83, 155, 255, 0.12)'
                : 'rgba(83, 155, 255, 0.08)',
          },
        },
        outlinedWarning: {
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255, 174, 31, 0.12)'
                : 'rgba(255, 174, 31, 0.08)',
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
        title: {
          fontSize: '1.125rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          width: '100%',
          padding: 0,
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 12,
          backgroundColor: theme.palette.background.paper,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${theme.palette.divider}`,
          padding: '12px 16px',
          fontSize: '0.875rem',
          color: theme.palette.text.secondary,
        },
        head: {
          fontWeight: 600,
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.grey[100],
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': {
            borderBottom: 0,
          },
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.04)'
              : theme.palette.grey[100],
          },
        },
      },
    },
    MuiGridItem: {
      styleOverrides: {
        root: {
          paddingTop: '30px',
          paddingLeft: '30px !important',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.grey[200],
          borderRadius: '6px',
        },
      },
    },
    MuiTimelineConnector: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.divider,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: 6,
        },
        colorSuccess: {
          backgroundColor: theme.palette.success.light,
          color: theme.palette.success.dark,
          border: `1px solid ${theme.palette.success.main}33`,
        },
        colorError: {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.dark,
          border: `1px solid ${theme.palette.error.main}33`,
        },
        colorWarning: {
          backgroundColor: theme.palette.warning.light,
          color: theme.palette.warning.dark,
          border: `1px solid ${theme.palette.warning.main}33`,
        },
        colorInfo: {
          backgroundColor: theme.palette.info.light,
          color: theme.palette.info.dark,
          border: `1px solid ${theme.palette.info.main}33`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        filledSuccess: {
          color: 'white',
        },
        filledInfo: {
          color: 'white',
        },
        filledError: {
          color: 'white',
        },
        filledWarning: {
          color: 'white',
        },
        standardSuccess: {
          backgroundColor: theme.palette.success.light,
          color: theme.palette.success.main,
        },
        standardError: {
          backgroundColor: theme.palette.error.light,
          color: theme.palette.error.main,
        },
        standardWarning: {
          backgroundColor: theme.palette.warning.light,
          color: theme.palette.warning.main,
        },
        standardInfo: {
          backgroundColor: theme.palette.info.light,
          color: theme.palette.info.main,
        },
        outlinedSuccess: {
          borderColor: theme.palette.success.main,
          color: theme.palette.success.main,
        },
        outlinedWarning: {
          borderColor: theme.palette.warning.main,
          color: theme.palette.warning.main,
        },
        outlinedError: {
          borderColor: theme.palette.error.main,
          color: theme.palette.error.main,
        },
        outlinedInfo: {
          borderColor: theme.palette.info.main,
          color: theme.palette.info.main,
        },
        successIcon: {
          color: theme.palette.info.main,
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          // Prevent Select/dropdown labels from truncating on narrow layouts
          minWidth: 140,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor:
              theme.palette.mode === 'dark' ? theme.palette.grey[200] : theme.palette.grey[300],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          }
        },
        input: {
          padding: '12px 14px',
        },
        inputSizeSmall: {
          padding: '8px 14px',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            padding: '4px 9px'
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: theme.palette.background.paper,
          background: theme.palette.text.primary,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderColor: `${theme.palette.divider}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          boxShadow: theme.shadows[9],
        },
      },
    },
  };
};
export default components;
