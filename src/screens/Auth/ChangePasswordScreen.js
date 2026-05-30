import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { changePassword, getMe, saveUser, saveSociety } from '../../services/api';
import { ScreenBackground, SFButton } from '../../components';
import { Colors, Radius, Shadow } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

export default function ChangePasswordScreen({ navigation }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const pass = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (pass.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (pass !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await changePassword(pass);

      try {
        const meRes = await getMe();
        const me = meRes.data?.data;
        if (me?.user) await saveUser(me.user);
        if (me?.society) await saveSociety(me.society);
      } catch (refreshErr) {
        console.warn('[ChangePassword] Profile refresh failed:', refreshErr?.message);
      }

      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'Continue',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }),
        },
      ]);
    } catch (e) {
      const errMsg = e.response?.data?.error || 'Failed to change password. Try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            You signed in with a temporary password. Please set a new password to continue.
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>NEW PASSWORD</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPw}
              placeholder="Minimum 6 characters"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
              <MaterialCommunityIcons
                name={showPw ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textMid}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPw}
            placeholder="Re-enter new password"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
          />

          <SFButton label="Set New Password" onPress={handleSubmit} loading={loading} style={{ marginTop: 12 }} />
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: SW(16),
  },
  card: {
    backgroundColor: Colors.cardGlass,
    borderRadius: SW(28),
    padding: SW(24),
    borderWidth: SW(1),
    borderColor: 'rgba(255,255,255,0.6)',
    ...Shadow.medium,
  },
  title: {
    fontSize: SF(24),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: SH(8),
  },
  subtitle: {
    fontSize: SF(13),
    fontWeight: '500',
    color: Colors.textMid,
    lineHeight: SH(20),
    marginBottom: SH(18),
  },
  label: {
    fontSize: SF(11),
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: SW(0.8),
    marginBottom: SH(8),
    marginTop: SH(6),
  },
  input: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: Colors.border,
    paddingHorizontal: SW(16),
    paddingVertical: SH(14),
    fontSize: SF(14),
    color: Colors.textDark,
    marginBottom: SH(12),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
    marginBottom: SH(12),
  },
  eyeBtn: {
    padding: SW(10),
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.danger + '25',
    padding: SW(12),
    marginBottom: SH(14),
  },
  errorText: {
    fontSize: SF(13),
    fontWeight: '500',
    color: Colors.danger,
  },
});
