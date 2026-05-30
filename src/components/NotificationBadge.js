import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

/**
 * NotificationBadge Component
 * Displays a red badge with count of unseen notifications
 * 
 * Props:
 * - count: Number of unseen notifications (display only if > 0)
 * - size: 'small' (16), 'medium' (20 - default), 'large' (24)
 */
export default function NotificationBadge({ count = 0, size = 'medium' }) {
  if (!count || count <= 0) return null;

  const sizeMap = {
    small: 16,
    medium: 20,
    large: 24,
  };

  const badgeSize = sizeMap[size] || sizeMap.medium;
  const fontSize = badgeSize * 0.6;

  const styles = StyleSheet.create({
    badge: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: Colors.danger || '#FF4757',
      borderRadius: badgeSize / 2,
      width: badgeSize,
      height: badgeSize,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#fff',
      zIndex: 999,
    },
    badgeText: {
      color: '#fff',
      fontSize: fontSize,
      fontWeight: '700',
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}
