// src/screens/CabLogs/CabLogsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCabLogs, createCabLog } from '../../services/api';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

const fmtTime = (d) => {
  try {
    const date = new Date(d);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function CabLogsScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logDriver, setLogDriver] = useState('');
  const [logPlate, setLogPlate] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const user = await AsyncStorage.getItem('user');
      const userObj = user ? JSON.parse(user) : null;
      const residentId = userObj?.id;
      
      console.log('\n🚕 [CabLogsScreen] Loading cab logs for resident...');
      console.log(`   👤 Resident ID: ${residentId}`);
      console.log(`   👤 Name: ${userObj?.name || 'N/A'}`);
      
      const r = await getCabLogs();
      const logsData = r.data?.data || [];
      setLogs(logsData);
      
      console.log(`   ✅ Loaded ${logsData.length} cab logs (resident-specific via JWT token)`);
      if (logsData.length > 0) {
        const completedCount = logsData.filter(l => l.status === 'completed').length;
        const inProgressCount = logsData.filter(l => l.status !== 'completed').length;
        console.log(`   📊 Completed: ${completedCount}, In Progress: ${inProgressCount}`);
      }
      console.log('✅ [CabLogsScreen] Cab logs fetched successfully\n');
    } catch (err) {
      console.error('❌ [CabLogsScreen] Load error:', err.message);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [navigation]);

  const handleCreateLog = async () => {
    if (!logDriver.trim() || !logPlate.trim()) {
      Alert.alert('Error', 'Please fill in driver name and license plate');
      return;
    }

    setSubmitting(true);
    try {
      await createCabLog({
        driver_name: logDriver,
        vehicle_number: logPlate,
        notes: logNotes,
      });
      Alert.alert('Success', '✅ Cab log recorded!');
      setLogDriver('');
      setLogPlate('');
      setLogNotes('');
      setShowLogModal(false);
      load(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to create cab log');
      console.error('❌ Error:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Cab Service</Text>
        <TouchableOpacity
          style={styles.newLogBtn}
          onPress={() => setShowLogModal(true)}
        >
          <Text style={styles.newLogBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {logs.length === 0 ? (
        <EmptyState emoji="🚕" title="No cab logs" subtitle="Log cab rides and driver details" buttonLabel="Add Log" onButton={() => setShowLogModal(true)} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.teal} onRefresh={() => { setRefreshing(true); load(true); }} />}
        >
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logEmoji}><MaterialCommunityIcons name="taxi" size={22} color="#3498db" /></Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{log.driver_name}</Text>
                  <Text style={styles.logTime}>{fmtTime(log.created_at)}</Text>
                </View>
              </View>

              <View style={styles.logDetails}>
                <View style={styles.detailRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name="note-outline" size={12} color="#666" /><Text style={styles.detailLabel}>License Plate:</Text></View>
                  <Text style={styles.detailValue}>{log.vehicle_number}</Text>
                </View>

                {log.notes && (
                  <View style={styles.detailRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name="pencil-outline" size={12} color="#666" /><Text style={styles.detailLabel}>Notes:</Text></View>
                    <Text style={styles.detailValue}>{log.notes}</Text>
                  </View>
                )}
              </View>

              {log.status && (
                <View style={[styles.statusBadge, { backgroundColor: log.status === 'completed' ? '#D4EDDA' : '#FFF3CD' }]}>
                  <Text style={[styles.statusText, { color: log.status === 'completed' ? '#155724' : '#856404' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name={log.status === 'completed' ? 'check-circle-outline' : 'clock-outline'} size={12} color={log.status === 'completed' ? '#22c55e' : '#f59e0b'} /><Text>{log.status === 'completed' ? 'Completed' : 'In Progress'}</Text></View>
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* New Log Modal */}
      <Modal visible={showLogModal} animationType="slide" transparent onRequestClose={() => setShowLogModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLogModal(false)}>
              <MaterialCommunityIcons name="close" size={18} color="#333" style={styles.modalCloseBtn} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Cab Ride</Text>
            <TouchableOpacity
              onPress={handleCreateLog}
              disabled={submitting}
            >
              <Text style={[styles.modalSaveBtn, submitting && styles.modalSaveBtnDisabled]}>
                {submitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Driver Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter driver name"
              placeholderTextColor={Colors.textLight}
              value={logDriver}
              onChangeText={setLogDriver}
              editable={!submitting}
            />

            <Text style={styles.inputLabel}>License Plate *</Text>
            <TextInput
              style={styles.input}
              placeholder="Vehicle number"
              placeholderTextColor={Colors.textLight}
              value={logPlate}
              onChangeText={setLogPlate}
              editable={!submitting}
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Any additional notes..."
              placeholderTextColor={Colors.textLight}
              value={logNotes}
              onChangeText={setLogNotes}
              multiline
              numberOfLines={4}
              editable={!submitting}
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SW(20),
    paddingTop: SH(16),
    paddingBottom: SH(12),
  },
  title: {
    flex: 1,
    fontSize: SF(22),
    fontWeight: '800',
    color: Colors.textDark,
  },
  newLogBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: SW(12),
    paddingVertical: SH(8),
    borderRadius: SW(8),
  },
  newLogBtnText: {
    fontSize: SF(12),
    color: '#fff',
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(14),
    marginBottom: SH(12),
    ...Shadow.card,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SH(12),
  },
  logEmoji: {
    fontSize: SF(24),
    marginRight: SW(10),
  },
  driverName: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
  },
  logTime: {
    fontSize: SF(11),
    color: Colors.textLight,
    marginTop: SH(2),
  },
  logDetails: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    padding: SW(10),
    marginBottom: SH(10),
  },
  detailRow: {
    marginBottom: SH(8),
  },
  detailLabel: {
    fontSize: SF(11),
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: SH(2),
  },
  detailValue: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.textDark,
  },
  statusBadge: {
    paddingHorizontal: SW(10),
    paddingVertical: SH(6),
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: SF(12),
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseBtn: {
    fontSize: SF(20),
    color: Colors.textDark,
  },
  modalTitle: {
    fontSize: SF(16),
    fontWeight: '700',
    color: Colors.textDark,
  },
  modalSaveBtn: {
    fontSize: SF(13),
    fontWeight: '700',
    color: Colors.primary,
  },
  modalSaveBtnDisabled: {
    color: Colors.textLight,
  },
  modalContent: {
    flex: 1,
    padding: SW(16),
  },
  inputLabel: {
    fontSize: SF(12),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(6),
  },
  input: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    paddingHorizontal: SW(14),
    paddingVertical: SH(12),
    fontSize: SF(14),
    color: Colors.textDark,
    marginBottom: SH(14),
  },
  notesInput: {
    minHeight: SH(100),
    textAlignVertical: 'top',
  },
});
