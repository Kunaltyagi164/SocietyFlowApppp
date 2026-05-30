// src/screens/Security/CCTVAlertsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../theme';
import * as api from '../../services/api';
import { ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

export default function CCTVAlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, resolved

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getCCTVAlerts();
      setAlerts(res.data?.data || []);
    } catch (err) {
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleResolve = (id) => {
    Alert.alert('Resolve Alert?', 'Mark this security alert as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          try {
            await api.resolveCCTVAlert(id);
            Alert.alert('✅ Resolved', 'Alert marked as resolved');
            loadAlerts();
          } catch (err) {
            Alert.alert('❌ Error', err.message);
          }
        },
      },
    ]);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'active') return !alert.resolved;
    if (filter === 'resolved') return alert.resolved;
    return true;
  });

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎥 CCTV Alerts</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {['all', 'active', 'resolved'].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterTab,
                filter === filterType && styles.filterTab_Active,
              ]}
              onPress={() => setFilter(filterType)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === filterType && styles.filterText_Active,
                ]}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alerts List */}
        <View style={styles.section}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View>
                    <Text style={styles.alertType}>
                      {alert.camera_name || 'Unknown Camera'}
                    </Text>
                    <Text style={styles.alertDetail}>
                      {alert.alert_type || 'Motion Detected'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: alert.resolved
                          ? Colors.success + '20'
                          : Colors.danger + '20',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: alert.resolved ? Colors.success : Colors.danger,
                        fontWeight: '700',
                        fontSize: SF(12),
                      }}
                    >
                      {alert.resolved ? '✓ Resolved' : '🔴 Active'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.alertTime}>
                  📅 {alert.created_at?.split('T')[0]} • {alert.created_at?.split('T')[1]?.substring(0, 5)}
                </Text>
                {!alert.resolved && (
                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => handleResolve(alert.id)}
                  >
                    <Text style={styles.resolveBtnText}>✓ Mark as Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎥</Text>
              <Text style={styles.emptyText}>No alerts</Text>
            </View>
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
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    gap: SW(8),
  },
  filterTab: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    paddingVertical: SH(8),
    alignItems: 'center',
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
  },
  filterTab_Active: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealLight,
  },
  filterText: {
    fontSize: SF(13),
    color: Colors.textDark,
    fontWeight: '500',
  },
  filterText_Active: {
    color: Colors.teal,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  alertCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(10),
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    ...Shadow.soft,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertType: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
  },
  alertDetail: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    marginTop: SH(2),
  },
  statusBadge: {
    paddingHorizontal: SW(8),
    paddingVertical: SH(6),
    borderRadius: Radius.md,
  },
  alertTime: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    marginTop: SH(8),
  },
  resolveBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingVertical: SH(8),
    alignItems: 'center',
    marginTop: SH(8),
  },
  resolveBtnText: {
    color: Colors.bgWhite,
    fontWeight: '600',
    fontSize: SF(12),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SH(40),
  },
  emptyIcon: {
    fontSize: SF(48),
  },
  emptyText: {
    fontSize: SF(14),
    color: Colors.textSecondary,
    marginTop: SH(8),
  },
});
