const baselightTheme = {
  direction: 'ltr',
  palette: {
    primary: {
      main: '#5D87FF',
      light: '#ECF2FF',
      dark: '#4570EA',
    },
    secondary: {
      main: '#49BEFF',
      light: '#E8F7FF',
      dark: '#23afdb',
    },
    success: {
      main: '#16A34A',
      light: '#F0FDF4',
      dark: '#15803D',
      contrastText: '#ffffff',
    },
    info: {
      main: '#2563EB',
      light: '#EFF6FF',
      dark: '#1D4ED8',
      contrastText: '#ffffff',
    },
    error: {
      main: '#DC2626',
      light: '#FEF2F2',
      dark: '#B91C1C',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#D97706',
      light: '#FFFBEB',
      dark: '#B45309',
      contrastText: '#ffffff',
    },
    purple: {
      A50: '#EBF3FE',
      A100: '#6610f2',
      A200: '#557fb9',
    },
    grey: {
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#374151',
    },
    text: {
      primary: '#111827',
      secondary: '#374151',
      disabled: '#9CA3AF',
    },
    action: {
      disabledBackground: 'rgba(73,82,88,0.12)',
      hoverOpacity: 0.04,
      hover: '#F9FAFB',
    },
    divider: '#E5E7EB',
    background: {
      default: '#F9FAFB',
      paper: '#ffffff',
    },
  },
};

const baseDarkTheme = {
  direction: 'ltr',
  palette: {
    primary: {
      main: '#5D87FF',
      light: '#ECF2FF',
      dark: '#4570EA',
    },
    secondary: {
      main: '#777e89',
      light: '#1C455D',
      dark: '#173f98',
    },
    success: {
      main: '#13DEB9',
      light: '#1B3C48',
      dark: '#02b3a9',
      contrastText: '#ffffff',
    },
    info: {
      main: '#539BFF',
      light: '#223662',
      dark: '#1682d4',
      contrastText: '#ffffff',
    },
    error: {
      main: '#FA896B',
      light: '#4B313D',
      dark: '#f3704d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#FFAE1F',
      light: '#4D3A2A',
      dark: '#ae8e59',
      contrastText: '#ffffff',
    },
    purple: {
      A50: '#EBF3FE',
      A100: '#6610f2',
      A200: '#557fb9',
    },
    grey: {
      100: '#333F55',
      200: '#465670',
      300: '#7C8FAC',
      400: '#DFE5EF',
      500: '#EAEFF4',
      600: '#F2F6FA',
    },
    text: {
      primary: '#EAEFF4',
      secondary: '#7C8FAC',
    },
    action: {
      disabledBackground: 'rgba(73,82,88,0.12)',
      hoverOpacity: 0.02,
      hover: '#333F55',
    },
    divider: '#333F55',
    background: {
      default: '#171c23',
      dark: '#171c23',
      paper: '#171c23',
    },
  },
};

export { baseDarkTheme, baselightTheme };
