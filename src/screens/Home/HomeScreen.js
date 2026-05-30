// src/screens/Home/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Alert, RefreshControl, SafeAreaView, Image, Linking, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, getBillSummary, getMyBills, getBillingConfig, getEmergencyAlerts, getEmergencyConfig, triggerSOS, acknowledgeAlert, getNotifications, markNotificationRead, getReadNotificationIds, getRegistrations, getPendingVisitors, getNotices, getCommunityPosts } from '../../services/api';
import { handleNewNotifications, initializeNotificationService } from '../../services/NotificationService';
import { processBills } from '../../services/billingUtils';
import { useNotifications } from '../../navigation';
import { useState as useLocalState, useEffect as useLocalEffect } from 'react';
import LocalNotificationService from '../../services/LocalNotificationService';
import { SFCard, GradientCard, SectionHeader, StatusBadge, EmptyState, NotificationBell, NotificationBadge, VisitorArrivalAlert, VoiceBot, VoiceBotFloatingButton } from '../../components';
import { Colors, Radius, Shadow, Spacing, GradientColors, Fonts } from '../../theme';
import { useVoiceBot } from '../../context/VoiceBotContext';
import { SF, SH, SW } from '../../utils/responsive';

const QUICK_ACTIONS = [
  { emoji: '💳', label: 'Bills',     nav: 'BillsTab'    },
  { emoji: '🚶', label: 'Visitors',  nav: 'VisitorsTab' },
  { emoji: '👥', label: 'Community', nav: 'CommunityTab'},
  { emoji: '👤', label: 'Profile',   nav: 'ProfileTab'  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; return 'evening';
}

// ── Weather gradient based on time of day ────────────────────
// New Design System: Charcoal, Gray-Green, Vibrant Red, Off-White
function getHeaderGradient() {
  return ['#0B4EA2', '#007BFF', '#00BFA6', '#39B54A'];
}

// ── Weather elements based on time of day ────────────────────
function getWeatherElements() {
  const h = new Date().getHours();
  
  if (h < 12) {
    // Morning: Sunrise & Clouds
    return (
      <View style={styles.weatherContainer}>
        <Text style={styles.sunriseEmoji}>🌅</Text>
        <Text style={[styles.cloudEmoji, { marginLeft: 20 }]}>☁️</Text>
        <Text style={[styles.cloudEmoji, { marginLeft: 60, marginTop: 10 }]}>☁️</Text>
      </View>
    );
  } else if (h < 17) {
    // Afternoon: Full Sun & Clouds
    return (
      <View style={styles.weatherContainer}>
        <Text style={styles.sunEmoji}>☀️</Text>
        <Text style={[styles.cloudEmoji, { marginLeft: 30 }]}>☁️</Text>
        <Text style={[styles.cloudEmoji, { marginLeft: 70, marginTop: 10 }]}>☁️</Text>
      </View>
    );
  } else {
    // Evening: Moon & Stars with dark theme
    return (
      <View style={styles.weatherContainer}>
        <Text style={styles.moonEmoji}>🌙</Text>
        <Text style={[styles.starEmoji, { marginLeft: -30, marginTop: -20 }]}>⭐</Text>
        <Text style={[styles.starEmoji, { marginLeft: 40, marginTop: -50 }]}>✨</Text>
        <Text style={[styles.starEmoji, { marginLeft: 80, marginTop: -30 }]}>⭐</Text>
      </View>
    );
  }
}

export default function HomeScreen({ navigation, route }) {
  const { counts: notifCounts, loadCounts } = useNotifications();
  const [localUnreadCount, setLocalUnreadCount] = useLocalState(0);

  // Debug: Verify Fonts are loaded
  console.log('🎨 [HomeScreen] Fonts loaded:', {
    bold: Fonts.bold,
    medium: Fonts.medium,
    regular: Fonts.regular,
  });

  // Sync local unread count with LocalNotificationService
  useLocalEffect(() => {
    const fetchLocalUnread = async () => {
      try {
        const count = await LocalNotificationService.getUnreadCount();
        setLocalUnreadCount(count);
      } catch (err) {
        setLocalUnreadCount(0);
      }
    };
    fetchLocalUnread();
    const interval = setInterval(fetchLocalUnread, 10000);
    return () => clearInterval(interval);
  }, []);
  const [user,        setUser]       = useState(null);
  const [society,     setSociety]    = useState(null);
  const [summary,     setSummary]    = useState(null);
  const [alerts,      setAlerts]     = useState([]);
  const [sosNum,      setSosNum]     = useState('112');
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [sosHolding,  setSosHolding] = useState(false);
  const [bellCounts,  setBellCounts] = useState({ visitors: 0, bills: 0, notices: 0, community: 0 });
  
  // Visitor arrival alert state
  const [visitorAlertVisible, setVisitorAlertVisible] = useState(false);
  const [visitorArrivalData, setVisitorArrivalData] = useState(null);

  // VoiceBot state
  const [voiceBotVisible, setVoiceBotVisible] = useState(false);
  const { startListening } = useVoiceBot();

  const sosProgress = useRef(new Animated.Value(0)).current;
  const sosTimer    = useRef(null);
  const sosAnim     = useRef(null);
  const refreshInterval = useRef(null);

  // Monitor notifCounts changes
  useEffect(() => {
    console.log(`📊 [HomeScreen] notifCounts updated:`, notifCounts);
  }, [notifCounts]);

  // ── Handle visitor arrival alert ──────────────────────────
  const handleVisitorArrival = async (visitorNotification) => {
    try {
      console.log('🚪 [HomeScreen] Processing visitor arrival:', visitorNotification.id);
      
      // Fetch registrations to find pending visitor
      const registrations = await getRegistrations();
      const allRegs = registrations.data?.data || [];
      
      // Find most recent pending visitor
      let visitorData = allRegs.find(r => 
        r && (r.status || '').toLowerCase() === 'pending'
      );
      
      if (!visitorData) {
        console.warn('⚠️ [HomeScreen] No pending visitor found');
        return;
      }
      
      console.log('✅ [HomeScreen] Showing visitor alert for:', visitorData.name);
      setVisitorArrivalData(visitorData);
      setVisitorAlertVisible(true);
    } catch (err) {
      console.error('❌ [HomeScreen] Error getting visitor data:', err.message);
    }
  };
  
  const handleVisitorAlertClose = async (result) => {
    setVisitorAlertVisible(false);
    
    if (result?.action === 'approved') {
      console.log('✅ [HomeScreen] Visitor approved:', result.visitorName);
      await loadCounts();
    } else if (result?.action === 'rejected') {
      console.log('❌ [HomeScreen] Visitor rejected:', result.visitorName);
      await loadCounts();
    }
    
    setVisitorArrivalData(null);
  };

  // ── Load notification counts from API ──────────────────
  const load = async (quiet = false) => {
    try {
      console.log('📡 [API] Fetching home data...');
      
      const [meRes, billsRes, configRes, alertRes, cfgRes, pendingRes] = await Promise.allSettled([
        getMe(), 
        getMyBills(),  // Get actual bills
        getBillingConfig(),  // Get billing config to process bills correctly
        getEmergencyAlerts(), 
        getEmergencyConfig(),
        getPendingVisitors(),  // NEW: Check for pending visitors on startup
      ]);
      
      // Log results
      if (meRes.status === 'fulfilled') {
        console.log('✅ [API] getMe() success:', meRes.value.data?.data?.user?.name);
        const d = meRes.value.data?.data;
        if (d?.user)    { setUser(d.user); AsyncStorage.setItem('user', JSON.stringify(d.user)); }
        if (d?.society) { setSociety(d.society); AsyncStorage.setItem('society', JSON.stringify(d.society)); }
      } else {
        console.log('❌ [API] getMe() failed:', meRes.reason?.message);
      }
      
      if (billsRes.status === 'fulfilled') {
        const rawBills = billsRes.value.data?.data || [];
        console.log('✅ [API] getMyBills() success, total bills:', rawBills.length);
        
        // Get billing config for processing
        let billingConfig = {};
        if (configRes.status === 'fulfilled') {
          billingConfig = configRes.value.data?.data || {};
          console.log('✅ [API] getBillingConfig() success');
        }
        
        // Process bills with status calculation (pending, overdue, paid)
        const processedBills = processBills(rawBills, billingConfig);
        
        // Count pending bills (not including overdue)
        const pendingBills = processedBills.filter(b => b.status === 'pending');
        const overdueBills = processedBills.filter(b => b.status === 'overdue');
        
        const pendingCount = pendingBills.length;
        const pendingAmount = pendingBills.reduce((sum, b) => sum + (b.amount || 0), 0);
        const overdueCount = overdueBills.length;
        const overdueAmount = overdueBills.reduce((sum, b) => sum + (b.amount || 0), 0);
        
        console.log(`   📊 Pending: ${pendingCount}, Amount: ₹${pendingAmount}`);
        console.log(`   ⚠️  Overdue: ${overdueCount}, Amount: ₹${overdueAmount}`);
        
        // Store in summary state with calculated values
        setSummary({
          unpaid_count: pendingCount,
          unpaid_amount: pendingAmount,
          overdue_count: overdueCount,
          total_overdue: overdueAmount,
        });
        setBellCounts(prev => ({ ...prev, bills: pendingCount + overdueCount }));
      } else {
        console.log('❌ [API] getMyBills() failed:', billsRes.reason?.message);
        setSummary({ unpaid_count: 0, unpaid_amount: 0, overdue_count: 0, total_overdue: 0 });
      }
      
      if (alertRes.status === 'fulfilled') {
        console.log('✅ [API] getEmergencyAlerts() success, count:', alertRes.value.data?.data?.length || 0);
        setAlerts(alertRes.value.data?.data || []);
      } else {
        console.log('❌ [API] getEmergencyAlerts() failed:', alertRes.reason?.message);
      }
      
      if (cfgRes.status === 'fulfilled') {
        console.log('✅ [API] getEmergencyConfig() success');
        setSosNum(cfgRes.value.data?.data?.sos_number || '112');
      } else {
        console.log('❌ [API] getEmergencyConfig() failed:', cfgRes.reason?.message);
      }

      // NEW: Check for pending visitors on app startup
      if (pendingRes.status === 'fulfilled') {
        const pendingVisitors = pendingRes.value || [];
        console.log(`🚪 [API] getPendingVisitors() success, found: ${pendingVisitors.length}`);
        
        // Show modal for first pending visitor if any exist
        if (pendingVisitors.length > 0) {
          console.log('🚪 [HomeScreen] Showing pending visitor alert for:', pendingVisitors[0].visitor_name || pendingVisitors[0].name);
          setVisitorArrivalData(pendingVisitors[0]);
          setVisitorAlertVisible(true);
        }
      } else {
        console.log('⚠️  [API] getPendingVisitors() failed:', pendingRes.reason?.message);
      }

      // NEW: Notification counts are managed by NotificationContext
      // Just reload the counts which will update the bell badge automatically
      await loadCounts();
      console.log('📊 [HomeScreen] Notification counts reloaded from context');

      // Show notification popups if needed
      try {
        const res = await getNotifications();
        const notifications = res.data?.data || [];
        const readIds = await getReadNotificationIds();
        const unreadNotifications = notifications.filter(n => !readIds.includes(n.id));
        
        if (unreadNotifications.length > 0) {
          const navigationCallbacks = {
            toVisitors: () => navigation.navigate('VisitorsTab'),
            toComplaints: () => navigation.navigate('ComplaintsTab'),
            toSecurity: () => navigation.navigate('HomeTab'),
            toProfile: () => navigation.navigate('ProfileTab'),
          };
          handleNewNotifications(unreadNotifications, navigationCallbacks);
          
          // Show visitor arrival modal for first pending visitor notification
          const visitorNotif = unreadNotifications.find(n => n.type === 'visitor_request');
          if (visitorNotif) {
            console.log('🚪 [HomeScreen] Found visitor_request notification, showing modal');
            await handleVisitorArrival(visitorNotif);
          }
        }
      } catch (err) {
        console.warn('[HomeScreen] Failed to fetch notifications:', err.message);
      }
    } catch (err) {
      console.error('❌ [API] Load error:', err.message);
    }

    // ── Update bell notification counts ──────────────────
    try {
      const [noticesRes, communityRes, visitorsRes] = await Promise.allSettled([
        getNotices(),
        getCommunityPosts(),
        getPendingVisitors(),
      ]);

      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const oneDayMs  = 24 * 60 * 60 * 1000;

      const noticesList   = noticesRes.status   === 'fulfilled' ? (noticesRes.value?.data?.data   || []) : [];
      const communityList = communityRes.status === 'fulfilled' ? (communityRes.value?.data?.data  || []) : [];
      const visitorsList  = visitorsRes.status  === 'fulfilled' ? (Array.isArray(visitorsRes.value) ? visitorsRes.value : []) : [];

      const recentNotices   = noticesList.filter(n => n?.created_at && (now - new Date(n.created_at).getTime()) < sevenDays).length;
      const recentCommunity = communityList.filter(p => p?.created_at && (now - new Date(p.created_at).getTime()) < oneDayMs).length;

      setBellCounts(prev => ({
        visitors:  visitorsList.length,
        bills:     (prev.bills),  // bills already set via setSummary above
        notices:   recentNotices,
        community: recentCommunity,
      }));
    } catch (_) {}

    setLoading(false); 
    setRefreshing(false);
  };

  // ── Check for pending visitors periodically ──────────────
  const checkPendingVisitors = async () => {
    try {
      console.log('🔄 [HomeScreen] Checking for pending visitors...');
      const pendingVisitors = await getPendingVisitors();
      const pending = Array.isArray(pendingVisitors) ? pendingVisitors : [];
      
      console.log(`📋 [HomeScreen] Found ${pending.length} pending visitors`);
      
      // Show alert if there are pending visitors and no modal is currently shown
      if (pending.length > 0 && !visitorAlertVisible && !visitorArrivalData) {
        const mostRecentVisitor = pending[0];
        console.log('🚪 [HomeScreen] New pending visitor detected:', mostRecentVisitor.name);
        setVisitorArrivalData(mostRecentVisitor);
        setVisitorAlertVisible(true);
      }
    } catch (err) {
      console.error('⚠️ [HomeScreen] Error checking for pending visitors:', err.message);
    }
  };

  useEffect(() => { 
    // Initialize notification service for showing popups
    initializeNotificationService();
    
    load();
    
    // Start polling for pending visitors every 10 seconds (faster than VisitorsScreen because this is critical)
    console.log('⏰ [HomeScreen] Starting pending visitor poll (every 10s)');
    const pendingInterval = setInterval(() => {
      checkPendingVisitors();
    }, 10000);
    
    return () => {
      if (pendingInterval) {
        clearInterval(pendingInterval);
        console.log('⏰ [HomeScreen] Pending visitor poll stopped');
      }
    };
  }, []);

  // NEW: Reload notification counts from context whenever Home tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Reload counts from NotificationContext (which reads inside_visitors_count from AsyncStorage)
      loadCounts();
      console.log('👥 [HomeScreen] Focus - Reloading notification counts from context');
    }, [loadCounts])
  );

  // ── SOS hold logic ─────────────────────────────────────────
  const startSos = () => {
    setSosHolding(true);
    sosProgress.setValue(0);
    sosAnim.current = Animated.timing(sosProgress, {
      toValue: 1, duration: 3000, useNativeDriver: false,
    });
    sosAnim.current.start(({ finished }) => {
      if (finished) fireSos();
    });
  };

  const stopSos = () => {
    sosAnim.current?.stop();
    sosProgress.setValue(0);
    setSosHolding(false);
  };

  const fireSos = async () => {
    setSosHolding(false); 
    sosProgress.setValue(0);
    try {
      // Trigger SOS on server
      await triggerSOS('SOS from Home screen');
      Alert.alert('🆘 SOS Sent!', `Emergency services notified.\nCalling ${sosNum} now...`, [{ text: 'OK' }]);
      // Make the actual call immediately
      Linking.openURL(`tel:${sosNum}`).catch(() => {
        Alert.alert('Error', `Cannot make call. Please dial ${sosNum} manually.`);
      });
    } catch (err) {
      console.log('SOS error:', err.message);
      // Fallback: still try to call the number
      Linking.openURL(`tel:${sosNum}`).catch(() => {
        Alert.alert('🆘 SOS', `Please dial ${sosNum} manually.`);
      });
    }
  };

  const dismissAlert = async (id) => {
    await acknowledgeAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Clear saved data and return to login?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          console.log('🚪 Logging out...');
          await AsyncStorage.multiRemove(['token', 'user', 'society']);
          console.log('✅ Data cleared, returning to login');
          navigation.replace('Login');
        },
      },
    ]);
  };

  const unpaid      = summary?.unpaid_count ?? summary?.count_pending ?? 0;  // Bill count (from API unpaid_count or count_pending)
  const unpaidAmt   = summary?.unpaid_amount ?? summary?.total_pending ?? 0; // Amount due (from API unpaid_amount or total_pending)
  const overdue     = summary?.overdue_count ?? 0;  // Bills past due date
  const overdueAmt  = summary?.total_overdue ?? 0;  // Total overdue amount (NEW from billing algorithm)
  const hasBalance  = unpaid > 0 || overdue > 0;    // Show card if ANY unpaid/overdue
  const name        = user?.name?.split(' ')[0] ?? 'Resident';
  const flat        = user?.flat_no ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.vibrantRed}
          onRefresh={() => { setRefreshing(true); load(true); }} />}>

        {/* ── DYNAMIC HEADER WITH GRADIENT + WEATHER + NOTIFICATION + SOS ──────────────────────────────── */}
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <LinearGradient colors={getHeaderGradient()} style={styles.header}>
          {/* Weather Background Elements */}
          {getWeatherElements()}
          
          {/* Header Content */}
          <View style={styles.headerRow}>
            {/* Hamburger Menu Button */}
            <TouchableOpacity
              onPress={() => route?.params?.openSidebar && route.params.openSidebar()}
              style={styles.hamburgerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={styles.hamburgerLines}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
              <Text style={styles.hamburgerArrow}>›</Text>
            </TouchableOpacity>

            {/* Left: Greeting + Name */}
            <View style={{ flex: 1 }}>
              <Text style={styles.greetSub}>GOOD {greeting().toUpperCase()}</Text>
              <Text style={styles.greetName}>{name}</Text>
            </View>

            {/* Right: Notification Bell + SOS Button */}
            <View style={styles.headerIconsSection}>
              {/* Notification Bell */}
              {(() => {
                const total = Object.values(bellCounts).reduce((a, b) => a + b, 0);
                return (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    style={styles.notificationBellWrapper}
                    activeOpacity={0.75}>
                    <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.white} />
                    {total > 0 && (
                      <View style={styles.bellBadge}>
                        <Text style={styles.bellBadgeText}>{total > 99 ? '99+' : total}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })()}

              {/* SOS Button */}
              <TouchableOpacity
                onLongPress={startSos}
                onPressOut={stopSos}
                delayLongPress={100}
                style={styles.sosWrap}>
                <Animated.View style={[styles.sosRing, {
                  borderColor: sosHolding ? Colors.vibrantRed : 'rgba(255,255,255,0.3)',
                  borderWidth: SW(2.5),
                }]}>
                  <Animated.View style={[styles.sosInner, {
                    backgroundColor: sosProgress.interpolate({
                      inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.12)', Colors.vibrantRed],
                    }),
                  }]}>
                    <Text style={styles.sosEmoji}>🆘</Text>
                  </Animated.View>
                </Animated.View>
                <Text style={styles.sosHint}>{sosHolding ? 'HOLDING...' : 'HOLD'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Society Info Pill */}
          <View style={styles.societyPill}>
            <Text style={styles.societyIcon}>🏘️</Text>
            <Text style={styles.societyName} numberOfLines={1}>{society?.name ?? 'SocietyFlow'}</Text>
            {!!flat && (
              <View style={styles.flatBadge}>
                <Text style={styles.flatText}>Flat {flat}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Emergency alert banner ────────────────────── */}
          {alerts.length > 0 && (
            <View style={styles.alertBanner}>
              <View style={styles.alertRow}>
                <Text style={{ fontSize: 18 }}>🚨</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.alertTitle}>{alerts[0].title}</Text>
                  {!!alerts[0].message && (
                    <Text style={styles.alertMsg} numberOfLines={2}>{alerts[0].message}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => dismissAlert(alerts[0].id)} style={styles.dismissBtn}>
                  <Text style={styles.dismissText}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Bills card ───────────────────────────────── */}
          {loading ? (
            <View style={[styles.skelCard]} />
          ) : hasBalance ? (
            <GradientCard colors={GradientColors.premiumCardHeader} onPress={() => navigation.navigate('BillsTab')}>
              <View style={styles.billsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billsLabel}>{overdue > 0 ? '⚠️ OVERDUE AMOUNT' : 'PENDING DUES'}</Text>
                  <Text style={styles.billsAmt}>₹{fmtAmt(overdue > 0 ? overdueAmt : unpaidAmt)}</Text>
                  <Text style={styles.billsSub}>
                    {overdue > 0 
                      ? `${overdue} overdue bill${overdue > 1 ? 's' : ''}`
                      : unpaid === 1 
                        ? '1 bill pending'
                        : `You have ${unpaid} pending bills`
                    }
                  </Text>
                </View>
                <View style={styles.billsIcon}>
                  <Text style={{ fontSize: 28 }}>{overdue > 0 ? '⚠️' : '💳'}</Text>
                </View>
              </View>
            </GradientCard>
          ) : (
            <SFCard style={styles.allPaidCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.paidIcon}>
                  <Text style={{ fontSize: 22 }}>✅</Text>
                </View>
                <View>
                  <Text style={styles.paidTitle}>All Bills Paid</Text>
                  <Text style={styles.paidSub}>No pending dues</Text>
                </View>
              </View>
            </SFCard>
          )}

          {/* ── Quick actions grid ───────────────────────── */}
          <SectionHeader title="Quick Actions" style={{ marginTop: 20 }} />
          <View style={styles.grid}>
            {QUICK_ACTIONS.map(({ emoji, label, nav }) => {
              let count = 0;
              if (label === 'Bills') count = notifCounts.bills;
              if (label === 'Visitors') count = notifCounts.visitors;
              if (label === 'Community') count = notifCounts.community;
              if (label === 'Profile') count = notifCounts.profile;

              return (
                <TouchableOpacity key={label} style={styles.gridItem}
                  onPress={() => navigation.navigate(nav)}>
                  <View style={styles.gridIcon}>
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    {count > 0 && <NotificationBadge count={count} size="small" />}
                  </View>
                  <Text style={styles.gridLabel}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Notices preview ──────────────────────────── */}
          <NoticesPreview navigation={navigation} />
        </View>
      </ScrollView>
      
      {/* Visitor Arrival Alert Modal */}
      <VisitorArrivalAlert
        visible={visitorAlertVisible}
        visitorData={visitorArrivalData}
        onClose={handleVisitorAlertClose}
      />

      {/* VoiceBot Modal */}
      <VoiceBot
        visible={voiceBotVisible}
        onClose={() => setVoiceBotVisible(false)}
      />

      {/* VoiceBot Floating Button */}
      <VoiceBotFloatingButton
        onPress={() => {
          setVoiceBotVisible(true);
          setTimeout(() => startListening(), 300);
        }}
        onLongPress={() => {
          setVoiceBotVisible(true);
          setTimeout(() => startListening(), 300);
        }}
      />
    </SafeAreaView>
  );
}

function NoticesPreview({ navigation }) {
  const [notices, setNotices] = useState([]);
  const [noticesError, setNoticesError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadNotices = async () => {
      try {
        const api = await import('../../services/api');
        const response = await api.getNotices();
        
        if (!isMounted) return;
        
        const data = response?.data?.data || [];
        console.log('✅ [API] getNotices() success, count:', data.length);
        setNotices(data.slice(0, 3));
        setNoticesError(null);
      } catch (err) {
        if (!isMounted) return;
        
        const errMsg = err?.response?.data?.error || err?.message || 'Failed to load notices';
        console.log('❌ [API] getNotices() failed:', errMsg);
        setNoticesError(errMsg);
        setNotices([]);
      }
    };
    
    loadNotices();
    
    return () => { isMounted = false; };
  }, []);
  
  if (noticesError) {
    return (
      <>
        <SectionHeader title="Recent Notices" />
        <View style={{ padding: 16, backgroundColor: Colors.warningLight, borderRadius: Radius.lg, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: Colors.warning }}>⚠️ Could not load notices</Text>
        </View>
      </>
    );
  }
  
  if (!notices.length) return null;
  
  return (
    <>
      <SectionHeader title="Recent Notices" action="View all"
        onAction={() => console.log('Notices not in current tab navigation')} style={{ marginTop: 20 }} />
      {notices.map((n, idx) => (
        <AnimatedNoticeCard key={n.id || idx} notice={n} index={idx} navigation={navigation} />
      ))}
    </>
  );
}

function AnimatedNoticeCard({ notice, index, navigation }) {
  const slideInAnim = useRef(new Animated.Value(-50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideInAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideInAnim },
            { scale: scaleAnim },
          ],
        },
      ]}>
      <TouchableOpacity
        style={[styles.noticeCard, { marginBottom: 10 }]}
        onPress={handlePress}
        activeOpacity={0.8}>
        <View style={styles.noticeIcon}><Text style={{ fontSize: 18 }}>📢</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
          <Text style={styles.noticeCat}>{notice.category || 'General'}</Text>
        </View>
        <Text style={{ fontSize: 16, color: Colors.textLight }}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const colorForAction = (label) => {
  const map = {
    Bills:     `${Colors.vibrantRed}20`, // 12% opacity - red tint
    Visitors:  `${Colors.grayGreen}25`, // 15% opacity - green tint
    Community: `${Colors.charcoal}10`,  // 6% opacity - charcoal tint
    Profile:   `${Colors.grayGreen}18`, // 9% opacity - lighter green
  };
  return map[label] || `${Colors.grayGreen}20`;
};

const fmtAmt = (v) => {
  const n = parseFloat(v) || 0;
  if (n >= 100000) return `${(n/100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n/1000).toFixed(1)}K`;
  return n.toFixed(0);
};

const styles = StyleSheet.create({
  // ── HEADER - Dynamic Gradient + Weather + Notifications + SOS ────────────────────
  header: {
    paddingTop: (StatusBar.currentHeight || 24) + Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 2,
    marginBottom: Spacing.md,
  },
  hamburgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SW(12),
    marginTop: SH(2),
    padding: SW(4),
  },
  hamburgerLines: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: SW(6),
  },
  hamburgerLine: {
    width: SW(24),
    height: SH(3),
    borderRadius: SW(2),
    backgroundColor: Colors.white,
    marginBottom: SH(5),
  },
  hamburgerArrow: {
    fontSize: SF(22),
    color: Colors.white,
    fontWeight: '900',
    lineHeight: SH(28),
  },
  greetSub: {
    fontSize: SF(12),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: SW(1),
    textTransform: 'uppercase',
    fontFamily: Fonts.bold,
  },
  greetName: {
    fontSize: SF(32),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: SW(-0.5),
    marginTop: Spacing.xs,
    fontFamily: Fonts.bold,
  },
  headerIconsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  notificationBellWrapper: {
    position: 'relative',
    width: SW(44),
    height: SH(44),
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: SW(1),
    borderColor: 'rgba(255,255,255,0.36)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: SF(28),
    color: Colors.white,
  },
  bellBadge: {
    position: 'absolute',
    top: SH(-6),
    right: SW(-6),
    width: SW(22),
    height: SH(22),
    borderRadius: Radius.full,
    backgroundColor: Colors.vibrantRed,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: SW(2),
    borderColor: Colors.white,
  },
  bellBadgeText: {
    color: Colors.white,
    fontSize: SF(10),
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  societyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: SW(1),
    borderColor: 'rgba(255,255,255,0.28)',
    gap: Spacing.sm,
    zIndex: 2,
  },
  societyIcon: {
    fontSize: SF(18),
  },
  societyName: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
    fontFamily: Fonts.bold,
  },
  flatBadge: {
    backgroundColor: 'rgba(244,197,66,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: SH(4),
    borderRadius: Radius.md,
  },
  flatText: {
    fontSize: SF(12),
    fontWeight: '700',
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  
  // ── Weather Elements (Background animations) ────────────────────
  weatherBg: {
    position: 'absolute',
    top: SH(0),
    left: SW(0),
    right: SW(0),
    bottom: SH(0),
    opacity: 0.8,
    zIndex: 1,
  },
  weatherContainer: {
    position: 'absolute',
    top: SH(0),
    right: SW(0),
    width: SW(200),
    height: SH(200),
    opacity: 0.6,
    zIndex: 1,
  },
  sunriseEmoji: {
    fontSize: SF(80),
    marginTop: SH(-30),
    marginLeft: SW(-20),
  },
  sunEmoji: {
    fontSize: SF(100),
    marginTop: SH(-40),
    marginLeft: SW(-10),
  },
  moonEmoji: {
    fontSize: SF(90),
    marginTop: SH(-30),
    marginLeft: SW(-10),
  },
  cloudEmoji: {
    fontSize: SF(50),
    marginTop: SH(20),
  },
  starEmoji: {
    fontSize: SF(24),
  },

  // ── SOS Button - Interactive element ──────────────────────
  sosWrap: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sosRing: {
    width: SW(54),
    height: SH(54),
    borderRadius: SW(27),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(2.5),
  },
  sosInner: {
    width: SW(44),
    height: SH(44),
    borderRadius: SW(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosEmoji: {
    fontSize: SF(20),
  },
  sosHint: {
    fontSize: SF(10),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: SW(0.5),
    fontFamily: Fonts.bold,
  },

  // ── Body Content Area (Sophisticated Playful) ────────────────────
  body: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.pageBgWithOrange,
  },

  // ── Alert Banner ──────────────────────────────────────────
  alertBanner: {
    backgroundColor: 'rgba(202,0,19,0.1)',
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.vibrantRed,
    borderWidth: SW(1),
    borderColor: Colors.vibrantRed + '25',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  alertTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.vibrantRed,
    fontFamily: Fonts.bold,
  },
  alertMsg: {
    fontSize: SF(12),
    color: Colors.textMid,
    marginTop: Spacing.xs,
    lineHeight: SH(17),
    fontFamily: Fonts.regular,
  },
  dismissBtn: {
    backgroundColor: Colors.vibrantRed,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  dismissText: {
    fontSize: SF(12),
    color: Colors.white,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },

  // ── Skeleton Card - Loading state ────────────────────────
  skelCard: {
    height: SH(120),
    borderRadius: Radius.xxl,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadow.soft,
  },

  // ── Bills Card - Hero Feature Card ────────────────────
  billsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billsLabel: {
    fontSize: SF(10),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: SW(0.8),
  },
  billsAmt: {
    fontSize: SF(32),
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: SW(-0.5),
    marginTop: SH(6),
  },
  billsSub: {
    fontSize: SF(12),
    color: 'rgba(255,255,255,0.70)',
    marginTop: SH(3),
  },
  // ── Bill Card Actions ──────────────────────────────────────
  billsIcon: {
    width: SW(60),
    height: SH(60),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: SW(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(2),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  // ── All Paid Card - Success state ────────────────────────
  allPaidCard: {
    backgroundColor: Colors.bgWhite,
    borderWidth: SW(2),
    borderColor: Colors.success,
  },
  paidIcon: {
    width: SW(48),
    height: SH(48),
    backgroundColor: Colors.successLight,
    borderRadius: SW(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidTitle: {
    fontSize: SF(15),
    fontWeight: '600',
    color: Colors.textDark,
    letterSpacing: SW(0.1),
  },
  paidSub: {
    fontSize: SF(12),
    color: Colors.textMid,
    marginTop: SH(2),
  },

  // ── Quick Actions Grid (Secondary Feed Items Style) ──────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  gridIcon: {
    width: SW(56),
    height: SH(56),
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.soft,
    borderWidth: SW(1),
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  gridLabel: {
    fontSize: SF(13),
    fontWeight: '700',
    color: Colors.charcoal,
    textAlign: 'center',
    letterSpacing: SW(0.3),
    fontFamily: Fonts.bold,
  },

  // ── Notice Card - List item styling ──────────────────────
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: SW(1),
    borderColor: `${Colors.grayGreen}4D`, // 30% opacity
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.soft,
  },
  noticeIcon: {
    width: SW(48),
    height: SH(48),
    backgroundColor: `${Colors.grayGreen}20`, // 12% opacity background
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(1),
    borderColor: `${Colors.grayGreen}40`, // 25% opacity
  },
  noticeTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.charcoal,
    letterSpacing: SW(0.2),
    fontFamily: Fonts.bold,
  },
  noticeCat: {
    fontSize: SF(11),
    color: Colors.grayGreen,
    marginTop: Spacing.xs,
    fontFamily: Fonts.regular,
  },
});
