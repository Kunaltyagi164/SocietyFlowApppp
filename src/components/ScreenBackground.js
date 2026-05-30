import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/**
 * Diagonal light-blue → white gradient background used across all screens
 * to give the app a consistent visual identity.
 *
 * Usage:
 *   <ScreenBackground>
 *     <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
 *       ...
 *     </SafeAreaView>
 *   </ScreenBackground>
 */
export default function ScreenBackground({ children, style }) {
  return (
    <LinearGradient
      colors={['#F5F9FF', '#EDF7FF', '#F3FCF9', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      <View style={[styles.blurCircle, styles.circleTopBlue]} />
      <View style={[styles.blurCircle, styles.circleTopGreen]} />
      <View style={[styles.blurCircle, styles.circleBottom]} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.32,
  },
  circleTopBlue: {
    width: 220,
    height: 220,
    top: -70,
    left: -60,
    backgroundColor: '#8EC0FF',
  },
  circleTopGreen: {
    width: 210,
    height: 210,
    top: 40,
    right: -80,
    backgroundColor: '#8DE6A4',
  },
  circleBottom: {
    width: 190,
    height: 190,
    bottom: -70,
    right: 10,
    backgroundColor: '#F8DE85',
    opacity: 0.2,
  },
});
