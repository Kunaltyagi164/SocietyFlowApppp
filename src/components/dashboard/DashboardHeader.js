// src/components/dashboard/DashboardHeader.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, GRADIENTS, SHADOWS } from '../../utils/colors';

export default function DashboardHeader({ 
  societyName = "Green View Residency", 
  userRole = "Resident",
  notificationCount = 0,
  onNotificationPress,
  onMenuPress,
}) {
  const insets = useSafeAreaInsets();
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good Morning';
    } else if (hour < 18) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };
  
  const greeting = getGreeting();
  
  return (
    <LinearGradient
      colors={GRADIENTS.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { paddingTop: insets.top + 12, marginTop: -insets.top, marginHorizontal: -16, paddingHorizontal: 16 }]}
    >
      <View style={styles.container}>
          {/* Left menu button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="menu" size={22} color={COLORS.textInverse} />
          </TouchableOpacity>

          {/* Left: Logo + Text */}
          <View style={styles.leftSection}>
            {/* Logo Image - Circular */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logo-light.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>

            {/* Text Content */}
            <View style={styles.textSection}>
              <Text style={styles.welcomeText}>Welcome to {societyName}</Text>
              <Text style={styles.roleText}>{greeting}, {userRole}</Text>
            </View>
          </View>

          {/* Right: Notification Bell */}
          <TouchableOpacity
            style={styles.bellContainer}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <View style={styles.bellBox}>
              <MaterialCommunityIcons name="bell-outline" size={20} color={COLORS.textInverse} />
              
              {/* Unread dot */}
              {notificationCount > 0 && (
                <View style={styles.badgeDot} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 0,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    marginRight: 10,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  textSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textInverse,
    letterSpacing: 0.3,
  },
  roleText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  bellContainer: {
    marginLeft: 12,
  },
  bellBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  badgeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.danger,
    borderRadius: 4,
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
});
