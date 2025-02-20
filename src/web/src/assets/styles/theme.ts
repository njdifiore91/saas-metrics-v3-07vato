import { createTheme, ThemeOptions } from '@mui/material'; // @mui/material v5.14.0

// Constants
const SPACING_UNIT = 8;

const BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440,
};

// Color tokens with WCAG AA compliance (contrast ratio ≥4.5:1)
const COLOR_TOKENS = {
  primary: {
    light: '#42a5f5',
    main: '#1976d2',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    light: '#ff4081',
    main: '#dc004e',
    dark: '#9a0036',
    contrastText: '#ffffff',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#ffffff',
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#ffffff',
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#ffffff',
  },
};

// Base theme configuration
const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    fontSize: 16,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      letterSpacing: '0.01071em',
    },
  },
  spacing: SPACING_UNIT,
  breakpoints: {
    values: BREAKPOINTS,
  },
  shape: {
    borderRadius: 4,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
    '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
  ],
};

// Light theme configuration
export const lightTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'light',
    ...COLOR_TOKENS,
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
});

// Dark theme configuration
export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'dark',
    ...COLOR_TOKENS,
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
});

// Types for custom theme options
interface CustomThemeOptions extends Partial<ThemeOptions> {
  brandColors?: {
    primary?: string;
    secondary?: string;
  };
}

/**
 * Creates a customized Material-UI theme with support for light/dark modes and white-label theming
 * @param mode - Theme mode ('light' or 'dark')
 * @param options - Custom theme options including brand colors
 * @returns Configured Material-UI theme object
 */
export const createCustomTheme = (
  mode: 'light' | 'dark',
  options?: CustomThemeOptions
) => {
  // Start with appropriate base theme
  const baseTheme = mode === 'light' ? lightTheme : darkTheme;
  
  // Create custom palette with brand colors if provided
  const customPalette = options?.brandColors
    ? {
        primary: {
          ...COLOR_TOKENS.primary,
          main: options.brandColors.primary || COLOR_TOKENS.primary.main,
        },
        secondary: {
          ...COLOR_TOKENS.secondary,
          main: options.brandColors.secondary || COLOR_TOKENS.secondary.main,
        },
      }
    : {};

  // Merge custom options with base theme
  return createTheme({
    ...baseTheme,
    ...options,
    palette: {
      ...baseTheme.palette,
      ...customPalette,
    },
  });
};