// src/screens/Home/HomeScreen_NewDesign_Example.js
/**
 * UPDATED HOMESCREEN USING NEW DESIGN SYSTEM
 * This file demonstrates how to apply the Sophisticated Playful design system
 * to the HomeScreen. Use this as a reference for updating other screens.
 * 
 * Key changes:
 * 1. Charcoal (#171e19) for primary text/backgrounds
 * 2. Vibrant Red (#ca0013) exclusively for CTAs
 * 3. Gray-Green (#b7c6c2) for borders and secondary elements
 * 4. 40px border-radius (Radius.xxl) for main cards
 * 5. Nunito font family with proper weights
 * 6. New header with greeting + profile badge layout
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, RefreshControl
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Fonts, Radius, Shadow, Spacing, Typography, GradientColors } from '../../theme';
import DesignTokens from '../../theme/DesignTokens';
import { SF, SH, SW } from '../../utils/responsive';

/**
 * HEADER SECTION - Greeting + Profile Image + Notification Badge
 * Spec: 56px top padding, greeting label (12px uppercase), name (30px bold),
 *       48px circular profile image with 2px white border, 16px red badge
 */
const Header = ({ userName = "Kunal", profileImage, unreadNotifications = 3 }) => (
  <View style={[
    styles.header,
    DesignTokens.header.container
  ]}>
    {/* Left: Greeting + Name */}
    <View>
      <Text style={DesignTokens.header.greeting.label}>
        GOOD MORNING
      </Text>
      <Text style={DesignTokens.header.greeting.name}>
        {userName}
      </Text>
    </View>

    {/* Right: Profile Image + Badge */}
    <View style={{ position: 'relative' }}>
      <Image
        source={profileImage || require('../../assets/default-avatar.png')}
        style={DesignTokens.header.profileImage}
      />
      {unreadNotifications > 0 && (
        <View style={DesignTokens.header.notificationBadge}>
          <Text style={DesignTokens.header.badgeText}>
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </Text>
        </View>
      )}
    </View>
  </View>
);

/**
 * HORIZONTAL SELECTOR
 * Spec: Snap-scrollable list with inactive (56x56 white square) and
 *       active (160px pill with red circle value) states
 */
const HorizontalSelector = ({ categories = ['📊 Overview', '💳 Bills', '👥 Residents', '🚨 Alerts'] }) => (
  <ScrollView
    horizontal
    scrollEventThrottle={16}
    snapToInterval={180}
    decelerationRate="fast"
    showsHorizontalScrollIndicator={false}
    style={DesignTokens.horizontalSelector.container}
    contentContainerStyle={{ paddingRight: Spacing.lg }}
  >
    {categories.map((cat, i) => (
      <TouchableOpacity
        key={i}
        style={[
          DesignTokens.horizontalSelector.inactiveButton,
          i === 0 && DesignTokens.horizontalSelector.activeButton
        ]}
        activeOpacity={0.7}
      >
        {i === 0 ? (
          // Active state
          <>
            <Text style={DesignTokens.horizontalSelector.activeText}>
              HOME
            </Text>
            <View style={DesignTokens.horizontalSelector.activeValueCircle}>
              <Text style={{ color: Colors.white, fontSize: 14, fontWeight: 'bold' }}>
                5
              </Text>
            </View>
          </>
        ) : (
          // Inactive state
          <Text style={{ fontSize: 24 }}>{cat.split(' ')[0]}</Text>
        )}
      </TouchableOpacity>
    ))}
  </ScrollView>
);

/**
 * HERO CARD
 * Spec: 40px radius, white background, decorative blob, icon, metrics grid,
 *       alert box with red left border
 */
const HeroCard = () => (
  <View style={[
    DesignTokens.heroCard.container,
    { marginHorizontal: Spacing.lg, marginVertical: Spacing.md }
  ]}>
    {/* Decorative blob */}
    <View style={DesignTokens.heroCard.decorativeBlob} />

    {/* Icon */}
    <View style={DesignTokens.heroCard.iconContainer}>
      <Text style={{ fontSize: 32 }}>💳</Text>
    </View>

    {/* Title */}
    <Text style={[Typography.heading2, { marginBottom: Spacing.sm }]}>
      Payment Status
    </Text>

    {/* Metrics Grid */}
    <View style={DesignTokens.heroCard.metricsGrid}>
      <View style={DesignTokens.heroCard.metricCard}>
        <Text style={Typography.label}>BALANCE DUE</Text>
        <Text style={[Typography.body, { marginTop: Spacing.sm, color: Colors.vibrantRed }]}>
          ₹5,250
        </Text>
      </View>
      <View style={DesignTokens.heroCard.metricCard}>
        <Text style={Typography.label}>DUE DATE</Text>
        <Text style={[Typography.body, { marginTop: Spacing.sm }]}>
          March 31, 2026
        </Text>
      </View>
    </View>

    {/* Alert Box */}
    <View style={DesignTokens.heroCard.alertBox}>
      <Text style={[Typography.bodySmall, { color: Colors.vibrantRed }]}>
        ⚠️ Payment overdue by 2 days
      </Text>
    </View>
  </View>
);

/**
 * SECONDARY FEED ITEM
 * Spec: 24px radius, white bg, borders, icon container, heading, checkbox
 */
