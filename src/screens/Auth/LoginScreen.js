// src/screens/Auth/LoginScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Animated, Alert, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { login, forgotPassword, saveToken, saveUser, saveSociety, getMe, testSelectedEndpoints } from '../../services/api';
import { SFButton } from '../../components';
import { Colors, Radius, Shadow, Spacing, GradientColors, Fonts } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail,setForgotEmail]= useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setFL]      = useState(false);

  const switchMode = (toForgot) => {
    setForgotMode(toForgot);
    setError('');
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) { setError('Please enter email and password'); return; }
    setLoading(true); setError('');
    try {
      console.log('\n🔐 [LOGIN] Starting login process...\n');
      
      const res = await login({ email: identifier.trim(), password });
      const d   = res.data;
      
      if (d?.success && d?.data?.token) {
        console.log('✅ [LOGIN] Token received, saving...');
        await saveToken(d.data.token);

        if (d?.data?.user) {
          await saveUser(d.data.user);
        }
        if (d?.data?.society) {
          await saveSociety(d.data.society);
        }
        
        // Fetch full user + society data
        console.log('📡 [LOGIN] Fetching user details...');
        let forcePasswordChange = d?.data?.user?.force_password_change === true;
        const meRes = await getMe();
        const me    = meRes.data?.data;
        
        if (me?.user) {
          console.log(`✅ [LOGIN] User data: ${me.user.name}`);
          await saveUser(me.user);
          forcePasswordChange = forcePasswordChange || me.user.force_password_change === true;
        }
        if (me?.society) {
          console.log(`✅ [LOGIN] Society data: ${me.society.name}`);
          await saveSociety(me.society);
        }

        if (forcePasswordChange) {
          console.log('🔐 [LOGIN] Temporary password detected. Redirecting to ChangePassword screen...');
          navigation.replace('ChangePassword', { token: d.data.token });
          return;
        }
        
        console.log('🚀 [LOGIN] Navigating to Main app...\n');
        
        // Test all endpoints after successful login
        setTimeout(() => {
          console.log('');
          testSelectedEndpoints();
        }, 1000);
        
        navigation.replace('Main');
      } else {
        setError(d?.error || 'Login failed. Check your credentials.');
      }
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Cannot connect to server. Check your internet.';
      console.error('❌ [LOGIN] Error:', errMsg);
      setError(errMsg);
    } finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!forgotEmail.trim()) { setError('Enter your registered email'); return; }
    setFL(true); setError('');
    try {
      await forgotPassword({ email: forgotEmail.trim().toLowerCase() });
      setForgotSent(true);
    } catch (_) {
      setForgotSent(true); // always show success to not reveal emails
    } finally { setFL(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Premium Gradient Header */}
        <LinearGradient colors={GradientColors.mainHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.logoBox}>
            <Image 
              source={require('../../assets/logo-light.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.welcome}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to your resident account</Text>
        </LinearGradient>

        {/* Premium Glass Card */}
        <View style={styles.card}>
          {/* ── Login form ── */}
          {!forgotMode ? (
            <View>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSub}>Use your email or phone number</Text>

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️  {error}</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>EMAIL OR PHONE</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com or 9876543210"
                placeholderTextColor={Colors.textLight}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotLink} onPress={() => switchMode(true)}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <SFButton label="Sign In →" onPress={handleLogin} loading={loading}
                style={{ marginTop: 8 }} />
            </View>
          ) : (
            /* ── Forgot password form ── */
            <View>
              <TouchableOpacity style={styles.backRow} onPress={() => { switchMode(false); setForgotSent(false); }}>
                <Text style={styles.backIcon}>←</Text>
                <Text style={styles.cardTitle}>Reset Password</Text>
              </TouchableOpacity>

              {forgotSent ? (
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>✅  Email Sent!</Text>
                  <Text style={styles.successText}>
                    If your email is registered, a temporary password has been sent.
                    Check your inbox and use it to sign in.
                  </Text>
                  <SFButton label="Back to Sign In" onPress={() => { switchMode(false); setForgotSent(false); }}
                    outlined style={{ marginTop: 16 }} />
                </View>
              ) : (
                <>
                  <Text style={styles.cardSub}>Enter your registered email to receive a temporary password.</Text>
                  {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>⚠️  {error}</Text></View>}

                  <Text style={styles.fieldLabel}>REGISTERED EMAIL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textLight}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>
                      ℹ️  A temporary password will be emailed to you. Make sure SMTP is configured
                      in your society's admin portal.
                    </Text>
                  </View>
                  <SFButton label="Send Reset Email" onPress={handleForgot} loading={forgotLoading}
                    style={{ marginTop: 16 }} />
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: Colors.bg,
    flexGrow: 1,
  },

  // ── Header - Premium gradient section ────────────────────
  header: {
    padding: SW(28),
    paddingTop: SH(60),
    paddingBottom: SH(40),
  },
  logoBox: {
    width: SW(120),
    height: SH(120),
    borderRadius: SW(60),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(2),
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: SH(24),
    overflow: 'hidden',
  },
  logoImage: {
    width: SW(120),
    height: SH(120),
    borderRadius: SW(60),
  },
  welcome: {
    fontSize: SF(28),
    fontWeight: '700',
    color: Colors.textWhite,
    letterSpacing: SW(-0.3),
  },
  sub: {
    fontSize: SF(14),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.70)',
    marginTop: SH(6),
    letterSpacing: SW(0.2),
  },

  // ── Card - Premium glass effect ────────────────────────────
  card: {
    backgroundColor: Colors.cardGlass,
    borderRadius: SW(28),
    margin: SW(16),
    marginTop: SH(-24),
    padding: SW(26),
    borderWidth: SW(1),
    borderColor: 'rgba(255,255,255,0.60)',
    ...Shadow.medium,
  },

  // ── Form Elements ──────────────────────────────────────────
  cardTitle: {
    fontSize: SF(20),
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: SH(6),
    letterSpacing: SW(0.1),
  },
  cardSub: {
    fontSize: SF(13),
    fontWeight: '500',
    color: Colors.textMid,
    marginBottom: SH(22),
    letterSpacing: SW(0.1),
  },
  fieldLabel: {
    fontSize: SF(11),
    fontWeight: '600',
    color: Colors.textLight,
    letterSpacing: SW(0.8),
    marginBottom: SH(8),
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: Colors.border,
    paddingHorizontal: SW(16),
    paddingVertical: SH(14),
    fontSize: SF(14),
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: SH(14),
  },

  // ── Password Row ───────────────────────────────────────────
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
    marginBottom: SH(14),
  },
  eyeBtn: {
    padding: SW(12),
    marginRight: SW(-8),
  },
  eyeIcon: {
    fontSize: SF(18),
  },

  // ── Links ──────────────────────────────────────────────────
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: SH(18),
    marginTop: SH(-6),
  },
  forgotText: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: SW(0.1),
  },

  // ── Back Navigation ────────────────────────────────────────
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(10),
    marginBottom: SH(14),
  },
  backIcon: {
    fontSize: SF(20),
    color: Colors.accent,
    fontWeight: '600',
  },

  // ── Error State ────────────────────────────────────────────
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.danger + '25',
    padding: SW(13),
    marginBottom: SH(16),
  },
  errorText: {
    fontSize: SF(13),
    fontWeight: '500',
    color: Colors.danger,
    letterSpacing: SW(0.1),
  },

  // ── Success State ──────────────────────────────────────────
  successBox: {
    backgroundColor: Colors.successLight,
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: Colors.success + '25',
    padding: SW(20),
  },
  successTitle: {
    fontSize: SF(16),
    fontWeight: '700',
    color: Colors.success,
    marginBottom: SH(10),
    letterSpacing: SW(0.1),
  },
  successText: {
    fontSize: SF(13),
    fontWeight: '500',
    color: Colors.textMid,
    lineHeight: SH(21),
    letterSpacing: SW(0.1),
  },

  // ── Info/Note Box ──────────────────────────────────────────
  noteBox: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.warning + '25',
    padding: SW(13),
    marginTop: SH(14),
  },
  noteText: {
    fontSize: SF(12),
    fontWeight: '500',
    color: Colors.textMid,
    lineHeight: SH(18),
    letterSpacing: SW(0.1),
  },
});
