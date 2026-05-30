import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, Alert,
  Animated, Vibration, SafeAreaView, ScrollView, NativeModules
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, Radius, Shadow } from '../theme';

export default function EmergencyAlertModal({ 
  visible, 
  alert, 
  onAcknowledge,
  onClose 
}) {
  const [soundObject, setSoundObject] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Get alert icon based on type
  const getAlertIcon = (type) => {
    const icons = {
      fire: 'fire',
      flood: 'waves',
      earthquake: 'waveform',
      medical: 'hospital-box-outline',
      security: 'shield-alert-outline',
      power: 'flash-outline',
      gas: 'biohazard',
      custom: 'alert-outline'
    };
    return icons[type] || 'shield-alert-outline';
  };

  // Get alert color based on severity
  const getAlertColor = (severity) => {
    const colors = {
      critical: '#DC2626',
      high: '#F97316',
      medium: '#EAB308',
      low: '#3B82F6'
    };
    return colors[severity] || '#DC2626';
  };

  // Start haptic and visual feedback + play alarm sound
  useEffect(() => {
    let isMounted = true;

    const initializeAlert = async () => {
      try {
        // Try to play sound using native Android Audio
        try {
          const audioPath = 'file:///android_asset/sounds/emergency-siren.mp3';
          
          // Use native Android MediaPlayer via NativeModules if available
          if (NativeModules.RCTAudioModule) {
            NativeModules.RCTAudioModule.play(audioPath);
            console.log('🔊 [EmergencyAlert] Native Android audio started');
            setIsPlaying(true);
            setSoundObject({ native: true });
          } else {
            // Fallback: Use ActivityManager to play ringtone
            console.warn('RCTAudioModule not available');
            setIsPlaying(true);
          }
        } catch (nativeError) {
          console.warn('Native audio failed:', nativeError.message);
          setIsPlaying(true);
        }
      } catch (error) {
        console.warn('Failed to initialize emergency sound:', error.message);
        setIsPlaying(true);
      }
    };

    if (visible && alert) {
      initializeAlert();
      startAnimations();
      // Strong vibration pattern but not as extreme - moderate strength
      const vibratePattern = [0, 300, 100, 300, 100, 300]; // 3 pulses, 300ms each
      Vibration.vibrate(vibratePattern, true); // true = loop continuously until cancelled
      console.log('📳 [EmergencyAlert] Haptic vibration activated with strong pattern');
    }

    return () => {
      isMounted = false;
    };
  }, [visible, alert]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundObject) {
        if (soundObject.native && NativeModules.RCTAudioModule) {
          NativeModules.RCTAudioModule.stop();
        } else if (soundObject.pause) {
          soundObject.pause();
          soundObject.currentTime = 0;
        }
      }
      Vibration.cancel();
    };
  }, [soundObject]);

  // Start pulse and shake animations
  const startAnimations = () => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shake animation - reduced intensity for readability
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleAcknowledge = async () => {
    try {
      // Stop sound immediately
      if (soundObject) {
        if (soundObject.native && NativeModules.RCTAudioModule) {
          NativeModules.RCTAudioModule.stop();
        } else if (soundObject.pause) {
          soundObject.pause();
          soundObject.currentTime = 0;
        }
        setSoundObject(null);
        console.log('🔇 [EmergencyAlert] Alarm sound stopped on acknowledge');
      }

      // Cancel vibration
      Vibration.cancel();
      setIsPlaying(false);

      // Call parent acknowledge handler
      if (onAcknowledge && alert) {
        await onAcknowledge(alert.id);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  if (!alert) return null;

  const severity = alert.severity || 'critical';
  const alertColor = getAlertColor(severity);
  const icon = getAlertIcon(alert.alert_type);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      hardwareAccelerated={true}
      onRequestPress={() => {
        // Prevent back button from closing on Android
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: alertColor }]}>
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              backgroundColor: alertColor,
              transform: [
                { scale: pulseAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          {/* Alert Header */}
          <View style={styles.header}>
            <Animated.View
              style={[
                styles.icon,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons name={icon} size={80} color="#fff" />
            </Animated.View>
            <Text style={styles.severityLabel}>
              {severity.toUpperCase()} SEVERITY
            </Text>
          </View>

          {/* Alert Content */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{alert.title || 'EMERGENCY ALERT'}</Text>
            
            {alert.message && (
              <Text style={styles.message}>{alert.message}</Text>
            )}

            {alert.broadcast_name && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Broadcast Name:</Text>
                <Text style={styles.infoValue}>{alert.broadcast_name}</Text>
              </View>
            )}

            {alert.created_at && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Alert Time:</Text>
                <Text style={styles.infoValue}>
                  {new Date(alert.created_at).toLocaleTimeString('en-IN')}
                </Text>
              </View>
            )}

            {alert.acknowledged_count !== undefined && (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Residents Acknowledged:</Text>
                <Text style={styles.infoValue}>{alert.acknowledged_count}</Text>
              </View>
            )}
          </ScrollView>

          {/* Status Indicator */}
          {isPlaying && (
            <View style={styles.soundIndicator}>
              <View style={styles.soundDots}>
                <Animated.View style={[styles.dot, { opacity: 0.8 }]} />
                <Animated.View style={[styles.dot, { opacity: 0.6 }]} />
                <Animated.View style={[styles.dot, { opacity: 0.4 }]} />
              </View>
              <View style={styles.soundTextRow}>
                <MaterialCommunityIcons name="vibrate" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.soundText}>Vibration alert active...</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleAcknowledge}
              activeOpacity={0.8}
            >
              <View style={styles.buttonTextRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.buttonText}>I ACKNOWLEDGE THIS ALERT</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              This alert will remain until deactivated by admin
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  icon: {
    fontSize: 80,
    marginBottom: Spacing.md,
  },
  severityLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: Spacing.md,
    lineHeight: 42,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 28,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  soundIndicator: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  soundDots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  soundText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  soundTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#fff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 1,
  },
  buttonTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
