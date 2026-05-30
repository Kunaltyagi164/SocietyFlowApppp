// src/navigation/index.js
import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, LogBox } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';

import SplashScreen    from '../screens/Auth/SplashScreen';
import LoginScreen     from '../screens/Auth/LoginScreen';
import ChangePasswordScreen from '../screens/Auth/ChangePasswordScreen';
import HomeScreenModern from '../screens/Home/HomeScreenModern';
import BillsScreen     from '../screens/Bills/BillsScreen';
import PaymentScreen   from '../screens/Bills/PaymentScreen';
import InvoicePreviewScreen from '../screens/Bills/InvoicePreviewScreen';
import DocumentPreviewScreen from '../screens/Documents/DocumentPreviewScreen';
import ComplaintsScreen from '../screens/Complaints/ComplaintsScreen';
import NewComplaintScreen from '../screens/Complaints/NewComplaintScreen';
import DetailedComplaintScreen from '../screens/Complaints/DetailedComplaintScreen';
import VisitorsScreen  from '../screens/Visitors/VisitorsScreen';
import NewVisitorScreen from '../screens/Visitors/NewVisitorScreen';
import PreRegisterFormScreen from '../screens/Visitors/PreRegisterFormScreen';
import InviteFriendScreen from '../screens/Visitors/InviteFriendScreen';
import UpcomingPreRegistrationsScreen from '../screens/Visitors/UpcomingPreRegistrationsScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import NoticesScreen   from '../screens/Notices/NoticesScreen';
import EmergencyScreen from '../screens/Emergency/EmergencyScreen';
import ProfileScreen   from '../screens/Profile/ProfileScreen';
import ProfileManagementScreen from '../screens/Profile/ProfileManagementScreen';
import FamilyMembersScreen from '../screens/Profile/FamilyMembersScreen';
import DocumentsScreen from '../screens/Documents/DocumentsScreen';
import VendorsScreen   from '../screens/Vendors/VendorsScreen';
import ParkingScreen   from '../screens/Parking/ParkingScreen';
import ParkingStatsScreen from '../screens/Parking/ParkingStatsScreen';
import CommunityScreen from '../screens/Community/CommunityScreen';
import PollingScreen   from '../screens/Polling/PollingScreen';
import ReportsScreen   from '../screens/Reports/ReportsScreen';

import AmenitiesBookingScreen from '../screens/Amenities/AmenitiesBookingScreen';
import CCTVAlertsScreen from '../screens/Security/CCTVAlertsScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import StaffDirectoryScreen from '../screens/Staff/StaffDirectoryScreen';
import { MarketplaceFeed, MarketplaceDetail, NewListing } from '../screens/Marketplace';
import { Sidebar, NotificationBadge }     from '../components';
import { getNotifications, markNotificationRead, getReadNotificationIds } from '../services/api';

import { Colors, Radius, Shadow } from '../theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// ── Suppress benign warnings ──────────────────────────────────
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'openSidebar',
]);

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

const DEFAULT_NOTIFICATION_COUNTS = {
  home: 0,
  bills: 0,
  visitors: 0,
  community: 0,
  profile: 0,
  notifications: 0,
};

const DEFAULT_NOTIFICATION_CONTEXT = {
  counts: DEFAULT_NOTIFICATION_COUNTS,
  loadCounts: async () => {},
  markAsRead: async () => {},
};

// ── Notification Context ──────────────────────────────────────
export const NotificationContext = createContext(DEFAULT_NOTIFICATION_CONTEXT);

