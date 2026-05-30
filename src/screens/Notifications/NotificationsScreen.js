// src/screens/Notifications/NotificationsScreen.js
/**
 * Notifications Screen
 * 
 * NEW: Completely rebuilt to use LocalNotificationService
 * Displays notifications with icons and clickable navigation
 * 
 * Notification types:
 * - Visitor: New pending visitor arrivals - Navigate to Visitors tab
 * - Notice: New posted notices - Navigate to Notices  
 * - Community: New posts/messages - Navigate to Community tab
 * - Bill: Due bill payments - Navigate to Bills tab
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LocalNotificationService from '../../services/LocalNotificationService';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow, GradientColors, Spacing } from '../../theme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { SF, SH, SW } from '../../utils/responsive';

// Time ago formatter
const fmtTime = (timestamp) => {
  try {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load notifications from LocalNotificationService
  const loadNotifications = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      console.log('\n[NotificationsScreen] Loading local notifications...');

      // Get all notifications from local service
      const notifs = await LocalNotificationService.getNotifications();

      setNotifications(notifs);
      console.log(`[NotificationsScreen] Loaded ${notifs.length} notification(s)`);

      if (notifs.length > 0) {
        const breakdown = await LocalNotificationService.getNotificationCounts();
        setUnreadCount(breakdown.unread);
        console.log(
          `   Breakdown: Visitors: ${breakdown.visitor}, Notices: ${breakdown.notice}, ` +
          `Community: ${breakdown.community}, Bills: ${breakdown.bill}, Unread: ${breakdown.unread}`
        );
      }
    } catch (err) {
      console.error('[NotificationsScreen] Load error:', err.message);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => loadNotifications(true), true, 20000);

  // Handle notification click - navigate to appropriate screen with data
  const handleNotificationTap = async (notification) => {
    try {
      console.log(`[NotificationsScreen] Tapped notification: ${notification.type} - ${notification.id}`);

      // Mark as read
      await LocalNotificationService.markAsRead(notification.id);

      // Navigate based on notification type
      switch (notification.type) {
        case 'visitor':
          console.log('   Navigating to Visitors tab');
          navigation.navigate('VisitorsTab', {
            filterStatus: 'pending',
            highlightVisitorId: notification.data?.id,
          });
          break;

        case 'notice':
          console.log('   Navigating to Notices');
          navigation.navigate('Notices');
          break;

        case 'community':
          console.log('   Navigating to Community tab');
          navigation.navigate('CommunityTab');
          break;

        case 'bill':
          console.log('   Navigating to Bills tab');
          navigation.navigate('BillsTab');
          break;

        default:
          console.warn('   Unknown notification type:', notification.type);
      }

      // Reload to update read status UI
      loadNotifications(true);
    } catch (err) {
      console.error('[NotificationsScreen] Navigation error:', err.message);
      Alert.alert('Error', 'Failed to navigate to details');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await LocalNotificationService.markAllAsRead();
      loadNotifications(true);
      Alert.alert('Done', 'All notifications marked as read');
    } catch (err) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    Alert.alert('Clear All Notifications?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          try {
            await LocalNotificationService.clearAllNotifications();
            setNotifications([]);
            console.log('[NotificationsScreen] Cleared all notifications');
          } catch (err) {
            Alert.alert('Error', 'Failed to clear notifications');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllRead}>
            <Text style={styles.actionBtnText}>Mark All Read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleClearAll}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnDangerText]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          emoji=""
          title="No notifications"
          subtitle="You're all caught up!"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              loadNotifications(true);
            }} />
          }
        >
          {notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onPress={() => handleNotificationTap(notif)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
    </ScreenBackground>
  );
}

/**
 * Individual Notification Item Component
 */
function NotificationItem({ notification, onPress }) {
  const { type, icon, title, message, subtitle, timestamp, read } = notification;

  // Determine badge styling based on type
  const getNotifColor = () => {
    switch (type) {
      case 'visitor':
        return '#4f8ef7';
      case 'notice':
        return '#f59e0b';
      case 'community':
        return '#8b5cf6';
      case 'bill':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.notifCard, !read && styles.notifCardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Icon */}
      <View style={[styles.notifIcon, { backgroundColor: getNotifColor() + '20' }]}>
        <Text style={styles.notifIconText}>{icon}</Text>
      </View>

      {/* Center: Content */}
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {message}
        </Text>
        {subtitle && (
          <Text style={styles.notifSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        <Text style={styles.notifTime}>{fmtTime(timestamp)}</Text>
      </View>

      {/* Right: Unread indicator or arrow */}
      {!read && <View style={styles.unreadDot} />}
      <Text style={styles.notifArrow}></Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
    backgroundColor: '#2563EB',
  },
  headerTitle: {
    fontSize: SF(18),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: Colors.vibrantRed,
    borderRadius: SW(12),
    minWidth: SW(24),
    height: SH(24),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SW(6),
  },
  badgeText: {
    color: '#fff',
    fontSize: SF(11),
    fontWeight: '700',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.primaryLight,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: SW(1),
    borderColor: Colors.border,
  },
  actionBtnDanger: {
    borderColor: Colors.vibrantRed + '40',
    backgroundColor: Colors.vibrantRed + '10',
  },
  actionBtnText: {
    fontSize: SF(12),
    fontWeight: '600',
    color: Colors.textDark,
  },
  actionBtnDangerText: {
    color: Colors.vibrantRed,
  },

  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: SH(100),
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: SW(1),
    borderColor: Colors.border,
  },
  notifCardUnread: {
    borderColor: Colors.vibrantRed + '60',
    backgroundColor: Colors.vibrantRed + '05',
  },

  notifIcon: {
    width: SW(44),
    height: SH(44),
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notifIconText: {
    fontSize: SF(20),
  },

  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: SH(2),
  },
  notifMessage: {
    fontSize: SF(12),
    color: Colors.textMid,
    marginBottom: SH(4),
  },
  notifSubtitle: {
    fontSize: SF(11),
    color: Colors.textLight,
    marginBottom: SH(4),
  },
  notifTime: {
    fontSize: SF(10),
    color: Colors.textLight,
    fontWeight: '500',
  },

  unreadDot: {
    width: SW(8),
    height: SH(8),
    borderRadius: SW(4),
    backgroundColor: Colors.vibrantRed,
    marginRight: Spacing.sm,
  },
  notifArrow: {
    fontSize: SF(18),
    color: Colors.textLight,
    fontWeight: '300',
  },
});
