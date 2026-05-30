// src/components/VoiceBotFloatingButton.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View, TouchableOpacity, Animated, StyleSheet, Dimensions, Platform, Text,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useVoiceBot } from '../context/VoiceBotContext';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = 62;
const BUTTON_RIGHT = 20;
const BUTTON_BOTTOM = 80;  // Position above tab bar

export default function VoiceBotFloatingButton({ onPress, onLongPress, onLongPressOut }) {
  const { isListening, isSpeaking, isThinking } = useVoiceBot();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Glow pulse animation (when inactive)
  useEffect(() => {
    if (!isListening && !isSpeaking && !isThinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, isSpeaking, isThinking, pulseAnim]);

  // Ripple animation (when active)
  useEffect(() => {
    if (isListening || isSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isListening, isSpeaking, rippleAnim]);

  // Press scale animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Active state colors
  const isActive = isListening || isSpeaking;
  const inactiveGradient = ['#4f8ef7', '#7c3aed'];
  const activeGradient = ['#22d67a', '#059669'];
  const currentGradient = isActive ? activeGradient : inactiveGradient;
  const currentIcon = isActive ? '🔊' : '🎤';

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  return (
    <View style={[styles.container, { bottom: BUTTON_BOTTOM, right: BUTTON_RIGHT }]}>
      {/* Ripple ring (when active) */}
      {(isListening || isSpeaking) && (
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
      )}

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={() => {
            handlePressOut();
            onLongPressOut?.();
          }}
          delayLongPress={500}
        >
          <LinearGradient
            colors={currentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{currentIcon}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Status indicator dot */}
      {isActive && (
        <View style={[styles.statusDot, { backgroundColor: '#22d67a' }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  buttonWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
  },
  ripple: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 3,
    borderColor: '#22d67a',
  },
  statusDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
