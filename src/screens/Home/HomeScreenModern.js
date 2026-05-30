// src/screens/Home/HomeScreenModern.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, Alert, ActivityIndicator,
  FlatList, Image, Animated, Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

// Imports
import { getMe, getMyBills, getBillingConfig, getEmergencyAlerts, getComplaints,
         getNotifications, getRegistrations, getNotices, acknowledgeEmergencyAlert,
         getCommunityPosts } from '../../services/api';
import { processBills } from '../../services/billingUtils';
import { useNotifications } from '../../navigation';
import LocalNotificationService from '../../services/LocalNotificationService';

// Components
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import StatCard from '../../components/dashboard/StatCard';
import ActionButton from '../../components/dashboard/ActionButton';
import EmergencyAlertModal from '../../components/EmergencyAlertModal';
import { ScreenBackground } from '../../components';
import { COLORS, SHADOWS } from '../../utils/colors';
import { SF, SH, SW } from '../../utils/responsive';

// Helper to render icon or image
// Quick Actions Configuration - Using Emojis
const QUICK_ACTIONS = [
  { 
    id: 'visitor', 
    title: 'Add Visitor', 
    iconName: 'account-plus-outline',
    nav: 'VisitorsTab',
    bgColor: COLORS.visitorBg
  },
  { 
    id: 'complaint', 
    title: 'Complaint', 
    iconName: 'clipboard-text-outline',
    nav: 'ComplaintsTab',
    bgColor: COLORS.dueBg
  },
  { 
    id: 'reports', 
    title: 'Reports', 
    iconName: 'chart-box-outline',
    nav: 'Reports',
    bgColor: COLORS.workOrderBg
  },
  { 
    id: 'emergency', 
    title: 'Emergency', 
    iconName: 'phone-alert',
    nav: 'Emergency',
    bgColor: COLORS.announcementBg
  },
];

