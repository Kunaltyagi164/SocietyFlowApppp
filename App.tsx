// App.js
import React, { useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert, View, StatusBar, SafeAreaView, Text, TextInput } from 'react-native';

async function requestPermissions() {
  if (Platform.OS === 'android') {
    try {
      const micGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'SocietyFlow needs access to your microphone for voice features.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (micGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Required', 'Microphone access is needed for voice features.');
      }
      // Notification permission (Android 13+)
      if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        const notifGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'SocietyFlow needs permission to send you notifications.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (notifGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Notification access is needed for alerts.');
        }
      }
    } catch (err) {
      console.warn('Permission request error:', err);
    }
  }
}
import { Colors } from './src/theme';
import AppNavigator, { NotificationProvider } from './src/navigation';
import { VoiceBotProvider } from './src/context/VoiceBotContext';

const defaultFontStyle = { fontFamily: 'Poppins-Regular' };

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [defaultFontStyle, Text.defaultProps.style].filter(Boolean);

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [defaultFontStyle, TextInput.defaultProps.style].filter(Boolean);

export default function App() {
  useEffect(() => {
    requestPermissions();
  }, []);
  return (
    <VoiceBotProvider>
      <NotificationProvider>
        <View style={{ flex: 1, backgroundColor: Colors.white }}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.royalBlue} translucent={false} />
          <SafeAreaView style={{ flex: 1 }}>
            <AppNavigator />
          </SafeAreaView>
        </View>
      </NotificationProvider>
    </VoiceBotProvider>
  );
}
