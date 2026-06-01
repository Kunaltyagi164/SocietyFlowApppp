// src/screens/Auth/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

export default function SplashScreen({ navigation }) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const fadeInText = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Logo entrance animation - scale + rotate
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Text fade in + slide up
    Animated.parallel([
      Animated.timing(fadeInText, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 2 seconds
    const timer = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        let user = null;

        if (userStr) {
          try {
            user = JSON.parse(userStr);
          } catch (parseErr) {
            console.warn('SplashScreen user parse error:', parseErr?.message);
          }
        }

        console.log('🔑 Token check:', token ? '✅ Token found' : '❌ No token');
        if (token && user?.force_password_change === true) {
          navigation.replace('ChangePassword', { token });
          return;
        }
        navigation.replace(token ? 'Main' : 'Login');
      } catch (err) {
        console.error('SplashScreen error:', err);
        navigation.replace('Login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Animated Logo - Centered */}
      <Animated.View
        style={[
          styles.logoCircle,
          {
            transform: [
              { scale: logoScale },
              { rotateZ: logoRotation },
            ],
          },
        ]}>
        <Image 
          source={require('../../assets/logo-light.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Text Below Logo */}
      <Animated.View
        style={[
          styles.textWrap,
          {
            opacity: fadeInText,
            transform: [{ translateY: slideUp }],
          },
        ]}>
        <Text style={styles.appName}>SocietyFlow</Text>
        <Text style={styles.tagline}>Resident Portal</Text>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, { marginLeft: 8 }]} />
          <View style={[styles.dot, { marginLeft: 8 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.textWhite,
    overflow: 'hidden',
  },

  // Logo in circular container - BIGGER
  logoCircle: {
    width: SW(200),
    height: SH(200),
    borderRadius: SW(100),
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(3),
    borderColor: '#e0e0e0',
    marginBottom: SH(40),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: SW(200),
    height: SH(200),
    borderRadius: SW(100),
  },

  // Text below logo
  textWrap: {
    alignItems: 'center',
  },
  appName: {
    fontSize: SF(28),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: SH(8),
    letterSpacing: SW(-0.5),
  },
  tagline: {
    fontSize: SF(14),
    fontWeight: '500',
    color: Colors.textLight,
    opacity: 0.8,
    letterSpacing: SW(1),
    marginBottom: SH(16),
  },
  
  // Loading dots animation
  dots: {
    flexDirection: 'row',
    marginTop: SH(12),
  },
  dot: {
    width: SW(6),
    height: SH(6),
    borderRadius: SW(3),
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
