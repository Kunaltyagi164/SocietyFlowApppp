// src/theme/index.js
// Sophisticated Playful Design System
// Color Palette: Charcoal, Gray-Green, Vibrant Red, Off-White, White
// Typography: Poppins (Modern, Clean, Professional) with 40px main border-radius
import { StyleSheet } from 'react-native';
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SF,
  SH,
  SW,
  fontPercent,
  heightPercent,
  hexToRgba,
  widthPercent,
} from '../utils/responsive';

export const Colors = {
  // ── Premium Blue-Green Palette ─────────────────────────────
  royalBlue:    '#0B4EA2',
  appBlue:      '#007BFF',
  cyanTeal:     '#00BFA6',
  freshGreen:   '#39B54A',
  limeAccent:   '#7ED957',
  softYellow:   '#F4C542',
  sidebarDark:  '#0A2B5E',
  white:        '#ffffff',

  // ── Backward-compatible aliases ────────────────────────────
  charcoal:     '#11284D',
  grayGreen:    '#6E8BAF',
  vibrantRed:   '#E53935',
  offWhite:     '#F4F8FF',

  primary:      '#007BFF',
  primaryLight: '#EAF3FF',
  blue:         '#007BFF',
  bg:           '#F4F8FF',
  bgWhite:      '#ffffff',
  
  // ── Text Colors ────────────────────────────────────────────
  textPrimary:  '#11284D',
  textSecondary:'#4E6D97',
  textWhite:    '#ffffff',
  textMuted:    'rgba(78,109,151,0.62)',
  textLight:    '#7C98BD',
  textDark:     '#0A2B5E',
  textMid:      '#335784',

  // ── Status Colors (mapped to new palette) ──────────────────
  success:      '#39B54A',
  successLight: '#E7F8EA',
  warning:      '#F4C542',
  warningLight: '#FFF6DB',
  danger:       '#E53935',
  dangerLight:  '#FDE7E6',
  alert:        '#E53935',
  
  // ── Accent Colors (for backward compatibility) ──────────────
  teal:         '#00BFA6',
  gold:         '#F4C542',
  
  // ── Surface & Utility Colors ───────────────────────────────
  border:       'rgba(11,78,162,0.16)',
  borderLight:  'rgba(0,123,255,0.12)',
  divider:      'rgba(11,78,162,0.12)',
  overlay:      'rgba(10,43,94,0.45)',
  inputFill:    'rgba(255,255,255,0.9)',
  card:         'rgba(255,255,255,0.9)',
  
  // ── Glass Effect ───────────────────────────────────────────
  glass:        'rgba(255,255,255,0.76)',
  cardGlass:    'rgba(255,255,255,0.88)',
  glassGreen:   'rgba(57,181,74,0.13)',
  
  // ── Accent (for refresh control and other UI elements) ────
  accent:       '#39B54A',
  accentLight:  '#E7F8EA',
  tealLight:    '#EAF9F6',
  blueLight:    '#EAF3FF',
  
  // ── Dark Dashboard Theme (Glass-Dark Aesthetic) ──────────
  dashboardBg:      '#081B3A',
  dashboardGray400: '#A8BDD8',
  dashboardGlass:   'rgba(12, 52, 108, 0.42)',
  dashboardPrimary: '#007BFF',
  dashboardSuccess: '#39B54A',
  dashboardDanger:  '#E53935',
  dashboardAccent:  '#00BFA6',
  dashboardAmber:   '#F4C542',
  
  // ── Page Background (Off-White + Faded Dark Orange) ──────────────
  pageBackground:   '#F4F8FF',
  pageBgWithOrange: '#F6FAFF',
};

export const Fonts = {
  // Poppins font family - modern, clean, professional
  // Fonts stored in: android/app/src/main/assets/fonts/
  Poppins_Regular: 'Poppins-Regular',           // 400 - Base text, body copy
  Poppins_Medium: 'Poppins-Medium',             // 500 - Labels, secondary content
  Poppins_Bold: 'Poppins-Bold',                 // 700 - Headers, titles, emphasis
  Poppins_Italic: 'Poppins-Italic',             // 400 - Emphasis, quotes
  Poppins_MediumItalic: 'Poppins-MediumItalic', // 500 - Medium emphasis
  Poppins_BoldItalic: 'Poppins-BoldItalic',     // 700 - Strong emphasis
  
  // Aliases for easier access (backward compatibility)
  black:        'Poppins-Bold',      // Bold as strongest weight
  bold:         'Poppins-Bold',      // 700 weight
  semibold:     'Poppins-Medium',    // 500 weight (closest to semibold)
  medium:       'Poppins-Medium',    // 500 weight
  regular:      'Poppins-Regular',   // 400 weight
  light:        'Poppins-Regular',   // 400 weight (fallback, no light variant)
};

export const Radius = {
  // Premium rounded system requested for redesign
  sm:     SW(12),
  md:     SW(16),
  lg:     SW(18),
  xl:     SW(20),
  xxl:    SW(24),
  full:   999,  // Circular elements
};

