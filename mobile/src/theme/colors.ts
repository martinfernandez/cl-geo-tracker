// PeeK App - Design System 2026
// Inspired by: Duo App (romantic purples, soothing blues) + TechMagic Trends (dark mode, glassmorphism, futuristic colors)

// Shared colors (same in both themes)
const shared = {
  // Primary - Electric Purple (Duo-inspired + futuristic)
  primary: {
    main: '#8B5CF6',
    light: '#A78BFA',
    dark: '#7C3AED',
    muted: '#6D28D9',
  },

  // Secondary - Electric Blue (futuristic)
  secondary: {
    main: '#06B6D4',
    light: '#22D3EE',
    dark: '#0891B2',
  },

  // Accent - Vibrant Green (futuristic)
  accent: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
  },

  // Tertiary - Soft Pink/Magenta (Duo romantic touch)
  tertiary: {
    main: '#EC4899',
    light: '#F472B6',
    dark: '#DB2777',
  },

  // Semantic colors
  success: {
    main: '#22C55E',
    light: '#4ADE80',
    dark: '#16A34A',
  },

  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
  },

  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },

  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
  },

  // Gradients (for backgrounds, cards, buttons)
  gradient: {
    primary: ['#8B5CF6', '#6366F1'],
    secondary: ['#06B6D4', '#3B82F6'],
    accent: ['#10B981', '#06B6D4'],
    aurora: ['#8B5CF6', '#EC4899', '#F59E0B'],
    sunset: ['#EC4899', '#F59E0B'],
    ocean: ['#06B6D4', '#8B5CF6'],
  },
};

// Dark theme
export const darkTheme = {
  ...shared,

  // Backgrounds
  bg: '#0A0A0F',
  bgSecondary: '#12121A',
  bgTertiary: '#1A1A24',
  bgElevated: '#22222E',
  surface: '#12121A',
  border: '#2C2C2E',

  // Text colors (flat)
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textDisabled: '#64748B',
  textInverse: '#0F172A',

  // Backgrounds (nested for compatibility)
  bgNested: {
    primary: '#0A0A0F',
    secondary: '#12121A',
    tertiary: '#1A1A24',
    elevated: '#22222E',
  },

  // Text colors (nested for compatibility)
  textNested: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    disabled: '#64748B',
    inverse: '#0F172A',
  },

  // Glass/Transparent elements
  glass: {
    bg: 'rgba(255, 255, 255, 0.05)',
    bgHover: 'rgba(255, 255, 255, 0.08)',
    bgActive: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.15)',
    borderStrong: 'rgba(255, 255, 255, 0.2)',
  },

  // Subtle versions for dark mode
  primary: {
    ...shared.primary,
    subtle: 'rgba(139, 92, 246, 0.15)',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
  secondary: {
    ...shared.secondary,
    subtle: 'rgba(6, 182, 212, 0.15)',
    glow: 'rgba(6, 182, 212, 0.4)',
  },
  accent: {
    ...shared.accent,
    subtle: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  tertiary: {
    ...shared.tertiary,
    subtle: 'rgba(236, 72, 153, 0.15)',
    glow: 'rgba(236, 72, 153, 0.4)',
  },
  success: {
    ...shared.success,
    subtle: 'rgba(34, 197, 94, 0.15)',
  },
  error: {
    ...shared.error,
    subtle: 'rgba(239, 68, 68, 0.15)',
  },
  warning: {
    ...shared.warning,
    subtle: 'rgba(245, 158, 11, 0.15)',
  },
  info: {
    ...shared.info,
    subtle: 'rgba(59, 130, 246, 0.15)',
  },

  // Map-specific colors
  map: {
    deviceMarker: '#8B5CF6',
    eventUrgent: '#EF4444',
    eventNormal: '#F59E0B',
    areaFill: 'rgba(139, 92, 246, 0.15)',
    areaStroke: 'rgba(139, 92, 246, 0.5)',
    routeLine: '#06B6D4',
    userLocation: '#22C55E',
  },

  // Overlay
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
    blur: 'rgba(10, 10, 15, 0.8)',
  },

  // For backwards compatibility
  neutral: {
    900: '#F8FAFC',
    800: '#E2E8F0',
    700: '#CBD5E1',
    600: '#94A3B8',
    500: '#64748B',
    400: '#475569',
    300: '#334155',
    200: '#1E293B',
    100: '#12121A',
    50: '#0A0A0F',
    0: '#FFFFFF',
  },

  // Dark mode specific
  dark: {
    bg: '#0A0A0F',
    surface: '#12121A',
    elevated: '#1A1A24',
    overlay: '#22222E',
  },
};

