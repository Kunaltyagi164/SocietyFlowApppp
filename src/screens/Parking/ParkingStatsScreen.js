// src/screens/Parking/ParkingStatsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../theme';
import * as api from '../../services/api';
import { ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

export default function ParkingStatsScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📊 ParkingStats: Fetching parking data...');
      
      console.log('📡 ParkingStats: Calling getParkingVehicleStats()...');
      const statsRes = await api.getParkingVehicleStats();
      console.log('✅ ParkingStats: getParkingVehicleStats() success:', statsRes.data);
      
      console.log('📡 ParkingStats: Calling getParkingLogs()...');
      const logsRes = await api.getParkingLogs();
      console.log('✅ ParkingStats: getParkingLogs() success:', logsRes.data);
      
      setStats(statsRes.data?.data);
      setLogs(logsRes.data?.data || []);
    } catch (err) {
      console.error('❌ Error loading parking stats:', err.message);
      console.error('   - Status:', err.response?.status);
      console.error('   - URL:', err.config?.url);
      console.error('   - Data:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.teal} style={{ marginTop: 40 }} />
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🅿️ Parking Stats</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Stats Overview */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Occupancy Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🅿️</Text>
                <Text style={styles.statValue}>{stats.total_slots || 0}</Text>
                <Text style={styles.statLabel}>Total Slots</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.statValue}>{stats.occupied_slots || 0}</Text>
                <Text style={styles.statLabel}>Occupied</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🔓</Text>
                <Text style={styles.statValue}>{stats.available_slots || 0}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
            </View>

            {stats.occupancy_rate && (
              <View style={styles.occupancyCard}>
                <Text style={styles.occupancyLabel}>Occupancy Rate</Text>
                <Text style={styles.occupancyValue}>
                  {Math.round(stats.occupancy_rate * 100)}%
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${stats.occupancy_rate * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {logs.length > 0 ? (
            logs.slice(0, 10).map((log, idx) => (
              <View key={idx} style={styles.logCard}>
                <View>
                  <Text style={styles.vehicleNo}>🚗 {log.vehicle_no}</Text>
                  <Text style={styles.logDetail}>
                    {log.entry_type === 'IN' ? '📍 Entered' : '🚪 Exited'} at{' '}
                    {log.entry_time || log.exit_time || 'N/A'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.typeBadge,
                    log.entry_type === 'IN'
                      ? styles.typeBadge_In
                      : styles.typeBadge_Out,
                  ]}
                >
                  <Text style={styles.typeBadgeText}>
                    {log.entry_type === 'IN' ? '▶' : '◀'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No activity records</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    backgroundColor: Colors.bgWhite,
    ...Shadow.soft,
  },
  backBtn: {
    fontSize: SF(16),
    color: Colors.teal,
    fontWeight: '600',
  },
  title: {
    fontSize: SF(20),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  section: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  sectionTitle: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(12),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SH(12),
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    alignItems: 'center',
    marginHorizontal: SW(4),
    ...Shadow.soft,
  },
  statIcon: {
    fontSize: SF(24),
    marginBottom: SH(6),
  },
  statValue: {
    fontSize: SF(20),
    fontWeight: '700',
    color: Colors.teal,
  },
  statLabel: {
    fontSize: SF(11),
    color: Colors.textSecondary,
    marginTop: SH(4),
  },
  occupancyCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(16),
    ...Shadow.soft,
  },
  occupancyLabel: {
    fontSize: SF(14),
    color: Colors.textSecondary,
    marginBottom: SH(8),
  },
  occupancyValue: {
    fontSize: SF(32),
    fontWeight: '700',
    color: Colors.teal,
    marginBottom: SH(12),
  },
  progressBar: {
    height: SH(8),
    backgroundColor: Colors.primaryLight,
    borderRadius: SW(4),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.teal,
  },
  logCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(8),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleNo: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
  },
  logDetail: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    marginTop: SH(2),
  },
  typeBadge: {
    width: SW(36),
    height: SH(36),
    borderRadius: SW(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge_In: {
    backgroundColor: Colors.success + '20',
  },
  typeBadge_Out: {
    backgroundColor: Colors.warning + '20',
  },
  typeBadgeText: {
    fontWeight: '700',
    fontSize: SF(16),
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingVertical: SH(20),
  },
});