export const NotificationProvider = ({ children }) => {
  const [counts, setCounts] = useState(DEFAULT_NOTIFICATION_COUNTS);

  const loadCounts = async () => {
    try {
      // Fetch all notifications from backend
      const response = await getNotifications();
      const notifications = response.data?.data || [];
      
      // Get list of already-read notification IDs
      const readIds = await getReadNotificationIds();
      
      // Filter unread notifications
      const unreadNotifications = notifications.filter(n => !readIds.includes(n.id));
      
      // Count notifications by type
      // NOTE: Per API guide Section 2, these are the ONLY valid notification types from /api/notifications:
      // visitor_request, stay_exceeded, complaint, cctv, pending_resident
      // Community posts come from separate endpoint: GET /api/community/posts
      const typeCounts = {
        visitor_request: 0,
        complaint: 0,
        stay_exceeded: 0,
        cctv: 0,
        pending_resident: 0,
      };
      
      unreadNotifications.forEach(notif => {
        if (typeCounts.hasOwnProperty(notif.type)) {
          typeCounts[notif.type]++;
        }
      });
      
      // Load unread community posts count from AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storedUnread = await AsyncStorage.getItem('community_unread_posts');
      const unreadPosts = storedUnread ? JSON.parse(storedUnread) : [];
      const unreadPostsCount = Array.isArray(unreadPosts) ? unreadPosts.length : 0;
      
      // NEW: Get inside visitors count from local storage (updated by VisitorsScreen)
      let insideVisitorsCount = 0;
      try {
        const storedCount = await AsyncStorage.getItem('inside_visitors_count');
        insideVisitorsCount = storedCount ? parseInt(storedCount, 10) : 0;
        console.log(`👥 [NotificationContext] Read from AsyncStorage: inside_visitors=${insideVisitorsCount}`);
      } catch (err) {
        console.warn('[NotificationContext] Failed to read visitor count from AsyncStorage:', err.message);
        insideVisitorsCount = 0;
      }
      
      // Map to our badge structure
      setCounts({
        home: typeCounts.stay_exceeded + typeCounts.cctv, // Alerts for home
        bills: 0, // Bills handled separately via GET /api/bills/my
        visitors: insideVisitorsCount, // Inside visitors count from actual check-ins
        community: unreadPostsCount, // Unread community posts from AsyncStorage
        profile: typeCounts.pending_resident, // Pending resident registrations
        notifications: unreadNotifications.length, // Total unread
      });
      
      console.log(`📊 [NotificationContext] Loaded ${unreadNotifications.length} unread notifications`);
      console.log(`   - Visitors (inside): ${insideVisitorsCount}`);
      console.log(`   - Alerts (stay exceeded + CCTV): ${typeCounts.stay_exceeded + typeCounts.cctv}`);
      console.log(`   - Complaints: ${typeCounts.complaint}`);
      console.log(`   - Pending Residents: ${typeCounts.pending_resident}`);
      console.log(`   - Unread Community Posts: ${unreadPostsCount}`);
      
    } catch (err) {
      console.warn('[NotificationContext] Failed to load notifications:', err.message);
      // Use default zeros on error
      setCounts(DEFAULT_NOTIFICATION_COUNTS);
    }
  };

  const markAsRead = async (id) => {
    try {
      // Mark notification as read in local storage
      await markNotificationRead(id);
      // Reload counts after marking as read
      await loadCounts();
      console.log(`✅ Notification ${id} marked as read`);
    } catch (err) {
      console.warn('[NotificationContext] Failed to mark as read:', err.message);
    }
  };

  useEffect(() => {
    loadCounts();
    // Refresh every 20 seconds (background polling)
    const interval = setInterval(loadCounts, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ counts, loadCounts, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext) || DEFAULT_NOTIFICATION_CONTEXT;


function MainStack({ navigation, onOpenSidebar }) {
  return (
    <MainTabs navigation={navigation} onOpenSidebar={onOpenSidebar} />
  );
}

function MainTabs({ navigation, onOpenSidebar }) {
  const { counts } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.freshGreen,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: tabStyles.tabBar,
        tabBarLabelStyle: tabStyles.tabLabel,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          let badgeCount = 0;
          switch (route.name) {
            case 'HomeTab':
              iconName = 'home-outline';
              badgeCount = counts.home;
              break;
            case 'BillsTab':
              iconName = 'credit-card-outline';
              badgeCount = counts.bills;
              break;
            case 'VisitorsTab':
              iconName = 'account-group-outline';
              badgeCount = counts.visitors;
              break;
            case 'MarketplaceTab':
              iconName = 'cart-outline';
              break;
            case 'CommunityTab':
              iconName = 'account-multiple-outline';
              badgeCount = counts.community;
              break;
            case 'ProfileTab':
              iconName = 'account-circle-outline';
              badgeCount = counts.profile;
              break;
            default:
              iconName = 'circle-small';
          }
          return (
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name={iconName} size={size} color={color} />
              {badgeCount > 0 && <NotificationBadge count={badgeCount} size="small" />}
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="HomeTab"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      >
        {(props) => (
          <HomeScreenModern
            {...props}
            onOpenSidebar={onOpenSidebar}
          />
        )}
      </Tab.Screen>
      <Tab.Screen 
        name="BillsTab"
        component={BillsScreen}
        options={{
          title: 'My Bills',
          tabBarLabel: 'Bills',
        }}
      />
      <Tab.Screen 
        name="VisitorsTab"
        component={VisitorsScreen}
        options={{
          title: 'Visitors',
          tabBarLabel: 'Visitors',
        }}
      />
      <Tab.Screen 
        name="MarketplaceTab"
        component={MarketplaceFeed}
        options={{
          title: 'Marketplace',
          tabBarLabel: 'Marketplace',
        }}
      />
      <Tab.Screen 
        name="CommunityTab"
        component={CommunityScreen}
        options={{
          title: 'Community',
          tabBarLabel: 'Community',
        }}
      />
      <Tab.Screen 
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isFromLeftEdge = evt.nativeEvent.pageX < 50;
        const isHorizontalSwipe =
          gestureState.dx > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
        return isFromLeftEdge && isHorizontalSwipe;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 80) {
          console.log('👈 [AppNavigator] Global swipe detected - opening sidebar');
          setSidebarVisible(true);
        }
      },
    })
  ).current;

  const sidebarNavigation = {
    navigate: (...args) => navigationRef.current?.navigate(...args),
    replace: (routeName, params) => {
      if (!navigationRef.isReady()) return;
      navigationRef.current?.dispatch(StackActions.replace(routeName, params));
    },
    getState: () => navigationRef.current?.getRootState?.(),
  };

  const rootRoutesWithoutBack = [
    'Splash',
    'Login',
    'ChangePassword',
    'Main',
    'HomeTab',
    'BillsTab',
    'VisitorsTab',
    'MarketplaceTab',
    'CommunityTab',
    'ProfileTab',
  ];
  const routesWithOwnBackButton = [
    'Profile',
    'ProfileManagement',
    'FamilyMembers',
    'Payment',
    'InvoicePreview',
    'PreRegisterForm',
    'NewVisitor',
    'ParkingStats',
    'MarketplaceDetail',
    'NewListing',
    'Search',
    'Staff',
    'Amenities',
    'CCTVAlerts',
  ];
  const canShowGlobalBack =
    !sidebarVisible &&
    isReady &&
    !!currentRouteName &&
    !rootRoutesWithoutBack.includes(currentRouteName) &&
    !routesWithOwnBackButton.includes(currentRouteName) &&
    !!navigationRef.current?.canGoBack?.();

  return (
    <View {...panResponder.panHandlers} style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          setIsReady(true);
          setCurrentRouteName(navigationRef.current?.getCurrentRoute?.()?.name || '');
        }}
        onStateChange={() => {
          setCurrentRouteName(navigationRef.current?.getCurrentRoute?.()?.name || '');
        }}
        fallback={<LoadingScreen />}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash"      component={SplashScreen} />
        <Stack.Screen name="Login"       component={LoginScreen} />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Main">
          {(props) => (
            <MainStack
              {...props}
              onOpenSidebar={() => setSidebarVisible(true)}
            />
          )}
        </Stack.Screen>
        {/* Bills & Payments */}
        <Stack.Screen name="Bills"       component={BillsScreen} />
        <Stack.Screen name="Payment"     component={PaymentScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen}
          options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="DocumentPreview" component={DocumentPreviewScreen}
          options={{ presentation: 'card', animation: 'slide_from_right' }} />
        {/* Complaints */}
        <Stack.Screen name="Issues"      component={ComplaintsScreen} />
        <Stack.Screen name="NewComplaint" component={NewComplaintScreen}
          options={{ presentation: 'modal' }} />
        <Stack.Screen name="DetailedComplaint" component={DetailedComplaintScreen}
          options={{ presentation: 'card', animation: 'slide_from_right' }} />
        {/* Visitors */}
        <Stack.Screen name="Visitors"    component={VisitorsScreen} />
        <Stack.Screen name="NewVisitor"  component={NewVisitorScreen}
          options={{ presentation: 'modal' }} />
        <Stack.Screen name="PreRegisterForm" component={PreRegisterFormScreen}
          options={{ presentation: 'modal' }} />
        <Stack.Screen name="InviteFriend" component={InviteFriendScreen}
          options={{ presentation: 'modal' }} />
        <Stack.Screen name="UpcomingPreReg" component={UpcomingPreRegistrationsScreen} />
        {/* Notifications */}
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        {/* Notices */}
        <Stack.Screen name="Notices"     component={NoticesScreen} />
        {/* Documents */}
        <Stack.Screen name="Docs"        component={DocumentsScreen} />
        {/* Vendors */}
        <Stack.Screen name="Vendors"     component={VendorsScreen} />
        {/* Parking */}
        <Stack.Screen name="Parking"     component={ParkingScreen} />
        <Stack.Screen name="ParkingStats" component={ParkingStatsScreen} />
        {/* Community */}
        <Stack.Screen name="Community"   component={CommunityScreen} />
        {/* Polls */}
        <Stack.Screen name="Polls"       component={PollingScreen} />
        {/* Reports */}
        <Stack.Screen name="Reports"     component={ReportsScreen} />
        {/* Amenities */}
        <Stack.Screen name="Amenities"   component={AmenitiesBookingScreen} />
        {/* CCTV Alerts */}
        <Stack.Screen name="CCTVAlerts"  component={CCTVAlertsScreen} />
        {/* Search */}
        <Stack.Screen name="Search"      component={SearchScreen} />
        {/* Marketplace */}
        <Stack.Screen name="MarketplaceDetail" component={MarketplaceDetail}
          options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="NewListing" component={NewListing}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        {/* Staff */}
        <Stack.Screen name="Staff"       component={StaffDirectoryScreen} />
        {/* Profile */}
        <Stack.Screen name="Emergency"   component={EmergencyScreen}
          options={{ presentation: 'card', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Profile"     component={ProfileScreen}
          options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ProfileManagement" component={ProfileManagementScreen} />
        <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={sidebarNavigation}
      />

      {canShowGlobalBack && (
        <TouchableOpacity
          style={styles.globalBackButton}
          onPress={() => navigationRef.current?.goBack()}
          activeOpacity={0.65}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.royalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.textWhite,
    fontSize: 16,
  },
  globalBackButton: {
    position: 'absolute',
    top: 54,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.royalBlue,
    opacity: 0.65,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Shadow.md,
    zIndex: 1200,
  },
});

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  menuButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.royalBlue,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.strong,
    zIndex: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    // Position: right side, above tab bar
    right: 20,
    bottom: 75,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
});
