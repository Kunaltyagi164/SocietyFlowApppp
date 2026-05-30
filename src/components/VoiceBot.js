// src/components/VoiceBot.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Modal, StyleSheet, TouchableOpacity, Text, ScrollView, Dimensions, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useVoiceBot } from '../context/VoiceBotContext';
import SpectrumBar from './SpectrumBar';

const { height, width } = Dimensions.get('window');

export default function VoiceBot({ visible, onClose }) {
  const {
    isListening,
    isSpeaking,
    isThinking,
    messages,
    currentTranscript,
    interimTranscript,
    clearChat,
    stopSpeaking,
    startListening,
    stopListening,
  } = useVoiceBot();

  const scrollViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Slide up animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: height * 0.28,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const getStatusColor = () => {
    if (isListening) return '#22d67a';
    if (isThinking) return '#f6a623';
    if (isSpeaking) return '#a855f7';
    return '#64748b';
  };

  const getStatusText = () => {
    if (isListening) return 'Mic Sun rahi hoon...';
    if (isThinking) return 'Soch rahi hoon...';
    if (isSpeaking) return 'Bol rahi hoon...';
    return 'Mic band hai';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={['#0f172a', '#1e1b4b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="robot-outline" size={24} color="#FFFFFF" style={styles.avatar} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Siya</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                  <Text style={styles.statusText}>{getStatusText()}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Spectrum Bar */}
          <SpectrumBar isListening={isListening} isSpeaking={isSpeaking} />

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            scrollEnabled={messages.length > 5}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="microphone-outline" size={48} color="#a0adb8" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>Namaste! Mujhe kuch batayen...</Text>
              </View>
            ) : (
              messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userBubble : styles.botBubble,
                    msg.role === 'error' && styles.errorBubble,
                  ]}
                >
                  {msg.role === 'assistant' && (
                    <MaterialCommunityIcons name="robot-outline" size={20} color="#FFFFFF" style={styles.botAvatar} />
                  )}
                  <View
                    style={[
                      styles.bubbleContent,
                      msg.role === 'user' ? styles.userBubbleContent : styles.botBubbleContent,
                    ]}
                  >
                    <Text style={[styles.messageText, msg.role === 'user' && styles.userMessageText]}>
                      {msg.content}
                    </Text>
                    <Text style={styles.timestamp}>
                      {msg.timestamp?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {msg.action && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionText}>
                          {msg.action.type === 'booking' && 'Booking ho gaya!'}
                          {msg.action.type === 'complaint' && 'Complaint darz ho gayi!'}
                          {msg.action.type === 'info' && 'Info'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}

            {/* Interim transcript (real-time STT) */}
            {interimTranscript && (
              <View style={styles.interimContainer}>
                <Text style={styles.interimText}>{interimTranscript}</Text>
              </View>
            )}

            {/* Thinking indicator */}
            {isThinking && (
              <View style={styles.thinkingContainer}>
                <View style={styles.botAvatar}>
                  <MaterialCommunityIcons name="robot-outline" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.thinkingDots}>
                  <View style={[styles.dot, { animationDelay: '0ms' }]} />
                  <View style={[styles.dot, { animationDelay: '150ms' }]} />
                  <View style={[styles.dot, { animationDelay: '300ms' }]} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Controls Bar */}
          <View style={styles.controlsBar}>
            {isSpeaking ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={stopSpeaking}
              >
                <MaterialCommunityIcons name="stop-circle-outline" size={18} color="#fff" style={styles.stopIcon} />
                <Text style={styles.controlText}>Mic band karo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, isListening ? styles.stopButton : styles.playButton]}
                onPress={isListening ? stopListening : startListening}
              >
                <MaterialCommunityIcons
                  name={isListening ? 'stop-circle-outline' : 'microphone-outline'}
                  size={18}
                  color="#fff"
                  style={styles.controlIcon}
                />
                <Text style={styles.controlText}>
                  {isListening ? 'Mic band karo' : 'Baat karo'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.controlButton, styles.clearButton]}
              onPress={clearChat}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#fff" style={styles.trashIcon} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    height: height * 0.72,
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(79, 142, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {},
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
  },
  messagesContent: {
    paddingVertical: 12,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: { marginBottom: 12 },
  emptyText: {
    fontSize: 14,
    color: '#a0adb8',
    textAlign: 'center',
  },
  messageBubble: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  botBubble: {
    justifyContent: 'flex-start',
  },
  errorBubble: {
    backgroundColor: 'rgba(215, 122, 111, 0.2)',
  },
  botAvatar: {
    fontSize: 20,
    marginRight: 8,
  },
  bubbleContent: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubbleContent: {
    backgroundColor: '#4f8ef7',
    borderBottomRightRadius: 4,
  },
  botBubbleContent: {
    backgroundColor: '#1a2035',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: '#a0adb8',
    marginTop: 4,
    textAlign: 'right',
  },
  actionBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(34, 214, 122, 0.2)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 11,
    color: '#22d67a',
    fontWeight: '600',
  },
  interimContainer: {
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(79, 142, 247, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#4f8ef7',
  },
  interimText: {
    fontSize: 13,
    color: '#6B9FD9',
    fontStyle: 'italic',
    textAlign: 'right',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#1a2035',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4f8ef7',
    marginHorizontal: 4,
  },
  controlsBar: {
    height: 60,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  controlButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  playButton: {
    backgroundColor: '#22d67a',
  },
  stopButton: {
    backgroundColor: '#D77A6F',
  },
  clearButton: {
    width: 44,
    backgroundColor: '#64748b',
  },
  controlIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  stopIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  trashIcon: {
    fontSize: 18,
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
