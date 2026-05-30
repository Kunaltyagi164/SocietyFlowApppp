// src/components/index.js
import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Shadow, Spacing, Fonts, statusColor, statusBg, GradientColors } from '../theme';

const legacyEmojiToIcon = {
  '📭': 'inbox-outline',
  '📁': 'folder-outline',
  '📋': 'clipboard-text-outline',
  '💬': 'chat-outline',
  '✅': 'check-circle-outline',
  '👥': 'account-group-outline',
  '📢': 'bullhorn-outline',
  '📊': 'chart-bar',
  '🚕': 'car-outline',
  '📄': 'file-document-outline',
  '📞': 'phone-outline',
  '👤': 'account-outline',
  '🏠': 'home-outline',
};

const resolveLegacyIcon = (value, fallback) => {
  if (!value) return fallback;
  if (value.includes('-')) return value;
  return legacyEmojiToIcon[value] || fallback;
};
export { default as VisitorApprovalModal } from './VisitorApprovalModal';
export { default as VisitorArrivalAlert } from './VisitorArrivalAlert';
export { default as Sidebar } from './Sidebar';
export { NotificationBell } from './NotificationBell';
export { default as NotificationBadge } from './NotificationBadge';
export { default as VoiceBot } from './VoiceBot';
export { default as VoiceBotFloatingButton } from './VoiceBotFloatingButton';
export { default as SpectrumBar } from './SpectrumBar';
export { DatePickerModal } from './DatePickerModal';
export { TimePickerModal } from './TimePickerModal';
export { default as ScreenBackground } from './ScreenBackground';
export { default as SocietyFooter } from './SocietyFooter';

// ── SFCard ────────────────────────────────────────────────────
export const SFCard = ({ children, style, onPress, padding = 18 }) => {
  const Inner = (
    <View style={[styles.card, { padding }, style]}>{children}</View>
  );
  if (!onPress) return Inner;
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}
      style={[styles.card, { padding }, style]}>
      {children}
    </TouchableOpacity>
  );
};

// ── GradientCard ──────────────────────────────────────────────
export const GradientCard = ({ children, colors = GradientColors.premiumCardHeader, style, onPress, padding = 22 }) => (
  <TouchableOpacity activeOpacity={onPress ? 0.80 : 1} onPress={onPress}
    style={[styles.gradCard, style]}>
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.gradInner, { padding }]}>
      {children}
    </LinearGradient>
  </TouchableOpacity>
);

// ── SFButton ──────────────────────────────────────────────────
export const SFButton = ({
  label, onPress, loading = false, colors = GradientColors.button,
  outlined = false, icon, style, small = false,
}) => {
  if (outlined) return (
    <TouchableOpacity activeOpacity={0.75} onPress={loading ? null : onPress}
      style={[styles.outlineBtn, small && styles.smallBtn, style]}>
      {icon && <Text style={{ marginRight: 6, fontSize: 15 }}>{icon}</Text>}
      <Text style={[styles.outlineBtnText, small && { fontSize: 12 }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <TouchableOpacity activeOpacity={loading ? 1 : 0.85} onPress={loading ? null : onPress}
      style={[Shadow.button, style]}>
      <LinearGradient colors={loading ? ['#94A3B8','#94A3B8'] : colors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.btn, small && styles.smallBtn]}>
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              {icon && <Text style={{ marginRight: 8, fontSize: small ? 14 : 16 }}>{icon}</Text>}
              <Text style={[styles.btnText, small && { fontSize: 12 }]}>{label}</Text>
            </>
        }
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ── StatusBadge ───────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const color = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: statusBg(status), borderColor: color + '30' }]}>
      <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
};

// ── SectionHeader ─────────────────────────────────────────────
export const SectionHeader = ({ title, action, onAction }) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Divider ───────────────────────────────────────────────────
export const Divider = ({ inset = 0 }) => (
  <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: inset }} />
);

// ── ScreenLoader ──────────────────────────────────────────────
export const ScreenLoader = () => (
  <View style={styles.loaderWrap}>
    <ActivityIndicator size="large" color={Colors.accent} />
  </View>
);

// ── EmptyState ────────────────────────────────────────────────
export const EmptyState = ({ emoji = '📭', iconName, title, subtitle, buttonLabel, onButton }) => (
  <View style={styles.emptyWrap}>
    <MaterialCommunityIcons
      name={resolveLegacyIcon(iconName || emoji, 'inbox-outline')}
      size={56}
      color={Colors.textMid}
      style={styles.emptyEmoji}
    />
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    {buttonLabel && (
      <SFButton label={buttonLabel} onPress={onButton} style={{ marginTop: 20, width: 200 }} />
    )}
  </View>
);

// ── InfoRow ───────────────────────────────────────────────────
export const InfoRow = ({ icon, iconName, label, value }) => (
  <View style={styles.infoRow}>
    <MaterialCommunityIcons
      name={resolveLegacyIcon(iconName || icon, 'information-outline')}
      size={18}
      color={Colors.accent}
      style={styles.infoIcon}
    />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  // ── CARDS - Premium glassmorphic style ──────────────────────
  card: {
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...Shadow.soft,
    overflow: 'hidden',
  },
  gradCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.medium,
  },
  gradInner: {
    borderRadius: Radius.xl,
  },

  // ── BUTTONS - Premium, elegant style ───────────────────────
  btn: {
    height: 52,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    // Subtle glow effect
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  smallBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
  },
  btnText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── OUTLINE BUTTONS - Refined style ────────────────────────
  outlineBtn: {
    height: 52,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.appBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,123,255,0.06)',
  },
  outlineBtnText: {
    color: Colors.appBlue,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── BADGES - Subtle status indicators ──────────────────────
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 0.8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // ── SECTION HEADER - Premium typography ────────────────────
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textDark,
    letterSpacing: 0.2,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.accent,
    letterSpacing: 0.1,
  },

  // ── DIVIDER - Subtle separator ─────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  // ── LOADER - Centered loading state ────────────────────────
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },

  // ── EMPTY STATE - Premium empty layout ─────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: Colors.bg,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textMid,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },

  // ── INFO ROW - Structured information display ───────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  infoIcon: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMid,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    maxWidth: 180,
    textAlign: 'right',
    letterSpacing: 0.2,
  },
});
