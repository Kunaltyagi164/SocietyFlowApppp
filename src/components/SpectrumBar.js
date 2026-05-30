// src/components/SpectrumBar.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Text } from 'react-native';
import { useVoiceBot } from '../context/VoiceBotContext';

const { width } = Dimensions.get('window');
const BAR_COUNT = 28;
const BAR_WIDTH = width / (BAR_COUNT + 2);
const MAX_HEIGHT = 44;
const MIN_HEIGHT = 3;

// Create animated bar array
const createAnimatedBars = () => {
  return Array.from({ length: BAR_COUNT }, () => new Animated.Value(MIN_HEIGHT));
};

export default function SpectrumBar({ isListening, isSpeaking }) {
  const animatedBars = useRef(createAnimatedBars()).current;
  const { audioLevel } = useVoiceBot();

  useEffect(() => {
    if (isListening) {
      // Animate bars based on audio level
      const heightVariation = Math.abs(audioLevel) * MAX_HEIGHT;
      
      animatedBars.forEach((bar, index) => {
        const delay = index * 20;
        const randomHeight = MIN_HEIGHT + Math.random() * heightVariation;
        
        Animated.timing(bar, {
          toValue: randomHeight,
          duration: 150,
          useNativeDriver: false,
        }).start();
      });
    } else if (isSpeaking) {
      // Animate all bars uniformly when bot is speaking
      Animated.loop(
        Animated.sequence(
          animatedBars.map((bar, index) =>
            Animated.timing(bar, {
              toValue: MIN_HEIGHT + Math.random() * MAX_HEIGHT,
              duration: 100 + index * 10,
              useNativeDriver: false,
            })
          )
        )
      ).start();
    } else {
      // Reset to minimum when idle
      animatedBars.forEach(bar => {
        Animated.timing(bar, {
          toValue: MIN_HEIGHT,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isListening, isSpeaking, audioLevel, animatedBars]);

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {animatedBars.map((bar, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: bar,
                backgroundColor: getBarColor(index),
              },
            ]}
          />
        ))}
      </View>
      {isListening && (
        <View style={styles.hintText}>
          <Text style={styles.hintLabel}>Mic Sun rahi hoon...</Text>
        </View>
      )}
      {isSpeaking && (
        <View style={styles.hintText}>
          <Text style={styles.hintLabel}>Bol rahi hoon...</Text>
        </View>
      )}
    </View>
  );
}

// Color gradient from blue to purple
function getBarColor(index) {
  const ratio = index / BAR_COUNT;
  // Blue (#4f8ef7) to Purple (#7c3aed)
  const startR = 79, startG = 142, startB = 247;
  const endR = 124, endG = 58, endB = 237;
  
  const r = Math.round(startR + (endR - startR) * ratio);
  const g = Math.round(startG + (endG - startG) * ratio);
  const b = Math.round(startB + (endB - startB) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: MAX_HEIGHT,
    gap: 2,
    width: width * 0.9,
  },
  bar: {
    width: BAR_WIDTH - 2,
    borderRadius: 2,
    minHeight: MIN_HEIGHT,
  },
  hintText: {
    marginTop: 8,
    alignItems: 'center',
  },
  hintLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
});
