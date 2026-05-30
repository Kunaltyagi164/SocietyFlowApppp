// src/screens/Parking/ParkingScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyParkingSlot, getParkingLogs, getParkingVehicleStats } from '../../services/api';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow, GradientColors } from '../../theme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { SF, SH, SW } from '../../utils/responsive';

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function ParkingScreen({ navigation }) {
  const [slot, setSlot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const user = await AsyncStorage.getItem('user');
      const userObj = user ? JSON.parse(user) : null;
      const residentId = userObj?.id;
      
      console.log('\n🅿️ [ParkingScreen] Loading parking data for resident...');
      console.log(`   👤 Resident ID: ${residentId}`);
      console.log(`   👤 Name: ${userObj?.name || 'N/A'}`);
      
      const [pr, lr, sr] = await Promise.allSettled([
        getMyParkingSlot(),
        getParkingLogs(),
        getParkingVehicleStats(),
      ]);
      
      if (pr.status === 'fulfilled') {
        const slotData = pr.value.data?.data;
        setSlot(slotData);
        console.log(`   ✅ My Parking Slot: ${slotData?.slot_number || 'N/A'} (resident-specific)`);
      }
      if (lr.status === 'fulfilled') {
        const logsData = lr.value.data?.data || [];
        setLogs(logsData);
        console.log(`   ✅ Loaded ${logsData.length} parking logs (resident-specific)`);
      } else if (lr.status === 'rejected') {
        console.error(`   ❌ getParkingLogs() failed:`, lr.reason?.response?.status, lr.reason?.message);
      }
      if (sr.status === 'fulfilled') {
        const statsData = sr.value.data?.data;
        setStats(statsData);
        console.log(`   📊 Stats: Total slots ${statsData?.total_slots || 0}, Occupied: ${statsData?.occupied_slots || 0}`);
      } else if (sr.status === 'rejected') {
        console.error(`   ❌ getParkingVehicleStats() failed:`, sr.reason?.response?.status, sr.reason?.message);
      }
      
      // Check for any failed promises
      if (pr.status === 'rejected') {
        console.error(`   ❌ getMyParkingSlot() failed:`, pr.reason?.response?.status, pr.reason?.message);
        console.error(`      Full error: ${pr.reason?.message}`);
      }
      if (lr.status === 'rejected' || sr.status === 'rejected' || pr.status === 'rejected') {
        Alert.alert('⚠️ Warning', 'Some parking data failed to load. Check logs for details.');
      }
      
      console.log('✅ [ParkingScreen] Parking data fetched (some endpoints may have failed)\n');
    } catch (err) {
      console.error('❌ [ParkingScreen] Error:', err.message);
      console.error('   - Status:', err.response?.status);
      console.error('   - URL:', err.config?.url);
      console.error('   - Full error:', err);
      Alert.alert('⚠️ Error', `Failed to load parking data: ${err.response?.status || err.message}`);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [navigation]);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => load(true), true, 20000);

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.accent} onRefresh={() => { setRefreshing(true); load(true); }} />}
      >
        {/* My Slot Card */}
        {slot ? (
          <LinearGradient colors={GradientColors.green} style={styles.slotCard}>
            <Text style={styles.slotLabel}>YOUR PARKING SLOT</Text>
            <Text style={styles.slotNumber}>{slot.slot_number}</Text>
            {slot.vehicle_registration && <Text style={styles.slotVehicle}>🚗 {slot.vehicle_registration}</Text>}
            {slot.status && <Text style={styles.slotStatus}>Status: {slot.status}</Text>}
          </LinearGradient>
        ) : (
          <View style={styles.noSlotCard}>
            <Text style={styles.noSlotEmoji}>🅿️</Text>
            <Text style={styles.noSlotText}>No parking slot assigned</Text>
          </View>
        )}

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🚗</Text>
              <Text style={styles.statValue}>{stats.total_slots || 0}</Text>
              <Text style={styles.statLabel}>Total Slots</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>✅</Text>
              <Text style={styles.statValue}>{stats.occupied_slots || 0}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⬜</Text>
              <Text style={styles.statValue}>{(stats.total_slots || 0) - (stats.occupied_slots || 0)}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </View>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📋 Recent Activity</Text>
            {logs.slice(0, 10).map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logTime}>
                  <Text style={styles.logEmoji}>{log.entry_time ? '🔓' : '🔒'}</Text>
                  <Text style={styles.logTimeText}>{fmtDate(log.entry_time || log.exit_time)}</Text>
                </View>
                {log.vehicle_no && <Text style={styles.logVehicle}>{log.vehicle_no}</Text>}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textDark },
  slotCard: {
    borderRadius: Radius.xxl,
    padding: SW(24),
    alignItems: 'center',
    marginBottom: SH(20),
    ...Shadow.strong,
  },
  slotLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  slotNumber: { fontSize: 42, fontWeight: '800', color: '#fff', marginVertical: 8 },
  slotVehicle: { fontSize: 14, color: '#fff', marginTop: 4 },
  slotStatus: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  noSlotCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(28),
    alignItems: 'center',
    marginBottom: SH(20),
  },
  noSlotEmoji: { fontSize: 36, marginBottom: 8 },
  noSlotText: { fontSize: 14, color: Colors.textMid, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(12),
    alignItems: 'center',
    ...Shadow.card,
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  statLabel: { fontSize: 10, color: Colors.textLight, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 10, marginTop: 6 },
  logCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(12),
    marginBottom: SH(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  logTime: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  logEmoji: { fontSize: 16 },
  logTimeText: { fontSize: 12, color: Colors.textMid, fontWeight: '600' },
  logVehicle: { fontSize: 12, color: Colors.textDark, fontWeight: '600', marginLeft: 8 },
});