// Light theme
export const lightTheme = {
  ...shared,

  // Backgrounds
  bg: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgTertiary: '#F1F5F9',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E5E5EA',

  // Text colors (flat)
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#F8FAFC',

  // Backgrounds (nested for compatibility)
  bgNested: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    elevated: '#FFFFFF',
  },

  // Text colors (nested for compatibility)
  textNested: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    disabled: '#94A3B8',
    inverse: '#F8FAFC',
  },

  // Glass/Transparent elements (adjusted for light mode)
  glass: {
    bg: 'rgba(0, 0, 0, 0.03)',
    bgHover: 'rgba(0, 0, 0, 0.05)',
    bgActive: 'rgba(0, 0, 0, 0.08)',
    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.1)',
    borderStrong: 'rgba(0, 0, 0, 0.15)',
  },

  // Subtle versions for light mode
  primary: {
    ...shared.primary,
    subtle: 'rgba(139, 92, 246, 0.1)',
    glow: 'rgba(139, 92, 246, 0.2)',
  },
  secondary: {
    ...shared.secondary,
    subtle: 'rgba(6, 182, 212, 0.1)',
    glow: 'rgba(6, 182, 212, 0.2)',
  },
  accent: {
    ...shared.accent,
    subtle: 'rgba(16, 185, 129, 0.1)',
    glow: 'rgba(16, 185, 129, 0.2)',
  },
  tertiary: {
    ...shared.tertiary,
    subtle: 'rgba(236, 72, 153, 0.1)',
    glow: 'rgba(236, 72, 153, 0.2)',
  },
  success: {
    ...shared.success,
    subtle: 'rgba(34, 197, 94, 0.1)',
  },
  error: {
    ...shared.error,
    subtle: 'rgba(239, 68, 68, 0.1)',
  },
  warning: {
    ...shared.warning,
    subtle: 'rgba(245, 158, 11, 0.1)',
  },
  info: {
    ...shared.info,
    subtle: 'rgba(59, 130, 246, 0.1)',
  },

  // Map-specific colors
  map: {
    deviceMarker: '#7C3AED',
    eventUrgent: '#DC2626',
    eventNormal: '#D97706',
    areaFill: 'rgba(139, 92, 246, 0.1)',
    areaStroke: 'rgba(139, 92, 246, 0.4)',
    routeLine: '#0891B2',
    userLocation: '#16A34A',
  },

  // Overlay
  overlay: {
    light: 'rgba(0, 0, 0, 0.04)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.4)',
    blur: 'rgba(255, 255, 255, 0.8)',
  },

  // For backwards compatibility
  neutral: {
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    50: '#F8FAFC',
    0: '#FFFFFF',
  },

  // Light mode specific (for compatibility)
  dark: {
    bg: '#FFFFFF',
    surface: '#F8FAFC',
    elevated: '#FFFFFF',
    overlay: '#F1F5F9',
  },
};

// Default export for backwards compatibility (use dark theme by default)
export const colors = darkTheme;

// Theme type
export type Theme = typeof darkTheme;

// Typography scale
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing scale (4px base)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

// Border radius - more rounded for 2026 trends
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Shadows - enhanced for dark mode with colored glows
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    purple: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    cyan: {
      shadowColor: '#06B6D4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    green: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
  },
};

export default { colors, darkTheme, lightTheme, typography, spacing, radius, shadows };
