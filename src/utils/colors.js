// src/utils/colors.js
// Premium SaaS Color System for SocietyFlow

export const COLORS = {
  // Primary Gradient (Header)
  primary: "#007BFF",
  primaryDark: "#0B4EA2",
  primaryLight: "#EAF3FF",
  cyanTeal: "#00BFA6",
  freshGreen: "#39B54A",
  limeAccent: "#7ED957",
  softYellow: "#F4C542",
  sidebarDark: "#0A2B5E",
  
  // Background & Cards
  background: "#F4F8FF",
  card: "#FFFFFF",
  cardAlt: "#EEF5FF",
  surfaceLight: "#FFFFFF",
  
  // Text - Professional hierarchy
  textPrimary: "#0A2B5E",
  textSecondary: "#4E6D97",
  textTertiary: "#8AA8CC",
  textInverse: "#FFFFFF",
  
  // Status & Semantic Colors
  success: "#39B54A",
  successLight: "#E7F8EA",
  warning: "#F4C542",
  warningLight: "#FFF6DB",
  danger: "#E53935",
  dangerLight: "#FDE7E6",
  info: "#007BFF",
  infoLight: "#EAF3FF",
  
  // Card Background Colors (Icon containers)
  visitorBg: "#EAF3FF",
  dueBg: "#EAF9F6",
  workOrderBg: "#FFF6DB",
  announcementBg: "#E7F8EA",
  
  // UI Elements
  shadow: "rgba(11,78,162,0.14)",
  shadowMedium: "rgba(0,123,255,0.2)",
  border: "rgba(11,78,162,0.16)",
  divider: "rgba(11,78,162,0.16)",
  
  // Accents
  accent: "#39B54A",
  accentLight: "#E7F8EA",
};

export const GRADIENTS = {
  // Premium gradients from redesign brief
  header: ["#0B4EA2", "#007BFF", "#00BFA6", "#39B54A"],
  premiumCardHeader: ["#123D8D", "#1E88E5", "#1DB9A6"],
  sidebarActive: ["#007BFF", "#39B54A"],
  button: ["#007BFF", "#39B54A"],
  buttonHover: ["#1E88E5", "#58C94D"],
  success: ["#39B54A", "#58C94D"],
  warning: ["#F4C542", "#D4A531"],
  danger: ["#E53935", "#C62828"],
};

export const SHADOWS = {
  // Card shadow - subtle elevation
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
};
