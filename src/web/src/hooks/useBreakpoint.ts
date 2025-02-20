import { useState, useEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';
import { UI_CONSTANTS } from '../config/constants';

/**
 * Interface defining readonly breakpoint states with SSR support
 */
export interface Breakpoints {
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly isWide: boolean;
  readonly orientation: 'portrait' | 'landscape';
}

/**
 * Interface for tracking previous breakpoint state for transition handling
 */
export interface BreakpointHistory {
  readonly previous: Breakpoints | null;
  readonly current: Breakpoints;
}

/**
 * Helper function to create SSR-safe default values
 * Implements mobile-first approach for server-side rendering
 */
const createSSRSafeValue = (): Breakpoints => ({
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isWide: false,
  orientation: 'portrait'
});

/**
 * Memoized helper function to calculate breakpoint states with orientation
 * @param width - Window width
 * @param height - Window height
 * @returns Calculated breakpoint states with orientation
 */
const getBreakpointStates = (width: number, height: number): Breakpoints => {
  const orientation = width >= height ? 'landscape' : 'portrait';
  const { MOBILE, TABLET, DESKTOP, WIDE } = UI_CONSTANTS.BREAKPOINTS;

  return {
    isMobile: width >= MOBILE && width < TABLET,
    isTablet: width >= TABLET && width < DESKTOP,
    isDesktop: width >= DESKTOP && width < WIDE,
    isWide: width >= WIDE,
    orientation
  } as const;
};

/**
 * Custom hook that detects and manages responsive breakpoints
 * Implements performance optimizations and SSR support
 * @returns Object containing current and previous breakpoint states
 */
export const useBreakpoint = (): BreakpointHistory => {
  // Initialize with SSR-safe values
  const [breakpoints, setBreakpoints] = useState<BreakpointHistory>({
    previous: null,
    current: createSSRSafeValue()
  });

  // Memoize the breakpoint calculation function
  const calculateBreakpoints = useMemo(() => {
    if (typeof window === 'undefined') return createSSRSafeValue();
    return getBreakpointStates(window.innerWidth, window.innerHeight);
  }, []);

  // Create debounced handler for performance optimization
  const debouncedHandleResize = useCallback(
    debounce(() => {
      if (typeof window === 'undefined') return;

      const newBreakpoints = getBreakpointStates(
        window.innerWidth,
        window.innerHeight
      );

      setBreakpoints(prev => ({
        previous: prev.current,
        current: newBreakpoints
      }));
    }, 150), // Debounce for 150ms for optimal performance
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize with current window dimensions
    setBreakpoints({
      previous: null,
      current: calculateBreakpoints
    });

    // Set up resize handling with ResizeObserver if supported
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(debouncedHandleResize);
      resizeObserver.observe(document.documentElement);

      return () => {
        resizeObserver.disconnect();
        debouncedHandleResize.cancel();
      };
    }

    // Fallback to window resize event
    window.addEventListener('resize', debouncedHandleResize);
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      debouncedHandleResize.cancel();
    };
  }, [calculateBreakpoints, debouncedHandleResize]);

  return breakpoints;
};