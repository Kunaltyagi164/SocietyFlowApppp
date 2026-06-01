// src/theme/DesignTokens.js
// Sophisticated Playful Design System - Complete Component Specifications
import { Colors, Fonts, Radius, Shadow, Spacing, Typography } from './index';

/**
 * COMPONENT SPECIFICATIONS FROM DESIGN SYSTEM
 * Reference: SophisticatedPlayful Design Brief
 */

export const DesignTokens = {
  // ══════════════════════════════════════════════════════════════
  // HEADER SPECIFICATIONS
  // ══════════════════════════════════════════════════════════════
  header: {
    container: {
      paddingTop: 56,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      backgroundColor: Colors.white,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    greeting: {
      label: {
        ...Typography.label,
        color: Colors.grayGreen,
        fontSize: 12,
      },
      name: {
        fontFamily: Fonts.bold,
        fontSize: 30,
        fontWeight: '700',
        lineHeight: 36,
        color: Colors.charcoal,
        marginTop: Spacing.sm,
      },
    },
    profileImage: {
      width: 48,
      height: 48,
      borderRadius: Radius.full,
      borderWidth: 2,
      borderColor: Colors.white,
      // Shadow for image
      ...Shadow.soft,
    },
    notificationBadge: {
      width: 16,
      height: 16,
      borderRadius: Radius.full,
      backgroundColor: Colors.vibrantRed,
      position: 'absolute',
      bottom: -2,
      right: -2,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: Colors.white,
    },
    badgeText: {
      color: Colors.white,
      fontFamily: Fonts.bold,
      fontSize: 10,
      fontWeight: '700',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // HORIZONTAL SCROLL SELECTOR
  // ══════════════════════════════════════════════════════════════
  horizontalSelector: {
    container: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: Colors.white,
    },
    inactiveButton: {
      width: 56,
      height: 56,
      borderRadius: Radius.sm,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    activeButton: {
      width: 160,
      height: 56,
      borderRadius: Radius.full,
      backgroundColor: Colors.charcoal,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      flexDirection: 'row',
    },
    activeValueCircle: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: Colors.vibrantRed,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeText: {
      color: Colors.white,
      fontFamily: Fonts.bold,
      fontSize: 14,
      fontWeight: '700',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // HERO FEATURE CARD
  // ══════════════════════════════════════════════════════════════
  heroCard: {
    container: {
      backgroundColor: Colors.white,
      borderRadius: Radius.xxl,
      padding: Spacing.lg,
      marginHorizontal: Spacing.lg,
      marginVertical: Spacing.md,
      ...Shadow.soft,
    },
    decorativeBlob: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 120,
      height: 120,
      borderRadius: Radius.full,
      backgroundColor: Colors.glassGreen,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: Radius.lg,
      backgroundColor: Colors.white,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: Spacing.md,
    },
    metricsGrid: {
      marginVertical: Spacing.md,
      gap: Spacing.sm,
    },
    metricCard: {
      backgroundColor: Colors.glass,
      borderRadius: Radius.md,
      padding: Spacing.md,
      backdrop: 'blur(10px)',
      backdropFilter: 'blur(10px)',
    },
    alertBox: {
      backgroundColor: Colors.glassGreen,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: Colors.vibrantRed,
      marginTop: Spacing.md,
    },
  },

  // ══════════════════════════════════════════════════════════════
  // SECONDARY FEED ITEMS
  // ══════════════════════════════════════════════════════════════
  feedCard: {
    container: {
      backgroundColor: Colors.white,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
      marginHorizontal: Spacing.lg,
      marginVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(202,0,19,0.1)',  // Red at 10% opacity
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    content: {
      flex: 1,
    },
    heading: {
      fontFamily: Fonts.bold,
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
      color: Colors.charcoal,
      marginBottom: Spacing.sm,
    },
    checkboxButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: Colors.grayGreen,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxButtonActive: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: Colors.vibrantRed,
      justifyContent: 'center',
      alignItems: 'center',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // FLOATING ACTION BUTTON (FAB)
  // ══════════════════════════════════════════════════════════════
  fab: {
    container: {
      width: 56,
      height: 56,
      borderRadius: Radius.full,
      backgroundColor: Colors.vibrantRed,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: Colors.offWhite,  // Creates 'cutout' effect
      ...Shadow.strong,
      position: 'absolute',
      bottom: 32,  // Offset to sit half-outside nav bar
      left: '50%',
      marginLeft: -28,  // Center horizontally (width/2)
    },
    icon: {
      color: Colors.white,
      fontSize: 24,
    },
  },

  // ══════════════════════════════════════════════════════════════
  // FLOATING NAVIGATION BAR
  // ══════════════════════════════════════════════════════════════
  floatingNav: {
    container: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      right: 8,
      height: 64,
      backgroundColor: Colors.charcoal,
      borderRadius: Radius.full,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      ...Shadow.soft,
    },
    tabItem: {
      width: 48,
      height: 48,
      borderRadius: Radius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabIcon: {
      fontSize: 24,
      color: Colors.grayGreen,  // Inactive
    },
    tabIconActive: {
      fontSize: 24,
      color: Colors.white,  // Active
    },
  },

  // ══════════════════════════════════════════════════════════════
  // BENTO METRIC CARD
  // ══════════════════════════════════════════════════════════════
  bentocardCard: {
    container: {
      backgroundColor: Colors.glass,
      borderRadius: Radius.md,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      ...Typography.label,
      marginBottom: Spacing.sm,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(202,0,19,0.1)',  // Red at 10% opacity
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    content: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      fontWeight: '700',
      color: Colors.charcoal,
    },
  },

  // ══════════════════════════════════════════════════════════════
  // BUTTON STYLES
  // ══════════════════════════════════════════════════════════════
  buttons: {
    primary: {
      backgroundColor: Colors.vibrantRed,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      ...Shadow.soft,
    },
    primaryText: {
      color: Colors.white,
      fontFamily: Fonts.bold,
      fontSize: 14,
      fontWeight: '700',
    },
    secondary: {
      backgroundColor: Colors.white,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.grayGreen,
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryText: {
      color: Colors.charcoal,
      fontFamily: Fonts.bold,
      fontSize: 14,
      fontWeight: '700',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // INPUT FIELD STYLES
  // ══════════════════════════════════════════════════════════════
  input: {
    container: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.lg,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    text: {
      fontFamily: Fonts.regular,
      fontSize: 16,
      color: Colors.charcoal,
      lineHeight: 24,
    },
    placeholder: {
      fontFamily: Fonts.regular,
      fontSize: 16,
      color: Colors.textMuted,
      lineHeight: 24,
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CARD STYLES
  // ══════════════════════════════════════════════════════════════
  cards: {
    main: {
      backgroundColor: Colors.white,
      borderRadius: Radius.xxl,  // 40px - signature size
      padding: Spacing.lg,
      ...Shadow.soft,
    },
    secondary: {
      backgroundColor: Colors.white,
      borderRadius: Radius.lg,  // 24px
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
    },
    nested: {
      backgroundColor: Colors.glass,
      borderRadius: Radius.md,  // 16px
      padding: Spacing.md,
      backdropFilter: 'blur(10px)',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ANIMATION TOKENS
  // ══════════════════════════════════════════════════════════════
  animations: {
    duration: 250,  // 0.25s
    easing: 'ease-in-out',
  },
};

export default DesignTokens;