const FeedCard = ({ icon, title, subtitle, onCheckPress, isChecked = false }) => (
  <View style={[
    DesignTokens.feedCard.container,
    { marginHorizontal: Spacing.lg, marginVertical: Spacing.sm }
  ]}>
    {/* Icon Container */}
    <View style={DesignTokens.feedCard.iconContainer}>
      <Text style={{ fontSize: 32 }}>{icon}</Text>
    </View>

    {/* Content */}
    <View style={DesignTokens.feedCard.content}>
      <Text style={DesignTokens.feedCard.heading}>{title}</Text>
      {subtitle && (
        <Text style={[Typography.bodySmall, { marginTop: Spacing.xs }]}>
          {subtitle}
        </Text>
      )}
    </View>

    {/* Checkbox - Changes to red on hover/active */}
    <TouchableOpacity
      style={isChecked ? DesignTokens.feedCard.checkboxButtonActive : DesignTokens.feedCard.checkboxButton}
      onPress={onCheckPress}
      activeOpacity={0.85}
    >
      {isChecked && (
        <Text style={{ color: Colors.white, fontSize: 16, fontWeight: 'bold' }}>
          ✓
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

/**
 * FLOATING ACTION BUTTON
 * Spec: 56px red circle, -32px offset (floats above nav), 4px white border cutout
 */
const FloatingActionButton = ({ onPress }) => (
  <TouchableOpacity
    style={[
      DesignTokens.fab.container,
      { zIndex: 10 }
    ]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={DesignTokens.fab.icon}>+</Text>
  </TouchableOpacity>
);

/**
 * FLOATING NAVIGATION BAR
 * Spec: Fixed bottom, 64px height, charcoal bg, floating FAB offset
 */
const FloatingNav = ({ activeTab, onTabPress }) => {
  const tabs = [
    { id: 'home', icon: '🏠' },
    { id: 'bills', icon: '💳' },
    { id: 'notifications', icon: '🔔' },
    { id: 'profile', icon: '👤' },
  ];

  return (
    <>
      {/* Navigation Bar */}
      <View style={DesignTokens.floatingNav.container}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={DesignTokens.floatingNav.tabItem}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={
              activeTab === tab.id
                ? DesignTokens.floatingNav.tabIconActive
                : DesignTokens.floatingNav.tabIcon
            }>
              {tab.icon}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FAB */}
      <FloatingActionButton onPress={() => alert('Add new item')} />
    </>
  );
};

/**
 * MAIN HOMESCREEN COMPONENT
 */
export default function HomeScreenNewDesign({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [checkedItems, setCheckedItems] = useState({});

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.offWhite }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        scrollIndicatorInsets={{ right: 1 }}  // Hide scrollbar edge
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Header userName="Kunal" unreadNotifications={3} />

        {/* HORIZONTAL SELECTOR */}
        <HorizontalSelector />

        {/* HERO CARD */}
        <HeroCard />

        {/* FEED SECTION */}
        <View style={{ marginTop: Spacing.lg }}>
          <Text style={[Typography.heading2, { marginHorizontal: Spacing.lg, marginBottom: Spacing.md }]}>
            Latest Updates
          </Text>

          <FeedCard
            icon="👤"
            title="Visitor Request"
            subtitle="John Doe wants to visit Flat 305"
            isChecked={checkedItems.visitor}
            onCheckPress={() => setCheckedItems({ ...checkedItems, visitor: !checkedItems.visitor })}
          />

          <FeedCard
            icon="📋"
            title="New Notice"
            subtitle="Annual Maintenance Work - Next Week"
            isChecked={checkedItems.notice}
            onCheckPress={() => setCheckedItems({ ...checkedItems, notice: !checkedItems.notice })}
          />

          <FeedCard
            icon="⚠️"
            title="Emergency Alert"
            subtitle="Fire safety drill scheduled"
            isChecked={checkedItems.alert}
            onCheckPress={() => setCheckedItems({ ...checkedItems, alert: !checkedItems.alert })}
          />
        </View>

        {/* Bottom spacing for FAB & Nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING NAV + FAB */}
      <FloatingNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
});

/**
 * ════════════════════════════════════════════════════════════════════════════
 * DESIGN MIGRATION NOTES
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * To apply this design to existing screens:
 * 
 * 1. UPDATE COLORS:
 *    - Replace hardcoded #000000 → Colors.charcoal
 *    - Replace #F8FAFB → Colors.offWhite
 *    - Replace #54D3C2, #00B6F0 → Colors.vibrantRed (for CTAs only)
 *    - Use Colors.grayGreen for borders
 * 
 * 2. UPDATE TYPOGRAPHY:
 *    - Use Typography.heading1, Typography.heading2
 *    - Use Typography.body for standard text
 *    - Use Typography.label for secondary labels (auto-uppercase)
 * 
 * 3. UPDATE BORDER RADIUS:
 *    - Main cards: Radius.xxl (40px) - SIGNATURE
 *    - Secondary: Radius.lg (24px)
 *    - Nested: Radius.md (16px)
 * 
 * 4. UPDATE BACKGROUNDS:
 *    - Page bg: Colors.offWhite
 *    - Cards: Colors.white
 *    - Overlays: Colors.glass (80% white)
 * 
 * 5. UPDATE SHADOWS:
 *    - Cards: ...Shadow.soft
 *    - FAB: ...Shadow.strong
 * 
 * 6. UPDATE SPACING:
 *    - Use Spacing.lg, Spacing.md, Spacing.sm constants
 *    - Consistency across all screens
 */
