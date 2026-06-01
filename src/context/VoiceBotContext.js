// src/context/VoiceBotContext.js
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { voiceService } from '../services/voiceService';

const VoiceBotContext = createContext();

export const VoiceBotProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');

  const recordingRef = useRef(null);
  const soundRefreshIntervalRef = useRef(null);

  // Initialize audio session
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎵 [VoiceBot] Audio initialized');
    } catch (err) {
      console.error('Failed to initialize audio:', err);
    }
  }, []);

  // Start listening (mocked for bare RN - actual recording requires native setup)
  const startListening = useCallback(async () => {
    try {
      await initializeAudio();
      
      recordingRef.current = { startTime: Date.now() };
      setIsListening(true);
      setCurrentTranscript('');
      setInterimTranscript('');

      console.log('🎤 Started listening...');
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }, [initializeAudio]);

  // Stop listening and process (mocked)
  const stopListening = useCallback(async () => {
    try {
      if (!recordingRef.current) return;

      setIsListening(false);
      setAudioLevel(0);
      
      console.log('🎙️  Recording stopped (mocked mode)');
      
      setIsThinking(false);
      recordingRef.current = null;
    } catch (err) {
      console.error('Error stopping recording:', err);
      setIsListening(false);
      setIsThinking(false);
    }
  }, []);

  // Send message to bot
  const sendToBot = useCallback(async (userMessage, language = 'auto') => {
    try {
      setIsThinking(true);
      
      // Add user message to chat
      setMessages(prev => [...prev, {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      }]);

      // Get bot response
      const response = await voiceService.sendVoiceMessage(
        userMessage,
        language,
        messages
      );

      setIsThinking(false);

      if (response.success) {
        // Add bot response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.text_response,
          audio_url: response.audio_url,
          action: response.action,
          timestamp: new Date(),
        }]);

        // Play bot response audio if available
        if (response.audio_url) {
          playAudio(response.audio_url);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'error',
          content: response.error || 'Sorry, I could not process that.',
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error('Error sending to bot:', err);
      setIsThinking(false);
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }]);
    }
  }, [messages]);

  // Play audio response (mocked - audio setup requires native module configuration)
  const playAudio = useCallback(async (audioUrl) => {
    try {
      console.log('🔊 [VoiceBot] Audio playback mocked:', audioUrl);
      // Audio playback disabled for now - requires native audio library setup
      // This will be implemented in a future update with proper native module configuration
    } catch (err) {
      console.error('Error with audio playback:', err);
    }
  }, []);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentTranscript('');
    setInterimTranscript('');
  }, []);

  // Stop speaking (mocked)
  const stopSpeaking = useCallback(async () => {
    try {
      console.log('⏹️  Playback stopped (mocked mode)');
      setIsSpeaking(false);
    } catch (err) {
      console.error('Error stopping playback:', err);
    }
  }, []);

  const value = {
    // State
    isListening,
    isSpeaking,
    isThinking,
    messages,
    currentTranscript,
    interimTranscript,
    audioLevel,
    selectedLanguage,
    
    // Methods
    startListening,
    stopListening,
    sendToBot,
    playAudio,
    clearChat,
    stopSpeaking,
    setSelectedLanguage,
    setInterimTranscript,
  };

  return (
    <VoiceBotContext.Provider value={value}>
      {children}
    </VoiceBotContext.Provider>
  );
};

export const useVoiceBot = () => {
  const context = useContext(VoiceBotContext);
  if (!context) {
    throw new Error('useVoiceBot must be used within VoiceBotProvider');
  }
  return context;
};
