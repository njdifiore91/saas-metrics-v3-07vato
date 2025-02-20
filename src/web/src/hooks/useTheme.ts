import { useMediaQuery, Theme } from '@mui/material'; // @mui/material v5.14.0
import { useCallback, useState, useEffect } from 'react'; // react v18.2.0
import { lightTheme, darkTheme } from '../assets/styles/theme';

// Storage key for persisting theme preference
const THEME_STORAGE_KEY = 'theme-mode';

// Type for theme mode
type ThemeMode = 'light' | 'dark';

/**
 * Custom hook for managing theme preferences with WCAG compliance and system preference detection
 * @returns Object containing current theme, dark mode status, and theme toggle function
 */
export const useTheme = () => {
  // Check system preference for dark mode
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Get initial theme from localStorage or system preference
  const getInitialTheme = (): ThemeMode => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }
    return prefersDarkMode ? 'dark' : 'light';
  };

  // Initialize theme state
  const [mode, setMode] = useState<ThemeMode>(getInitialTheme);

  // Determine current theme object based on mode
  const theme: Theme = mode === 'dark' ? darkTheme : lightTheme;

  // Validate WCAG contrast ratios
  const validateContrastRatios = (theme: Theme) => {
    const { palette } = theme;
    const contrastRatios = {
      primary: getContrastRatio(palette.primary.main, palette.background.default),
      secondary: getContrastRatio(palette.secondary.main, palette.background.default),
      text: getContrastRatio(palette.text.primary, palette.background.default),
    };

    // Log warnings for any contrast issues (WCAG AA requires 4.5:1 for normal text)
    Object.entries(contrastRatios).forEach(([key, ratio]) => {
      if (ratio < 4.5) {
        console.warn(`WCAG contrast ratio warning: ${key} color does not meet AA standards (${ratio.toFixed(2)}:1)`);
      }
    });
  };

  // Calculate contrast ratio between two colors
  const getContrastRatio = (foreground: string, background: string): number => {
    const getLuminance = (color: string): number => {
      // Convert hex to rgb and calculate luminance
      const rgb = color.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)) || [0, 0, 0];
      const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Memoized theme toggle function
  const toggleTheme = useCallback(() => {
    setMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      return newMode;
    });
  }, []);

  // Effect to sync theme with system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Effect to validate contrast ratios when theme changes
  useEffect(() => {
    validateContrastRatios(theme);
  }, [theme]);

  return {
    theme,
    isDarkMode: mode === 'dark',
    toggleTheme,
  };
};

export type UseThemeReturn = ReturnType<typeof useTheme>;