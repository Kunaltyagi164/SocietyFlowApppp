// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Shadow } from '../theme';
import * as api from '../services/api';

export default function Sidebar({ visible, onClose, navigation }) {
  const [unreadPostCount, setUnreadPostCount] = useState(0);
  const [pendingVisitorCount, setPendingVisitorCount] = useState(0);

  // Load counts when sidebar becomes visible
  useEffect(() => {
    if (visible) {
      loadCounts();
    }
  }, [visible]);

  const loadCounts = async () => {
    try {
      // Load unread posts count
      const storedUnread = await AsyncStorage.getItem('community_unread_posts');
      const unread = storedUnread ? JSON.parse(storedUnread) : [];
      setUnreadPostCount(Array.isArray(unread) ? unread.length : 0);
      
      // Load pending visitors count
      const storedPending = await AsyncStorage.getItem('pending_visitors');
      const pending = storedPending ? JSON.parse(storedPending) : [];
      setPendingVisitorCount(Array.isArray(pending) ? pending.length : 0);
      
      console.log(`📖 [Sidebar] Loaded ${unread.length} unread posts, ${pending.length} pending visitors`);
    } catch (err) {
      console.warn('⚠️ Failed to load counts:', err.message);
      setUnreadPostCount(0);
      setPendingVisitorCount(0);
    }
  };

  const menuItems = [
    // Main Features
    { iconName: 'home-outline', label: 'Home', route: 'HomeTab', category: 'main' },
    { iconName: 'credit-card-outline', label: 'Bills & Payment', route: 'Bills', category: 'main' },
    { iconName: 'chat-outline', label: 'Complaints', route: 'Issues', category: 'main' },
    { iconName: 'walk', label: 'Visitors', route: 'Visitors', category: 'main' },
    { iconName: 'account-group-outline', label: 'Community', route: 'Community', category: 'main' },
    { iconName: 'account-outline', label: 'Profile', route: 'Profile', category: 'main' },
    
    // Marketplace
    { iconName: 'store-outline', label: 'Marketplace', route: 'MarketplaceTab', category: 'main' },
    { iconName: 'chart-pie', label: 'Reports', route: 'Reports', category: 'main' },
    
    // Additional Features
    { iconName: 'bullhorn-outline', label: 'Notices', route: 'Notices', category: 'features' },
    { iconName: 'file-document-outline', label: 'Documents', route: 'Docs', category: 'features' },
    { iconName: 'storefront-outline', label: 'Vendors', route: 'Vendors', category: 'features' },
    { iconName: 'chart-bar', label: 'Polls', route: 'Polls', category: 'features' },
    { iconName: 'alert-outline', label: 'Emergency', route: 'Emergency', category: 'features' },
    
    // New High-Value Features
    { iconName: 'office-building-outline', label: 'Amenities', route: 'Amenities', category: 'new' },
    { iconName: 'magnify', label: 'Search', route: 'Search', category: 'new' },
    { iconName: 'account-edit-outline', label: 'Profile Management', route: 'ProfileManagement', category: 'new' },
    { iconName: 'account-multiple-outline', label: 'Family Members', route: 'FamilyMembers', category: 'new' },
  ];

  const handleNavigate = (route) => {
    navigation.navigate(route);
    onClose();
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user', 'society']);
    navigation.replace('Login');
    onClose();
  };

  const groupedItems = {
    main: menuItems.filter(item => item.category === 'main'),
    features: menuItems.filter(item => item.category === 'features'),
    new: menuItems.filter(item => item.category === 'new'),
  };

  const currentRouteName = (() => {
    try {
      const state = navigation?.getState?.();
      if (!state || !Array.isArray(state.routes)) return '';
      const active = state.routes[state.index];
      if (active?.state?.routes && typeof active.state.index === 'number') {
        return active.state.routes[active.state.index]?.name || active.name || '';
      }
      return active?.name || '';
    } catch (_) {
      return '';
    }
  })();

  const renderMenuItem = (item, idx) => {
    const isActive = currentRouteName === item.route;
    return (
      <TouchableOpacity
        key={idx}
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={() => handleNavigate(item.route)}
        activeOpacity={0.82}
      >
        {isActive && (
          <LinearGradient
            colors={['#007BFF', '#39B54A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeGradientLayer}
          />
        )}
        <MaterialCommunityIcons
          style={styles.menuIcon}
          name={item.iconName}
          size={20}
          color={isActive ? Colors.white : '#DDEBFF'}
        />
        <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>{item.label}</Text>
        {item.label === 'Community' && unreadPostCount > 0 && (
          <View style={styles.badgeContainer}>
            <View style={styles.redDot} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadPostCount}</Text>
            </View>
          </View>
        )}
        {item.label === 'Visitors' && pendingVisitorCount > 0 && (
          <View style={styles.badgeContainer}>
            <View style={styles.redDot} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingVisitorCount}</Text>
            </View>
          </View>
        )}
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={isActive ? Colors.white : Colors.teal}
          style={styles.menuArrow}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sidebarContainer}>
          <LinearGradient
            colors={['#0A2B5E', '#0B4EA2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.sidebarLogo}>
                  <Image 
                    source={require('../assets/logo-dark.png')}
                    style={styles.sidebarLogoImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.logoText}>
                  <Text style={styles.societyText}>Society</Text>
                  <Text style={styles.flowText}>Flow</Text>
                </Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Main Features */}
            <View style={styles.menuGroup}>
              <Text style={styles.groupTitle}>MAIN FEATURES</Text>
              {groupedItems.main.map(renderMenuItem)}
            </View>

            {/* Additional Features */}
            <View style={styles.menuGroup}>
              <Text style={styles.groupTitle}>FEATURES</Text>
              {groupedItems.features.map(renderMenuItem)}
            </View>

            {/* New High-Value Features */}
            <View style={styles.menuGroup}>
              <Text style={styles.groupTitle}>NEW & ENHANCED</Text>
              {groupedItems.new.map(renderMenuItem)}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.logoutBtn]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="logout" size={18} color={Colors.danger} style={styles.logoutIcon} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Clickable overlay to close */}
        <TouchableOpacity
          style={styles.closeOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(4,18,42,0.56)',
  },

  sidebarContainer: {
    width: 280,
    backgroundColor: 'transparent',
    height: '100%',
    ...Shadow.card,
    borderRightWidth: 1,
    borderRightColor: 'rgba(126,217,87,0.45)',
    overflow: 'hidden',
  },

  logoSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126,217,87,0.35)',
  },

  sidebarLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },

  sidebarLogoImage: {
    width: 60,
    height: 60,
  },

  logoText: {
    fontSize: 16,
    fontWeight: '800',
    flexDirection: 'row',
    letterSpacing: -0.5,
  },
  societyText: {
    color: '#D9E9FF',
    fontWeight: '800',
  },
  flowText: {
    color: '#7ED957',
    fontWeight: '800',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126,217,87,0.35)',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },

  scrollView: {
    flex: 1,
  },

  menuGroup: {
    paddingVertical: 8,
  },

  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B8D2F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    letterSpacing: 0.5,
  },

  menuItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginVertical: 2,
    marginHorizontal: 8,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },

  menuItemActive: {
    borderColor: 'rgba(255,255,255,0.2)',
  },

  activeGradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  menuIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },

  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#EEF6FF',
  },

  menuLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  badge: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },

  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },

  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },

  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  menuArrow: {
    marginLeft: 8,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(126,217,87,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },

  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    gap: 8,
  },

  logoutBtn: {
    backgroundColor: 'rgba(229,57,53,0.16)',
  },

  logoutIcon: {
    marginRight: 2,
  },

  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
  },

  closeOverlay: {
    flex: 1,
  },
});
