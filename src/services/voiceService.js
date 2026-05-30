// src/services/voiceService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const VOICE_API_BASE = 'https://app.societyflow.in/api';

export const voiceService = {
  /**
   * Send voice message to bot and get response
   */
  async sendVoiceMessage(message, language = 'auto', history = []) {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.post(
        `${VOICE_API_BASE}/voice/chat`,
        {
          message,
          language,
          history: history || [],
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success) {
        return {
          success: true,
          text_response: response.data.data?.text_response || '',
          audio_url: response.data.data?.audio_url || null,
          action: response.data.data?.action || null,
        };
      }

      return {
        success: false,
        error: response.data?.error || 'Failed to get response from Siya',
      };
    } catch (error) {
      console.error('❌ [VoiceService] sendVoiceMessage error:', error.message);
      return {
        success: false,
        error: error.message || 'Voice service error',
      };
    }
  },

  /**
   * Convert text to speech (for bot response audio)
   */
  async textToSpeech(text, language = 'hi') {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.post(
        `${VOICE_API_BASE}/voice/tts`,
        { text, language },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success) {
        return {
          success: true,
          audio_url: response.data.data?.audio_url || null,
        };
      }

      return { success: false };
    } catch (error) {
      console.error('❌ [VoiceService] textToSpeech error:', error.message);
      return { success: false };
    }
  },

  /**
   * Process voice recording (speech-to-text)
   * Backend receives base64 audio data
   */
  async processVoiceRecording(audioBase64, language = 'auto') {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await axios.post(
        `${VOICE_API_BASE}/voice/process`,
        {
          audio: audioBase64,
          language,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success) {
        return {
          success: true,
          transcribed_text: response.data.data?.text || '',
          language_detected: response.data.data?.language || language,
        };
      }

      return {
        success: false,
        error: 'Voice processing failed',
      };
    } catch (error) {
      console.error('❌ [VoiceService] processVoiceRecording error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
