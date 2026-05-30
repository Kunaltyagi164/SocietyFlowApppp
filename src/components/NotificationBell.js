// src/components/NotificationBell.js
/**
 * 🔔 Notification Bell Component (REFACTORED)
 * 
 * Displays notification bell icon with unread count badge
 * Uses NotificationService for real-time updates via sockets
 * 
 * Architecture:
 * Socket → Service → Component
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Shadow, Radius, Fonts, Spacing } from '../theme';
import notificationService from '../services/NotificationService';

export const NotificationBell = ({ onPress = () => {} }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setLoading(true);
      console.log('🔔 [NotificationBell] Initializing...');

      // Get initial count from service
      const count = notificationService.getUnreadCount?.() ?? 0;
      setUnreadCount(count);
      console.log(`✅ [NotificationBell] Unread count: ${count}`);

      // Subscribe to notification changes
      const unsubscribe = notificationService.subscribe?.((event, data) => {
        console.log(`🔔 [NotificationBell] Event: ${event}`);
        const newCount = notificationService.getUnreadCount?.() ?? 0;
        setUnreadCount(newCount);
      });

      setLoading(false);
      return () => unsubscribe?.();
    } catch (err) {
      console.warn('[NotificationBell] Init error:', err.message);
      setLoading(false);
    }
  }, []);

  return (
    <TouchableOpacity
      style={styles.bellContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name="bell-outline" size={20} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    backgroundColor: Colors.charcoal,
    marginRight: Spacing.md,
    ...Shadow.soft,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.vibrantRed,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.charcoal,
    ...Shadow.soft,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default NotificationBell;