// Announcement Card Component with Scrolling Text
function AnnouncementCardWithScroll({ announcement, isLast, onPress }) {
  const scrollViewRef = useRef(null);
  const scrollOffsetX = useRef(new Animated.Value(0)).current;
  
  const createdDate = announcement.created_at ? new Date(announcement.created_at) : new Date();
  const now = new Date();
  const diffMs = now - createdDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  let timeAgo = 'Just now';
  if (diffMins > 0 && diffMins < 60) timeAgo = `${diffMins}m ago`;
  else if (diffHours > 0 && diffHours < 24) timeAgo = `${diffHours}h ago`;
  else if (diffDays > 0) timeAgo = `${diffDays}d ago`;

  const description = announcement.content || announcement.message || announcement.description || announcement.body || 'No details';

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.announcementCard,
        !isLast && styles.announcementCardWithBorder
      ]}
    >
      <View style={styles.announcementIcon}>
        <MaterialCommunityIcons name="bullhorn-outline" size={20} color={COLORS.primary} style={styles.announcementEmoji} />
      </View>
      <View style={styles.announcementContent}>
        <Text style={styles.announcementTitle} numberOfLines={1}>
          {announcement.title || announcement.message || 'Notice'}
        </Text>
        <Text style={styles.announcementTime}>{timeAgo}</Text>
        <View style={styles.descriptionScroller}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollOffsetX } } }],
              { useNativeDriver: false }
            )}
            style={styles.descriptionScroll}
          >
            <Text style={styles.descriptionText}>
              {description}
            </Text>
          </ScrollView>
        </View>
      </View>
      <View style={styles.announcementArrow}>
        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.primary} style={styles.arrowText} />
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreenModern({ navigation, onOpenSidebar }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    visitors: 0,
    dueBills: '₹0',
    workOrders: 0,
    announcements: 0,
  });
  const [announcements, setAnnouncements] = useState([]);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState([]); // Track user's acknowledged alerts
  const [previousVisitorCount, setPreviousVisitorCount] = useState(0); // Track previous count to detect new visitors
  const emergencyPollIntervalRef = useRef(null);
  const visitorPollIntervalRef = useRef(null); // Polling for visitor updates
  const { counts, loadCounts } = useNotifications();
  const bellUnreadCount = Math.max(counts.notifications || 0, localUnreadCount || 0);

  // Load all dashboard data
  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      // Store data for notification generation
      let notificationData = {
        visitors: [],
        notices: [],
        communityMessages: [],
        bills: [],
        userFlatNo: '',
      };

      // 1. Get user & society info
      const meRes = await getMe();
      const responseData = meRes.data?.data || {};
      // Extract user and society from nested structure
      const user = responseData.user || responseData || {};
      const society = responseData.society || {};
      
      // Get first name from full name
      const firstName = user.name ? user.name.split(' ')[0] : 'Resident';
      
      // Get user's flat number for filtering
      const userFlatNo = user.flat_no || user.apartment || user.flat || '';
      notificationData.userFlatNo = userFlatNo;
      
      // Merge user data with society name for header
      const userData = {
        ...user,
        name: firstName,
        residency_name: society.name || user.residency_name || 'Green View Residency',
      };
      setUserData(userData);
      console.log('👤 User data loaded:', { 
        name: userData.name, 
        residency: userData.residency_name, 
        flatNo: userFlatNo,
        raw: user 
      });

      // 2. Get visitors count - pending registrations for user's flat
      try {
        const visRes = await getRegistrations();
        let allVisitors = visRes.data?.data || [];
        notificationData.visitors = allVisitors; // Store for notification service

        console.log('🔍 [HomeScreen] API returned visitors:', allVisitors.length, 'visitors');

        // Filter pending visitors for this flat; if flat is unknown, fallback to all pending.
        let pendingVs = allVisitors.filter(v => {
          const isPending = (v.status || '').toLowerCase() === 'pending';
          if (!isPending) return false;
          if (!userFlatNo) return true;
          return !!v.visiting_flat &&
            v.visiting_flat.toUpperCase() === userFlatNo.toUpperCase();
        });

        console.log(`📋 [HomeScreen] After filtering by flat "${userFlatNo}": ${pendingVs.length} pending visitors`);
        if (pendingVs.length === 0 && userFlatNo) {
          const flatsInData = [...new Set(allVisitors.map(v => v.visiting_flat))];
          console.log('   Available flats in data:', flatsInData);
        }

        setStats(prev => ({ ...prev, visitors: pendingVs.length }));
        setPreviousVisitorCount(pendingVs.length);
      } catch (err) {
        console.warn('Failed to load visitors:', err.message);
      }

      // 3. Get bills summary
      try {
        const billsRes = await getMyBills();
        const bills = billsRes.data?.data || [];
        notificationData.bills = bills; // Store for notification service

        // Match Bills screen logic: process bills with billing config for accurate pending/overdue status.
        let billingConfig = {};
        try {
          const configRes = await getBillingConfig();
          billingConfig = configRes.data?.data || {};
        } catch (cfgErr) {
          console.warn('[HomeScreen] Failed to load billing config for summary:', cfgErr.message);
        }

        const processed = processBills(bills, billingConfig);
        // Filter for unpaid bills (pending or overdue status)
        const dueBills = processed.filter(b => b.status === 'pending' || b.status === 'overdue');
        const totalDue = dueBills.reduce((sum, b) => {
          const amount = parseFloat(b.amount ?? b.billAmount ?? 0) || 0;
          return sum + amount;
        }, 0);
        setStats(prev => ({ ...prev, dueBills: `₹${totalDue.toLocaleString()}` }));
      } catch (err) {
        console.warn('Failed to load bills:', err.message);
      }

      // 4. Get work orders count
      try {
        const complaintsRes = await getComplaints();
        const complaints = complaintsRes.data?.data || [];

        // Keep Home count exactly in sync with Issues page: open = status !== 'resolved'.
        const openCount = complaints.filter(c => {
          const status = (c?.status || '').toString().trim().toLowerCase();
          return status !== 'resolved';
        }).length;

        setStats(prev => ({ ...prev, workOrders: openCount }));
      } catch (err) {
        console.warn('Failed to load complaints:', err.message);
      }

      // 5. Get announcements from notices
      try {
        const noticesRes = await getNotices();
        const notices = noticesRes.data?.data || [];
        notificationData.notices = notices; // Store for notification service
        const recent = notices.slice(0, 3);
        setAnnouncements(recent);
        setStats(prev => ({ ...prev, announcements: notices.length }));
      } catch (err) {
        console.warn('Failed to load notices:', err.message);
      }

      // 6. Get community messages/posts
      try {
        const communityRes = await getCommunityPosts();
        const posts = communityRes.data?.data || [];
        notificationData.communityMessages = posts; // Store for notification service
      } catch (err) {
        console.warn('Failed to load community posts:', err.message);
      }

      // 7. Check for active emergency alerts
      try {
        const alertsRes = await getEmergencyAlerts();
        const alerts = alertsRes.data?.data || [];
        const activeAlert = alerts.find(a => a.is_active === true);
        if (activeAlert) {
          console.log('🚨 [HomeScreen] Active emergency alert detected:', activeAlert.title);
          setEmergencyAlert(activeAlert);
          setShowEmergencyModal(true);
        } else {
          setEmergencyAlert(null);
          setShowEmergencyModal(false);
        }
      } catch (err) {
        console.warn('Failed to check emergency alerts:', err.message);
      }

      // Reload notification counts
      await loadCounts();
      
      // 🔔 GENERATE LOCAL NOTIFICATIONS based on home screen data
      // No API calls needed - everything from data we already loaded!
      try {
        const newNotifications = await LocalNotificationService.generateNotifications(
          notificationData
        );
        if (newNotifications.length > 0) {
          console.log(
            `🔔 [HomeScreen] Generated ${newNotifications.length} new notification(s):`,
            newNotifications.map((n) => n.title).join(', ')
          );
        }

        const unreadLocal = await LocalNotificationService.getUnreadCount();
        setLocalUnreadCount(unreadLocal);
        console.log(`🔴 [HomeScreen] Local unread notifications: ${unreadLocal}`);
      } catch (err) {
        console.warn('Failed to generate notifications:', err.message);
      }
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (err) {
      console.warn('❌ Error loading dashboard:', err.message);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Load user's acknowledged alerts from local storage
    const loadAcknowledgedAlerts = async () => {
      try {
        const stored = await AsyncStorage.getItem('acknowledgedEmergencyAlerts');
        if (stored) {
          setAcknowledgedAlerts(JSON.parse(stored));
          console.log('📱 [HomeScreen] Loaded acknowledged alerts:', JSON.parse(stored));
        }
      } catch (err) {
        console.warn('Failed to load acknowledged alerts:', err.message);
      }
    };
    loadAcknowledgedAlerts();
    
    // Set up emergency alert polling (every 15 seconds as per API)
    emergencyPollIntervalRef.current = setInterval(() => {
      checkEmergencyAlerts();
    }, 15000);

    // Set up visitor polling (every 10 seconds for faster detection)
    visitorPollIntervalRef.current = setInterval(() => {
      checkVisitorUpdates();
    }, 10000);

    return () => {
      if (emergencyPollIntervalRef.current) {
        clearInterval(emergencyPollIntervalRef.current);
      }
      if (visitorPollIntervalRef.current) {
        clearInterval(visitorPollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      try {
        await loadCounts();
        const unreadLocal = await LocalNotificationService.getUnreadCount();
        setLocalUnreadCount(unreadLocal);
      } catch (err) {
        console.warn('[HomeScreen] Failed to sync unread bell count:', err.message);
      }
    });

    return unsub;
  }, [navigation, loadCounts]);

  // Function to check for active emergency alerts
  const checkEmergencyAlerts = async () => {
    try {
      const alertsRes = await getEmergencyAlerts();
      const alerts = alertsRes.data?.data || [];
      
      // Find active alert that user hasn't already acknowledged
      const activeAlert = alerts.find(a => 
        a.is_active === true && !acknowledgedAlerts.includes(a.id)
      );
      
      if (activeAlert) {
        if (!emergencyAlert || emergencyAlert.id !== activeAlert.id) {
          console.log('🚨 [HomeScreen] New emergency alert:', activeAlert.title);
          setEmergencyAlert(activeAlert);
          setShowEmergencyModal(true);
        }
      } else {
        if (emergencyAlert) {
          console.log('✅ [HomeScreen] Emergency alert acknowledged or deactivated');
          setEmergencyAlert(null);
          setShowEmergencyModal(false);
        }
      }
    } catch (err) {
      console.warn('[HomeScreen] Failed to check emergency alerts:', err.message);
    }
  };

  // Function to check for new pending visitor registrations
  const checkVisitorUpdates = async () => {
    try {
      const userFlatNo = userData?.flat_no || userData?.apartment || userData?.flat || '';

      const visRes = await getRegistrations();
      let allVisitors = visRes.data?.data || [];

      const pendingVs = allVisitors.filter(v => {
        const isPending = (v.status || '').toLowerCase() === 'pending';
        if (!isPending) return false;
        if (!userFlatNo) return true;
        return !!v.visiting_flat &&
          v.visiting_flat.toUpperCase() === userFlatNo.toUpperCase();
      });

      const currentCount = pendingVs.length;
      console.log(`📊 [HomeScreen] Visitor check - Flat: ${userFlatNo}, Pending: ${currentCount}, Previous: ${previousVisitorCount}`);

      // Check if there are new visitors
      if (currentCount > previousVisitorCount) {
        const newVisitorsCount = currentCount - previousVisitorCount;
        console.log(`🚪 [HomeScreen] ${newVisitorsCount} new visitor(s) pending approval!`);

        // Update stats
        setStats(prev => ({ ...prev, visitors: currentCount }));
        setPreviousVisitorCount(currentCount);

        // Reload notification counts
        await loadCounts();

        // Show notification alert
        Alert.alert(
          '👤 New Visitor',
          `${newVisitorsCount} visitor${newVisitorsCount > 1 ? 's' : ''} pending approval for your unit.`,
          [
            { text: 'View', onPress: () => navigation.navigate('VisitorsTab') },
            { text: 'Later', onPress: () => {} }
          ]
        );
      } else if (currentCount < previousVisitorCount) {
        // Visitor was approved/rejected
        console.log('✅ [HomeScreen] Visitor status updated');
        setStats(prev => ({ ...prev, visitors: currentCount }));
        setPreviousVisitorCount(currentCount);
        await loadCounts();
      } else if (currentCount > 0 && previousVisitorCount === 0) {
        // First load with pending visitors
        setStats(prev => ({ ...prev, visitors: currentCount }));
        setPreviousVisitorCount(currentCount);
      }
    } catch (err) {
      console.warn('[HomeScreen] Failed to check visitor updates:', err.message);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleQuickAction = (actionNav) => {
    // Map quick action names to proper screen names
    if (actionNav === 'VisitorsTab') {
      navigation.navigate('VisitorsTab');
    } else if (actionNav === 'ComplaintsTab') {
      navigation.navigate('Issues');
    } else if (actionNav === 'BillsTab') {
      navigation.navigate('BillsTab');
    } else {
      navigation.navigate(actionNav);
    }
  };

  const handleStatCardPress = (screenName) => {
    // Map stat tile screen names to proper navigation names
    if (screenName === 'VisitorsTab') {
      navigation.navigate('VisitorsTab');
    } else if (screenName === 'BillsTab') {
      navigation.navigate('BillsTab');
    } else if (screenName === 'ComplaintsTab') {
      navigation.navigate('Issues');
    } else if (screenName === 'AnnouncementsTab') {
      navigation.navigate('Notices');
    } else {
      navigation.navigate(screenName);
    }
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleViewAllAnnouncements = () => {
    navigation.navigate('Notices');
  };

  const handleAcknowledgeEmergency = async (alertId) => {
    try {
      // Send acknowledgement to backend
      await acknowledgeEmergencyAlert(alertId);
      console.log('✅ [HomeScreen] Emergency alert acknowledged');
      
      // Add alert ID to acknowledged list (don't show again for this user)
      const updatedAcknowledged = [...acknowledgedAlerts, alertId];
      setAcknowledgedAlerts(updatedAcknowledged);
      
      // Save to local storage
      await AsyncStorage.setItem(
        'acknowledgedEmergencyAlerts',
        JSON.stringify(updatedAcknowledged)
      );
      console.log('💾 [HomeScreen] Saved acknowledged alert to local storage');
      
      // Close modal immediately
      setShowEmergencyModal(false);
      setEmergencyAlert(null);
      
      // Check for other active alerts after 500ms
      setTimeout(() => {
        checkEmergencyAlerts();
      }, 500);
    } catch (err) {
      console.error('Failed to acknowledge emergency alert:', err.message);
      Alert.alert('Error', 'Failed to acknowledge alert. Please try again.');
    }
  };

  // Render Loading State
  if (loading && !userData?.name) {
    return (
      <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <DashboardHeader 
          societyName={userData?.residency_name || 'Green View Residency'}
          userRole={userData?.name || 'Resident'}
          notificationCount={bellUnreadCount}
          onNotificationPress={handleNotificationPress}
          onMenuPress={onOpenSidebar}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  const loggedInFlat = userData?.flat_no || userData?.apartment || userData?.flat || '';

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
      {/* Emergency Alert Modal - Always on top */}
      <EmergencyAlertModal
        visible={showEmergencyModal}
        alert={emergencyAlert}
        onAcknowledge={handleAcknowledgeEmergency}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <DashboardHeader 
          societyName={userData?.residency_name || 'Green View Residency'}
          userRole={userData?.name || 'Resident'}
          notificationCount={bellUnreadCount}
          onNotificationPress={handleNotificationPress}
          onMenuPress={onOpenSidebar}
        />

        {/* Main Content */}
        <View style={styles.content}>
          {/* Greeting Section */}
          <View style={styles.greetingSection}>
            <View style={styles.greetingText}>
              <Text style={styles.greeting}>
                Hello, {userData?.name?.split(' ')[0] || 'Admin'} 👋
              </Text>
              {loggedInFlat ? (
                <Text style={styles.greetingFlat}>Flat: {loggedInFlat}</Text>
              ) : null}
              <Text style={styles.greetingSubtext}>
                Here's what's happening in your society today.
              </Text>
            </View>
            <View style={styles.buildingImage}>
              <Image
                source={require('../../assets/images/building-illustration.jpg')}
                style={styles.buildingImageContent}
                resizeMode="cover"
              />
            </View>
          </View>
          {/* Stats Grid - 2 Columns Horizontal Cards */}
          <View style={styles.section}>
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                onPress={() => handleStatCardPress('VisitorsTab')}
                activeOpacity={0.7}
                style={styles.statCardHorizontal}
              >
                <View style={[styles.statsIconWrapper, { backgroundColor: COLORS.visitorBg }]}>
                  <Text style={styles.emojiIcon}>👥</Text>
                </View>
                <View style={styles.statsContentHorizontal}>
                  <Text style={styles.statsLabel}>Visitors</Text>
                  <Text style={styles.statsValue}>{stats.visitors}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => handleStatCardPress('BillsTab')}
                activeOpacity={0.7}
                style={styles.statCardHorizontal}
              >
                <View style={[styles.statsIconWrapper, { backgroundColor: COLORS.dueBg }]}>
                  <Text style={styles.emojiIcon}>💰</Text>
                </View>
                <View style={styles.statsContentHorizontal}>
                  <Text style={styles.statsLabel}>Pending Dues</Text>
                  <Text style={styles.statsValue}>
                    {stats.dueBills === '₹0' ? 'All Clear' : stats.dueBills}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => handleStatCardPress('ComplaintsTab')}
                activeOpacity={0.7}
                style={styles.statCardHorizontal}
              >
                <View style={[styles.statsIconWrapper, { backgroundColor: COLORS.workOrderBg }]}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={COLORS.primary} style={styles.emojiIcon} />
                </View>
                <View style={styles.statsContentHorizontal}>
                  <Text style={styles.statsLabel}>Work Orders</Text>
                  <Text style={styles.statsValue}>{stats.workOrders}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => handleStatCardPress('AnnouncementsTab')}
                activeOpacity={0.7}
                style={styles.statCardHorizontal}
              >
                <View style={[styles.statsIconWrapper, { backgroundColor: COLORS.announcementBg }]}>
                  <MaterialCommunityIcons name="bullhorn-outline" size={28} color={COLORS.primary} style={styles.emojiIcon} />
                </View>
                <View style={styles.statsContentHorizontal}>
                  <Text style={styles.statsLabel}>Notices</Text>
                  <Text style={styles.statsValue}>{stats.announcements}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              {QUICK_ACTIONS.map(action => (
                <ActionButton
                  key={action.id}
                  title={action.title}
                  iconName={action.iconName}
                  bgColor={action.bgColor}
                  onPress={() => handleQuickAction(action.nav)}
                />
              ))}
            </View>
          </View>

          {/* Recent Announcements */}
          <View style={styles.section}>
            <View style={styles.announcementHeader}>
              <Text style={styles.sectionTitle}>Recent Notices</Text>
              <TouchableOpacity onPress={handleViewAllAnnouncements}>
                <Text style={styles.viewAllLink}>View All →</Text>
              </TouchableOpacity>
            </View>

            {announcements.length > 0 ? (
              <View style={styles.announcementList}>
                {announcements.map((announ, idx) => (
                  <AnnouncementCardWithScroll 
                    key={idx}
                    announcement={announ}
                    isLast={idx === announcements.length - 1}
                    onPress={() => navigation.navigate('Notices')}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.announcementCard, SHADOWS.card]}>
                <Text style={styles.emptyText}>No announcements yet</Text>
              </View>
            )}
          </View>

          {/* Footer Trust Badges */}
          <View style={styles.footer}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={COLORS.textSecondary} style={styles.badgeEmoji} />
              <Text style={styles.badgeText}>Secure</Text>
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="flash-outline" size={20} color={COLORS.textSecondary} style={styles.badgeEmoji} />
              <Text style={styles.badgeText}>Fast</Text>
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="check-decagram-outline" size={20} color={COLORS.textSecondary} style={styles.badgeEmoji} />
              <Text style={styles.badgeText}>Reliable</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: SW(16),
    paddingTop: SH(16),
    paddingBottom: SH(40),
  },
  
  // Greeting Section
  greetingSection: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: SW(12),
    padding: SW(16),
    marginBottom: SH(24),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    flex: 1,
    marginRight: SW(12),
  },
  greeting: {
    fontSize: SF(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SH(4),
  },
  greetingSubtext: {
    fontSize: SF(13),
    color: COLORS.textSecondary,
    lineHeight: SH(18),
  },
  greetingFlat: {
    fontSize: SF(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SH(4),
  },
  buildingImage: {
    width: SW(80),
    height: SH(70),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: SW(10),
    overflow: 'hidden',
  },
  buildingImageContent: {
    width: SW(80),
    height: SH(70),
  },
  buildingEmoji: {
    fontSize: SF(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SH(60),
  },
  loadingText: {
    marginTop: SH(12),
    fontSize: SF(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Section
  section: {
    marginBottom: SH(28),
  },
  sectionTitle: {
    fontSize: SF(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SH(12),
    letterSpacing: SW(-0.3),
  },

  // Stats Grid - Horizontal Cards (2 columns)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardHorizontal: {
    width: '48%',
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SW(12),
    padding: SW(14),
    marginBottom: SH(12),
    alignItems: 'center',
  },
  statsIconWrapper: {
    width: SW(50),
    height: SH(50),
    borderRadius: SW(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SW(12),
  },
  statsContentHorizontal: {
    flex: 1,
  },
  statsLabel: {
    fontSize: SF(11),
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: SW(0.3),
    marginBottom: SH(2),
  },
  statsValue: {
    fontSize: SF(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emojiIcon: {
    fontSize: SF(28),
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: SW(-8),
  },

  // Announcements
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SH(12),
  },
  viewAllLink: {
    fontSize: SF(13),
    fontWeight: '600',
    color: COLORS.primary,
  },
  announcementList: {
    backgroundColor: COLORS.card,
    borderRadius: SW(14),
    overflow: 'hidden',
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SW(14),
    backgroundColor: COLORS.card,
  },
  announcementCardWithBorder: {
    borderBottomWidth: 0,
  },
  announcementIcon: {
    fontSize: SF(20),
    marginRight: SW(12),
  },
  announcementEmoji: {
    fontSize: SF(20),
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: SF(13),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SH(2),
  },
  announcementTime: {
    fontSize: SF(11),
    color: COLORS.textSecondary,
    marginBottom: SH(6),
  },
  descriptionScroller: {
    height: SH(18),
    overflow: 'hidden',
    borderRadius: SW(2),
  },
  descriptionScroll: {
    height: SH(18),
  },
  descriptionText: {
    fontSize: SF(11),
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    paddingRight: SW(20),
    lineHeight: SH(18),
  },
  announcementArrow: {
    paddingLeft: SW(8),
  },
  arrowText: {
    fontSize: SF(18),
    color: COLORS.primary,
    fontWeight: '300',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: SF(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
    paddingVertical: SH(12),
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SH(20),
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: SH(20),
  },
  badge: {
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: SF(20),
    marginBottom: SH(4),
  },
  badgeText: {
    fontSize: SF(10),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