// ── Sophisticated Shadow System ────────────────────────────────
export const Shadow = {
  none: {},
  
  // ── Subtle: Light elevation ────────────────────────────────
  subtle: {
    shadowColor:   '#0B4EA2',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  6,
    elevation:     2,
  },

  // ── Soft: Standard cards (0_20px_50px_-12px_rgba(0,0,0,0.08)) ────
  soft: {
    shadowColor:   '#0B4EA2',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius:  16,
    elevation:     6,
  },

  // ── Medium: Interactive elements ──────────────────────────────
  medium: {
    shadowColor:   '#007BFF',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius:  20,
    elevation:     12,
  },

  // ── Strong: FAB and primary buttons ────────────────────────
  strong: {
    shadowColor:   '#39B54A',
    shadowOffset:  { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius:  20,
    elevation:     16,
  },
};

// ── Gradient Colors (using new palette) ────────────────────────
export const GradientColors = {
  // Core brand gradients from redesign brief
  mainHeader:        ['#0B4EA2', '#007BFF', '#00BFA6', '#39B54A'],
  premiumAlternate:  ['#123D8D', '#1E88E5', '#1DB9A6', '#58C94D'],
  premiumCardHeader: ['#123D8D', '#1E88E5', '#1DB9A6'],
  sidebarActive:     ['#007BFF', '#39B54A'],
  button:            ['#007BFF', '#39B54A'],
  buttonHover:       ['#1E88E5', '#58C94D'],

  // Utility/status gradients
  red:       ['#E53935', '#C62828'],
  charcoal:  ['#0A2B5E', '#081B3A'],
  sage:      ['#00BFA6', '#39B54A'],
  success:   ['#39B54A', '#2E9B3D'],
  warning:   ['#F4C542', '#D4A531'],
  danger:    ['#E53935', '#C62828'],

  // Backward compatibility aliases
  blue:      ['#007BFF', '#39B54A'],
  navy:      ['#0B4EA2', '#007BFF', '#00BFA6'],
  teal:      ['#00BFA6', '#39B54A'],
};

export const Spacing = {
  xs:   SW(4),     // Minimal padding
  sm:   SW(8),     // Small gaps
  md:   SW(12),    // Standard padding
  lg:   SW(16),    // Large padding
  xl:   SW(20),    // Extra large
  xxl:  SW(24),    // Double large
  xxxl: SW(32),    // Super large
  huge: SW(48),    // Hero section spacing
};

export const Screen = { W: SCREEN_WIDTH, H: SCREEN_HEIGHT };

export {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SF,
  SH,
  SW,
  fontPercent,
  heightPercent,
  hexToRgba,
  widthPercent,
};

// ── Typography Helpers (Nunito-based) ──────────────────────────
export const Typography = {
  heading1: {
    fontFamily: Fonts.black,
    fontSize: SF(32),
    fontWeight: '900',
    lineHeight: SH(40),
    color: Colors.charcoal,
    letterSpacing: -0.5,
  },
  heading2: {
    fontFamily: Fonts.black,
    fontSize: SF(20),
    fontWeight: '900',
    lineHeight: SH(28),
    color: Colors.charcoal,
    letterSpacing: -0.3,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: SF(10),
    fontWeight: '700',
    lineHeight: SH(14),
    color: Colors.grayGreen,
    letterSpacing: 1.2,  // Uppercase tracking
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: SF(14),
    fontWeight: '400',
    lineHeight: SH(20),
    color: Colors.charcoal,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: SF(12),
    fontWeight: '400',
    lineHeight: SH(16),
    color: Colors.grayGreen,
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: SF(14),
    fontWeight: '700',
    lineHeight: SH(18),
    color: Colors.white,
  },
};

// ── Status Color Helper ────────────────────────────────────────
export const statusColor = (s = '') => {
  const status = s.toLowerCase();
  // Complaint/Status-specific colors with user specifications
  if (status === 'open') return '#3B82F6';           // Light Blue for Open
  if (status === 'in_progress') return '#FBBF24';   // Yellow for In Progress
  if (status === 'resolved') return '#10B981';      // Green for Resolved
  if (status === 'paid') return '#10B981';          // Green for Paid
  
  // Default for other statuses: Red
  return '#EF4444';
};

export const statusBg = (s = '') => {
  const status = s.toLowerCase();
  // Complaint/Status-specific light backgrounds
  if (status === 'open') return '#DBEAFE';          // Light blue for Open
  if (status === 'in_progress') return '#FEF3C7';   // Light yellow for In Progress
  if (status === 'resolved') return '#D1FAE5';      // Light green for Resolved
  if (status === 'paid') return '#D1FAE5';          // Light green for Paid
  
  // Default for other statuses: Light red
  return '#FEE2E2';
};

// ── Dashboard Design Tokens (Glass-Dark Aesthetic) ──────────────
export const DashboardTokens = {
  padding: {
    horizontal: SW(24),    // 1.5rem - horizontal padding across all sections
    vertical: SH(16),      // Standard vertical padding
  },
  
  spacing: {
    xs: SW(4),
    sm: SW(8),
    md: SW(12),
    lg: SW(16),
    xl: SW(20),
  },
  
  borderRadius: {
    hero: SW(32),         // Primary hero cards (2rem)
    card: SW(16),         // Secondary cards (1rem)
    icon: SW(12),         // Icon containers
    row: SW(12),          // Activity rows
    fab: 999,         // Circular FAB
  },
  
  glassmorphism: {
    background: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(12px)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  
  shadows: {
    glass: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    fab: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  
  animation: {
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    duration: 200,
    activeScale: 0.98,
  },
  
  header: {
    height: SH(56),
  },
  
  nav: {
    height: SH(80),
    iconSize: SW(24),
    fabSize: SW(48),
  },
};
