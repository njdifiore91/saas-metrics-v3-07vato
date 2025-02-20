/**
 * Font configuration file implementing Material Design typography standards
 * with WCAG 2.1 Level AA compliance and fluid typography scaling.
 * @version 1.0.0
 */

/**
 * Font family definitions with complete fallback chains for cross-browser compatibility.
 * Primary: Roboto - Used for main content and UI elements
 * Secondary: Open Sans - Used for headers and emphasis
 * Monospace: Roboto Mono - Used for code and technical content
 */
export const FONT_FAMILY: Record<string, string> = {
  primary: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji'",
  secondary: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji'",
  monospace: "'Roboto Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
} as const;

/**
 * Standardized font weights following Material Design specifications.
 * Ensures consistent typography hierarchy across the application.
 */
export const FONT_WEIGHTS: Record<string, number> = {
  light: 300,    // Used for large display text
  regular: 400,  // Default body text weight
  medium: 500,   // Used for emphasis and subheadings
  bold: 700      // Used for primary headings and strong emphasis
} as const;

/**
 * Responsive font sizes that scale fluidly across breakpoints.
 * All sizes maintain WCAG 2.1 Level AA compliance for readability.
 * Base size (16px) ensures minimum readable font size on all devices.
 */
export const FONT_SIZES: Record<string, number> = {
  base: 16,     // Default body text size
  small: 14,    // Small text, used sparingly and never for main content
  medium: 18,   // Enhanced readability for important content
  large: 20,    // Subheadings and emphasized content
  xlarge: 24    // Main headings and display text
} as const;

/**
 * WCAG-compliant line heights for optimal readability.
 * Values ensure sufficient spacing between lines while maintaining text hierarchy.
 */
export const LINE_HEIGHTS: Record<string, number> = {
  tight: 1.2,   // Used for headings and short text blocks
  normal: 1.5,  // Default for body text, meets WCAG requirements
  loose: 1.8    // Enhanced readability for dense text blocks
} as const;