// src/screens/Emergency/EmergencyScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, Animated, Alert, Linking,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getEmergencyContactsRealtime, getEmergencyAlertsRealtime, getEmergencyConfigRealtime, triggerSOS, acknowledgeAlert, subscribeToEmergencyUpdates } from '../../services/api';
import { SFCard, EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Spacing } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

const call = (phone) => { Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot make call')); };
const ALERT_ICON = (t = '') => ({ fire:'fire', earthquake:'waveform', flood:'waves', security:'shield-alert-outline', medical:'hospital-box-outline' }[t] || 'alert-outline');
const CONTACT_ICON = (c = '') => {
  const t = c.toLowerCase();
  if (t.includes('fire')) return 'fire-truck';
  if (t.includes('police')) return 'police-badge-outline';
  if (t.includes('ambu') || t.includes('hosp')) return 'ambulance';
  return 'phone-outline';
};

export default function EmergencyScreen({ navigation }) {
  const [contacts,   setContacts]  = useState([]);
  const [alerts,     setAlerts]    = useState([]);
  const [sosNum,     setSosNum]    = useState('112');
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing]= useState(false);
  const [sosHolding, setSosHolding]= useState(false);

  const sosProgress = useRef(new Animated.Value(0)).current;
  const sosPulse = useRef(new Animated.Value(0)).current;
  const sosAnim     = useRef(null);
  const pulseAnim   = useRef(null);
  const progressArc = sosProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 283] });

  const load = async (quiet = false, forceRefresh = false) => {
    if (!quiet) setLoading(true);
    try {
      // Use REST API to fetch emergency data
      const [cr, ar, cfgr] = await Promise.allSettled([
        getEmergencyContactsRealtime(forceRefresh), 
        getEmergencyAlertsRealtime(), 
        getEmergencyConfigRealtime(),
      ]);
      
      if (cr.status === 'fulfilled') {
        const data = cr.value?.data?.data || [];
        console.log('📞 [Emergency] Contacts loaded:', data.length, 'contacts');
        setContacts(Array.isArray(data) ? data : []);
      } else {
        console.warn('⚠️  [Emergency] Failed to fetch contacts:', cr.reason);
      }
      
      if (ar.status === 'fulfilled') {
        const data = ar.value?.data?.data || [];
        console.log('🚨 [Emergency] Alerts loaded:', data.length, 'alerts');
        setAlerts(Array.isArray(data) ? data : []);
      } else {
        console.warn('⚠️  [Emergency] Failed to fetch alerts:', ar.reason);
      }
      
      if (cfgr.status === 'fulfilled') {
        const sosNumber = cfgr.value?.data?.data?.sos_number || '112';
        console.log('⚙️  [Emergency] SOS number:', sosNumber);
        setSosNum(sosNumber);
      } else {
        console.warn('⚠️  [Emergency] Failed to fetch config:', cfgr.reason);
      }
    } catch (error) {
      console.error('❌ [Emergency] Load error:', error.message);
    }
    setLoading(false); 
    setRefreshing(false);
  };

  // Load data on mount & setup listeners
  useEffect(() => {
    load();
    
    // Setup real-time listeners for emergency updates (if socket is available)
    const handleContactsUpdate = (updatedContacts) => {
      console.log('📞 [Emergency] Real-time contact update:', updatedContacts);
      setContacts(Array.isArray(updatedContacts) ? updatedContacts : []);
    };

    // Subscribe to updates (will use socket if available, falls back to polling)
    subscribeToEmergencyUpdates(handleContactsUpdate);

    // Start continuous pulse animation
    pulseAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(sosPulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulseAnim.current.start();

    // Cleanup on unmount
    return () => {
      pulseAnim.current?.stop();
    };
  }, []);

  const startSos = () => {
    setSosHolding(true); sosProgress.setValue(0);
    sosAnim.current = Animated.timing(sosProgress, { toValue: 1, duration: 3000, useNativeDriver: false });
    sosAnim.current.start(({ finished }) => { if (finished) fireSos(); });
  };

  const stopSos = () => {
    sosAnim.current?.stop(); sosProgress.setValue(0); setSosHolding(false);
  };

  const fireSos = async () => {
    setSosHolding(false); sosProgress.setValue(0);
    try {
      await triggerSOS('SOS from Emergency screen');
      Alert.alert('SOS Sent', `Emergency services notified.\nCalling ${sosNum} now...`, [{ text: 'OK' }]);
      call(sosNum);
    } catch (_) { call(sosNum); }
  };

  const dismiss = async (id) => {
    await acknowledgeAlert(id).catch(() => {});
    setAlerts(p => p.filter(a => a.id !== id));
  };

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Emergency SOS</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.accent}
          onRefresh={() => { setRefreshing(true); load(true, true); }} />}>

        {/* ── SOS Card ──────────────────────────────────────── */}
        <View style={styles.sosCard}>
          <View style={styles.sosTitleRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sosTitle}>Emergency SOS Button</Text>
          </View>
          <Text style={styles.sosSub}>Press and hold for 3 seconds to trigger</Text>

          <View style={styles.sosCenter}>
            {/* Pulsing glow background */}
            <Animated.View style={[styles.sosPulseRing, {
              opacity: sosPulse.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.6, 0.2, 0.6],
              }),
              transform: [{
                scale: sosPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.15],
                }),
              }],
            }]} />

            <TouchableOpacity
              onLongPress={startSos} onPressOut={stopSos}
              delayLongPress={100} style={styles.sosOuter} activeOpacity={0.8}>
              <Animated.View style={[styles.sosInner, {
                backgroundColor: sosProgress.interpolate({
                  inputRange: [0, 1], outputRange: ['#DC2626', '#991B1B'],
                }),
              }]}>
                <MaterialCommunityIcons name="alert" size={36} color="#FFFFFF" style={styles.sosEmoji} />
                <Text style={styles.sosLabel}>{sosHolding ? 'HOLD...' : 'HOLD'}</Text>
                <Text style={styles.sosPercent}>{Math.round(sosProgress._value * 100)}%</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.callNow} onPress={() => call(sosNum)}>
            <MaterialCommunityIcons name="phone" size={16} color="#FFFFFF" style={styles.callNowEmoji} />
            <Text style={styles.callNowText}>Call {sosNum} Now</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active Alerts ──────────────────────────────────── */}
        {alerts.length > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#000" />
              <Text style={styles.sectionTitle}>Active Alerts</Text>
            </View>
            {alerts.map(a => (
              <View key={a.id} style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <MaterialCommunityIcons style={styles.alertEmoji} name={ALERT_ICON(a.alert_type)} size={20} color="#DC2626" />
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={styles.alertTitle}>{a.title}</Text>
                    {!!a.message && <Text style={styles.alertMsg} numberOfLines={2}>{a.message}</Text>}
                  </View>
                  <TouchableOpacity style={styles.ackBtn} onPress={() => dismiss(a.id)}>
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Emergency Contacts ─────────────────────────────── */}
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="phone-outline" size={18} color="#000" />
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        </View>
        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>No emergency contacts configured.</Text>
        ) : contacts.map(c => (
          <View key={c.id} style={styles.contactCard}>
            <View style={styles.contactIconBox}>
              <MaterialCommunityIcons style={styles.contactEmoji} name={CONTACT_ICON(c.category)} size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactPhone}>{c.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => call(c.phone)}>
              <MaterialCommunityIcons name="phone" size={20} color="#16A34A" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  backIcon: {
    fontSize: SF(13),
    fontWeight: '700',
    color: '#000',
  },
  title: {
    flex: 1,
    fontSize: SF(16),
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: SH(100),
  },

  /* ─────────── SOS Card ─────────── */
  sosCard: {
    backgroundColor: '#DC2626',
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: '#991B1B',
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sosTitle: {
    fontSize: SF(18),
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  sosTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
  },
  sosSub: {
    fontSize: SF(13),
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  sosCenter: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosPulseRing: {
    position: 'absolute',
    width: SW(160),
    height: SH(160),
    borderRadius: SW(80),
    backgroundColor: '#EF4444',
    zIndex: 0,
  },
  sosOuter: {
    width: SW(130),
    height: SH(130),
    borderRadius: SW(65),
    borderWidth: SW(4),
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    elevation: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  sosInner: {
    width: SW(110),
    height: SH(110),
    borderRadius: SW(55),
    alignItems: 'center',
    justifyContent: 'center',
    gap: SW(2),
    elevation: 10,
  },
  sosEmoji: {
    fontSize: SF(36),
  },
  sosLabel: {
    fontSize: SF(10),
    color: '#fff',
    fontWeight: '800',
    letterSpacing: SW(1),
  },
  sosPercent: {
    fontSize: SF(11),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: SH(2),
  },
  callNow: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  callNowEmoji: {
    fontSize: SF(16),
  },
  callNowText: {
    fontSize: SF(14),
    fontWeight: '700',
    color: '#fff',
  },

  /* ─────────── Alerts ─────────── */
  sectionTitle: {
    fontSize: SF(15),
    fontWeight: '700',
    color: '#000',
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  alertCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: Radius.lg,
    borderWidth: SW(1.5),
    borderColor: '#FECACA',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertEmoji: {
    fontSize: SF(20),
  },
  alertTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: '#DC2626',
  },
  alertMsg: {
    fontSize: SF(12),
    color: '#7F1D1D',
    marginTop: SH(4),
    lineHeight: SH(17),
  },
  ackBtn: {
    backgroundColor: '#DC2626',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  ackText: {
    fontSize: SF(12),
    color: '#fff',
    fontWeight: '700',
  },

  /* ─────────── Contacts ─────────── */
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: SW(1.5),
    borderColor: '#000',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  contactIconBox: {
    width: SW(50),
    height: SH(50),
    backgroundColor: '#DBEAFE',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(1),
    borderColor: '#BFDBFE',
  },
  contactEmoji: {
    fontSize: SF(24),
  },
  contactName: {
    fontSize: SF(14),
    fontWeight: '700',
    color: '#000',
  },
  contactPhone: {
    fontSize: SF(13),
    color: '#6B7280',
    marginTop: SH(2),
  },
  callBtn: {
    width: SW(44),
    height: SH(44),
    backgroundColor: '#DCFCE7',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(1),
    borderColor: '#BBFBC0',
    marginLeft: Spacing.md,
  },
  callBtnIcon: {
    fontSize: SF(20),
  },
  emptyText: {
    fontSize: SF(13),
    color: '#9CA3AF',
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
});
